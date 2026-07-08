import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..uploads import save_upload, ALLOWED_EXTENSIONS

router = APIRouter(prefix="/api/board", tags=["board"])


@router.get("", response_model=list[schemas.PostOut])
def list_posts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Returns posts ordered by oldest first (chronological order) for chat layout."""
    posts = (
        db.query(models.Post)
        .options(
            joinedload(models.Post.comments),
            joinedload(models.Post.seen_by)
        )
        .order_by(models.Post.created_at.asc())
        .all()
    )

    # Automatically mark all loaded posts as seen by current_user
    existing_seen_ids = set(
        row[0] for row in db.query(models.PostSeen.post_id)
        .filter(models.PostSeen.user_id == current_user.id)
        .all()
    )

    new_seens = []
    for post in posts:
        if post.id not in existing_seen_ids:
            new_seens.append(models.PostSeen(post_id=post.id, user_id=current_user.id))
            # Keep in-memory relationship accurate for immediate JSON response
            post.seen_by.append(current_user)

    if new_seens:
        db.add_all(new_seens)
        db.commit()

    return posts


@router.post("", response_model=schemas.PostOut)
def create_post(
    payload: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = models.Post(
        author_id=current_user.id,
        content=payload.content,
        media_url=payload.media_url,
        media_type=payload.media_type,
    )
    db.add(post)

    if payload.media_url and payload.media_type == "image":
        photo = models.Photo(
            uploader_id=current_user.id,
            url=payload.media_url,
            caption=payload.content or "Shared via Chat",
        )
        db.add(photo)

    db.commit()
    db.refresh(post)
    return post


@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File format not supported in chat.")

    url = await save_upload(file)
    
    # Classify file type intelligently
    if ext in {".mp3", ".wav", ".m4a"} or (file.content_type and file.content_type.startswith("audio/")):
        media_type = "audio"
    elif ext in {".mp4", ".mov", ".m4v"} or (file.content_type and file.content_type.startswith("video/")):
        media_type = "video"
    elif ext in {".webm", ".ogg"}:
        # In browser recordings, webm/ogg can be audio or video
        if file.content_type and file.content_type.startswith("audio/"):
            media_type = "audio"
        else:
            media_type = "video"
    else:
        media_type = "image"

    return {"url": url, "media_type": media_type}


@router.post("/{post_id}/comments", response_model=schemas.CommentOut)
def create_comment(
    post_id: int,
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = models.Comment(post_id=post_id, author_id=current_user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not current_user.is_leader:
        raise HTTPException(status_code=403, detail="Only the group leader can delete transmissions.")
    db.delete(post)
    db.commit()
    return {"ok": True}

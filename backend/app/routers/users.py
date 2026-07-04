from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import hash_password
from ..database import get_db
from ..deps import get_current_leader, get_current_user
from ..uploads import save_upload

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Returns everyone, leader first, then friends in sort order.
    Used by the home page to render the 1 + 3 + 3 grid."""
    users = (
        db.query(models.User)
        .order_by(models.User.is_leader.desc(), models.User.sort_order.asc(), models.User.id.asc())
        .all()
    )
    return users


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Friend not found")
    return user


@router.get("/{user_id}/feed")
def get_user_feed(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """All the content this person has personally added: their gallery photos,
    timeline memories, board posts, and polls they created."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Friend not found")

    photos = (
        db.query(models.Photo)
        .filter(models.Photo.uploader_id == user_id)
        .order_by(models.Photo.created_at.desc())
        .all()
    )
    memories = (
        db.query(models.Memory)
        .filter(models.Memory.author_id == user_id)
        .order_by(models.Memory.event_date.desc())
        .all()
    )
    posts = (
        db.query(models.Post)
        .filter(models.Post.author_id == user_id)
        .order_by(models.Post.created_at.desc())
        .all()
    )
    polls = (
        db.query(models.Poll)
        .filter(models.Poll.creator_id == user_id)
        .order_by(models.Poll.created_at.desc())
        .all()
    )
    votes = (
        db.query(models.Vote)
        .filter(models.Vote.user_id == user_id)
        .order_by(models.Vote.created_at.desc())
        .all()
    )

    return {
        "user": schemas.UserOut.model_validate(user),
        "photos": [schemas.PhotoOut.model_validate(p) for p in photos],
        "memories": [schemas.MemoryOut.model_validate(m) for m in memories],
        "posts": [schemas.PostOut.model_validate(p) for p in posts],
        "polls": [
            {
                "id": p.id,
                "question": p.question,
                "is_closed": p.is_closed,
                "created_at": p.created_at,
                "option_count": len(p.options),
            }
            for p in polls
        ],
        "votes": [
            {
                "id": v.id,
                "poll_id": v.poll_id,
                "poll_question": v.option.poll.question,
                "option_text": v.option.text,
                "created_at": v.created_at,
            }
            for v in votes
        ],
    }


@router.post("", response_model=schemas.UserOut)
def create_friend(
    username: str = Form(...),
    password: str = Form(...),
    nickname: str = Form(...),
    full_name: str = Form(""),
    about_me: str = Form(""),
    db: Session = Depends(get_db),
    leader: models.User = Depends(get_current_leader),
):
    """Only the group leader can create new friend logins."""
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    max_order = db.query(models.User).count()
    new_user = models.User(
        username=username,
        hashed_password=hash_password(password),
        nickname=nickname,
        full_name=full_name,
        about_me=about_me,
        is_leader=False,
        sort_order=max_order,
        password_changed=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/me", response_model=schemas.UserOut)
def update_my_profile(
    payload: schemas.UserUpdateSelf,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Every friend can edit their own nickname / about-me."""
    if payload.nickname is not None:
        current_user.nickname = payload.nickname
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.about_me is not None:
        current_user.about_me = payload.about_me
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/relationships", response_model=schemas.UserOut)
def update_my_relationships(
    payload: schemas.RelationshipUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allows any logged-in user to map their father, mother, and spouse references."""
    if payload.father_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot be your own father")
    if payload.mother_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot be your own mother")
    if payload.spouse_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot be your own spouse")

    current_user.father_id = payload.father_id
    current_user.mother_id = payload.mother_id
    current_user.spouse_id = payload.spouse_id
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/custom-family", response_model=schemas.UserOut)
def update_my_custom_family(
    payload: schemas.CustomFamilyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allows any logged-in user to map custom static names for their family members."""
    if payload.father_name is not None:
        current_user.father_name = payload.father_name
    if payload.mother_name is not None:
        current_user.mother_name = payload.mother_name
    if payload.spouse_name is not None:
        current_user.spouse_name = payload.spouse_name
    if payload.father_father_name is not None:
        current_user.father_father_name = payload.father_father_name
    if payload.father_mother_name is not None:
        current_user.father_mother_name = payload.father_mother_name
    if payload.mother_father_name is not None:
        current_user.mother_father_name = payload.mother_father_name
    if payload.mother_mother_name is not None:
        current_user.mother_mother_name = payload.mother_mother_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/custom-family/photo", response_model=schemas.UserOut)
async def upload_custom_family_photo(
    slot: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allows uploading a photo for a custom family member slot."""
    valid_slots = {
        "father", "mother", "spouse",
        "father_father", "father_mother",
        "mother_father", "mother_mother"
    }
    if slot not in valid_slots:
        raise HTTPException(status_code=400, detail="Invalid family slot")

    url = await save_upload(file)
    setattr(current_user, f"{slot}_photo", url)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/photo", response_model=schemas.UserOut)
async def upload_my_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    url = await save_upload(file)
    current_user.photo_url = url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/{user_id}/photo", response_model=schemas.UserOut)
async def upload_user_photo(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allows uploading a photo for a specific agent (self, relative, or if leader)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_relative = (
        current_user.father_id == user_id or
        current_user.mother_id == user_id or
        current_user.spouse_id == user_id or
        current_user.id == user.father_id or
        current_user.id == user.mother_id or
        current_user.id == user.spouse_id
    )

    if not current_user.is_leader and current_user.id != user_id and not is_relative:
        raise HTTPException(status_code=403, detail="You do not have permission to upload photo for this agent")

    url = await save_upload(file)
    user.photo_url = url
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_friend(
    user_id: int,
    db: Session = Depends(get_db),
    leader: models.User = Depends(get_current_leader),
):
    """Only the group leader can delete users. They cannot delete themselves or other leaders."""
    if user_id == leader.id:
        raise HTTPException(status_code=400, detail="The leader cannot delete themselves")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_leader:
        raise HTTPException(status_code=400, detail="Cannot delete a leader account")

    db.delete(user)
    db.commit()


@router.post("/change-password")
def change_my_password(
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allows a user to change their own password, flagging password_changed=True."""
    current_user.hashed_password = hash_password(new_password)
    current_user.password_changed = True
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    leader: models.User = Depends(get_current_leader),
):
    """Allows the superadmin to reset any user's password, forcing password_changed=False."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    user.password_changed = False
    db.commit()
    return {"ok": True}


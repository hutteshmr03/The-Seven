import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..uploads import save_upload

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("", response_model=list[schemas.MemoryOut])
def list_memories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Memory).order_by(models.Memory.event_date.desc()).all()


@router.post("", response_model=schemas.MemoryOut)
async def create_memory(
    title: str = Form(...),
    description: str = Form(""),
    location: str | None = Form(None),
    event_date: datetime.datetime = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    photo_url = await save_upload(file) if file else None
    memory = models.Memory(
        author_id=current_user.id,
        title=title,
        description=description,
        location=location,
        event_date=event_date,
        photo_url=photo_url,
    )
    db.add(memory)

    # Automatically copy uploaded timeline photo to the Gallery under 'Hangout' category
    if photo_url:
        photo = models.Photo(
            uploader_id=current_user.id,
            url=photo_url,
            caption=title or "Shared via Timeline",
            category="Hangout",
        )
        db.add(photo)

    db.commit()
    db.refresh(memory)
    return memory


@router.delete("/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    memory = db.query(models.Memory).filter(models.Memory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    if memory.author_id != current_user.id and not current_user.is_leader:
        raise HTTPException(status_code=403, detail="You can only delete your own memories")
    db.delete(memory)
    db.commit()
    return {"ok": True}

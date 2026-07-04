from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..uploads import save_upload

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("", response_model=list[schemas.PhotoOut])
def list_photos(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Photo).order_by(models.Photo.created_at.desc()).all()


@router.post("", response_model=schemas.PhotoOut)
async def upload_photo(
    caption: str = Form(""),
    category: str = Form("Hangout"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    url = await save_upload(file)
    photo = models.Photo(uploader_id=current_user.id, url=url, caption=caption, category=category)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.uploader_id != current_user.id and not current_user.is_leader:
        raise HTTPException(status_code=403, detail="You can only delete your own photos")
    db.delete(photo)
    db.commit()
    return {"ok": True}


@router.delete("/categories/{category_name}")
def delete_category(
    category_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Updates all photos using this category back to 'Hangout' to delete the category."""
    if not current_user.is_leader:
        raise HTTPException(status_code=403, detail="Only the group leader can delete categories.")
    
    db.query(models.Photo).filter(models.Photo.category == category_name).update(
        {models.Photo.category: "Hangout"}, synchronize_session=False
    )
    db.commit()
    return {"ok": True}

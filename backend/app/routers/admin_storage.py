import os
import re
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..deps import get_current_user
from ..config import settings

router = APIRouter(prefix="/api/admin/storage", tags=["admin-storage"])

def get_dir_size(path: str) -> int:
    total = 0
    if os.path.exists(path):
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
    return total

@router.get("")
def get_storage_status(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not current_user.is_leader:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    used_bytes = get_dir_size(settings.upload_dir)
    max_bytes = settings.max_storage_bytes
    percent_used = round((used_bytes / max_bytes) * 100, 2) if max_bytes > 0 else 0
    
    # We warn the user if usage is above 85%
    warn_threshold = 85.0
    is_critical = percent_used >= warn_threshold
    
    return {
        "used_bytes": used_bytes,
        "max_bytes": max_bytes,
        "percent_used": percent_used,
        "is_critical": is_critical,
    }

@router.post("/purge")
def purge_oldest_media(
    purge_percent: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_leader:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    if purge_percent <= 0 or purge_percent > 100:
        raise HTTPException(status_code=400, detail="Purge percentage must be between 1 and 100")

    used_bytes = get_dir_size(settings.upload_dir)
    target_freed_bytes = int(used_bytes * (purge_percent / 100.0))
    
    files = []
    if os.path.exists(settings.upload_dir):
        for entry in os.scandir(settings.upload_dir):
            if entry.is_file():
                files.append({
                    "name": entry.name,
                    "path": entry.path,
                    "size": entry.stat().st_size,
                    "mtime": entry.stat().st_mtime
                })
    
    files.sort(key=lambda x: x["mtime"])
    
    freed_bytes = 0
    deleted_count = 0
    
    for file_info in files:
        if freed_bytes >= target_freed_bytes:
            break
            
        file_name = file_info["name"]
        file_path = file_info["path"]
        file_size = file_info["size"]
        
        url_match = f"/uploads/{file_name}"
        
        # 1. Check Photos table
        photo = db.query(models.Photo).filter(models.Photo.url == url_match).first()
        if photo:
            db.delete(photo)
            
        # 2. Check Posts table (Vip Chat media)
        post = db.query(models.Post).filter(models.Post.media_url == url_match).first()
        if post:
            if post.content:
                post.media_url = None
                post.media_type = None
            else:
                db.delete(post)
                
        # 3. Check Memories table
        memory = db.query(models.Memory).filter(models.Memory.photo_url == url_match).first()
        if memory:
            memory.photo_url = None
            
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                freed_bytes += file_size
                deleted_count += 1
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            
    db.commit()
    
    return {
        "freed_bytes": freed_bytes,
        "deleted_count": deleted_count,
        "remaining_used_bytes": get_dir_size(settings.upload_dir)
    }

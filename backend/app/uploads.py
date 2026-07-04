import os
import uuid

from fastapi import UploadFile

from .config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov", ".ogg", ".m4v", ".mp3", ".wav", ".m4a"}


async def save_upload(file: UploadFile) -> str:
    """Saves an uploaded image to disk and returns its public URL path."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"

    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    return f"/uploads/{filename}"

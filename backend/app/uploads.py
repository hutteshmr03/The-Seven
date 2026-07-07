import os
import uuid

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from .config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov", ".ogg", ".m4v", ".mp3", ".wav", ".m4a"}


async def save_upload(file: UploadFile) -> str:
    """Saves an uploaded file. If CLOUDINARY_URL environment variable or settings.cloudinary_url is configured,
    uploads directly to Cloudinary. Otherwise, saves to local disk as fallback."""
    cloudinary_url = os.environ.get("CLOUDINARY_URL") or settings.cloudinary_url
    if cloudinary_url:
        # Clean any accidental "export CLOUDINARY_URL=" prefix or surrounding quotes
        cloudinary_url = cloudinary_url.strip()
        if cloudinary_url.startswith("export CLOUDINARY_URL="):
            cloudinary_url = cloudinary_url.replace("export CLOUDINARY_URL=", "").strip()
        cloudinary_url = cloudinary_url.strip("\"'")
        
        try:
            cloudinary.config(cloudinary_url=cloudinary_url)
            contents = await file.read()
            await file.seek(0)
            
            upload_result = cloudinary.uploader.upload(
                contents,
                resource_type="auto",
                folder="friendzone"
            )
            return upload_result.get("secure_url")
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=500,
                detail=f"Cloudinary upload failed: {str(e)}"
            )

    # Local fallback
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

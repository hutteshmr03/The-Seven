import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models
from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth, board, gallery, polls, timeline, users, admin_storage, relationship_requests

app = FastAPI(title="FriendZone API")

origins = [
    settings.frontend_origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

clean_origins = []
for o in origins:
    if o:
        clean = o.rstrip("/")
        if clean not in clean_origins:
            clean_origins.append(clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import mimetypes
import re
from fastapi import Request, HTTPException
from fastapi.responses import StreamingResponse

os.makedirs(settings.upload_dir, exist_ok=True)

@app.post("/api/admin/reset-leader")
def reset_leader(secret: str):
    """One-time recovery tool: wipes all users and recreates the leader
    account fresh from current env vars. Protected by SECRET_KEY so randoms
    can't call it."""
    if secret != settings.secret_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Invalid secret")

    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for u in users:
            db.delete(u)
        db.commit()
    finally:
        db.close()

    _seed_leader()
    return {"status": "done", "leader_username": settings.leader_username}

def send_bytes_range_requests(request: Request, file_path: str, content_type: str):
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": content_type,
        "Cache-Control": "no-cache",
    }

    if not range_header:
        headers["Content-Length"] = str(file_size)
        def file_iterator():
            with open(file_path, "rb") as f:
                yield from f
        return StreamingResponse(file_iterator(), headers=headers, media_type=content_type)

    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(status_code=400, detail="Invalid Range Header")

    start = int(range_match.group(1))
    end = range_match.group(2)
    end = int(end) if end else file_size - 1

    if start >= file_size or end >= file_size:
        raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

    chunk_size = end - start + 1
    headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    headers["Content-Length"] = str(chunk_size)

    def file_iterator():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                chunk = f.read(min(remaining, 1024 * 64))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(file_iterator(), status_code=206, headers=headers, media_type=content_type)

@app.get("/uploads/{filename}")
async def serve_upload(filename: str, request: Request):
    file_path = os.path.join(settings.upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"
        
    return send_bytes_range_requests(request, file_path, content_type)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(gallery.router)
app.include_router(timeline.router)
app.include_router(board.router)
app.include_router(polls.router)
app.include_router(admin_storage.router)
app.include_router(relationship_requests.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    _seed_leader()


def _seed_leader():
    """Creates the initial group-leader account, or updates it if settings changed."""
    db = SessionLocal()
    try:
        leader = db.query(models.User).filter(models.User.is_leader == True).first()
        if not leader:
            leader = models.User(
                username=settings.leader_username,
                hashed_password=hash_password(settings.leader_password),
                nickname=settings.leader_nickname,
                full_name=settings.leader_full_name,
                about_me="Runs this whole operation.",
                is_leader=True,
                sort_order=0,
            )
            db.add(leader)
            db.commit()
            print(f"Created group leader account: {settings.leader_username}")
        else:
            # If environmental config updated the username or password, synchronize it
            if leader.username != settings.leader_username or settings.leader_password != "changeme123":
                leader.username = settings.leader_username
                leader.hashed_password = hash_password(settings.leader_password)
                leader.nickname = settings.leader_nickname
                leader.full_name = settings.leader_full_name
                db.commit()
                print(f"Updated group leader account to: {settings.leader_username}")
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}

# FriendZone

A private hub for your friend group: profile cards, a shared photo gallery, a
trip/hangout timeline, a message board, and polls for planning. Only the
**group leader** can create logins for friends; everyone logs in with a
username + password.

Stack: **React (Vite)** frontend, **FastAPI** backend, **PostgreSQL** database.

```
friendzone/
├── backend/     FastAPI + SQLAlchemy + PostgreSQL
└── frontend/    React + Vite
```

## Features

- **Friend Profiles** — photo, nickname, and a quirky "about me" that each
  friend edits themselves.
- **Shared Gallery** — upload group photos, memes, inside jokes.
- **Timeline / Memories** — a chronological feed of hangouts, trips, milestones.
- **Message Board** — text posts + comments/replies.
- **Polls & Decisions** — quick multi-option polls with live results.
- **Leader-only friend creation** — only the group leader account can create
  new friend logins (username/password). Every friend can then log in and
  add their own content.
- **Home page grid** — the group leader's card on top, then friends arranged
  3-per-row underneath (a "1 + 3 + 3…" layout). Clicking any card opens that
  person's own profile page, showing only what *they* have personally added
  (their gallery photos, memories, posts, and polls).

## 1. PostgreSQL setup

Create a database and user (adjust names/passwords as you like):

```sql
CREATE DATABASE friendzone;
CREATE USER friendzone_user WITH PASSWORD 'friendzone_pass';
GRANT ALL PRIVILEGES ON DATABASE friendzone TO friendzone_user;
```

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set DATABASE_URL to match the DB you created above,
# set SECRET_KEY to a long random string, and set the leader credentials.

uvicorn app.main:app --reload --port 8000
```

On first startup the backend automatically:
- creates all tables in PostgreSQL, and
- creates the **group leader** account from `LEADER_USERNAME` /
  `LEADER_PASSWORD` in `.env` (only if the users table is empty).

API docs: http://localhost:8000/docs

## 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` and `/uploads`
requests to the backend on port 8000 (see `vite.config.js`), so no CORS
setup is needed in development beyond `FRONTEND_ORIGIN` in the backend `.env`.

## 4. Using it

1. Log in as the group leader (the credentials from `.env`).
2. Go to **"+ Add Friend"** in the nav bar and create a login for each friend
   (username, password, nickname, optional full name / about-me).
3. Share each friend's username/password with them.
4. Each friend logs in, opens their own profile card, and can:
   - upload a profile photo and edit their nickname / about-me,
   - post to the shared gallery,
   - add memories to the timeline,
   - post/comment on the message board,
   - create and vote on polls.
5. The **home page** shows the leader's card up top, then everyone else in
   rows of three. Tapping a card opens that person's page, which only shows
   what they personally added.

## Notes on production

- Uploaded images are stored on the backend's local disk under
  `backend/uploads/` and served at `/uploads/...`. For production, point
  this at a persistent volume or swap `save_upload()` in
  `backend/app/uploads.py` for S3 / another object store.
- `SECRET_KEY` in `.env` must be changed to a long random value before any
  real deployment — it signs the login tokens.
- CORS is restricted to `FRONTEND_ORIGIN`; update it to your deployed
  frontend URL.

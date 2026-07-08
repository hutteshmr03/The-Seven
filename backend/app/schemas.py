import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LoginRequest(BaseModel):
    username: str
    password: str


# ---------- User ----------

class UserBase(BaseModel):
    nickname: str
    full_name: Optional[str] = None
    about_me: Optional[str] = ""


class UserCreate(UserBase):
    username: str
    password: str


class UserUpdateSelf(BaseModel):
    """Fields a user may edit on their own profile."""
    nickname: Optional[str] = None
    full_name: Optional[str] = None
    about_me: Optional[str] = None


class RelationshipUpdate(BaseModel):
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    spouse_id: Optional[int] = None


class CustomFamilyUpdate(BaseModel):
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    spouse_name: Optional[str] = None
    father_father_name: Optional[str] = None
    father_mother_name: Optional[str] = None
    mother_father_name: Optional[str] = None
    mother_mother_name: Optional[str] = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    photo_url: Optional[str] = None
    is_leader: bool
    sort_order: int
    password_changed: bool
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    spouse_id: Optional[int] = None

    father_name: Optional[str] = None
    father_photo: Optional[str] = None
    mother_name: Optional[str] = None
    mother_photo: Optional[str] = None
    spouse_name: Optional[str] = None
    spouse_photo: Optional[str] = None
    father_father_name: Optional[str] = None
    father_father_photo: Optional[str] = None
    father_mother_name: Optional[str] = None
    father_mother_photo: Optional[str] = None
    mother_father_name: Optional[str] = None
    mother_father_photo: Optional[str] = None
    mother_mother_name: Optional[str] = None
    mother_mother_photo: Optional[str] = None
    created_at: datetime.datetime


# ---------- Gallery ----------

class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    caption: Optional[str] = None
    category: str
    created_at: datetime.datetime
    uploader: UserOut


# ---------- Timeline ----------

class MemoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: datetime.datetime


class MemoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    event_date: datetime.datetime
    created_at: datetime.datetime
    author: UserOut


# ---------- Board ----------

class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime.datetime
    author: UserOut


class PostCreate(BaseModel):
    content: Optional[str] = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: Optional[str] = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    created_at: datetime.datetime
    author: UserOut
    comments: list[CommentOut] = []
    seen_by: list[UserOut] = []


# ---------- Polls ----------

class PollOptionCreate(BaseModel):
    text: str


class PollCreate(BaseModel):
    question: str
    options: list[str]


class PollOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    vote_count: int = 0


class PollOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    is_closed: bool
    created_at: datetime.datetime
    creator: UserOut
    options: list[PollOptionOut]
    my_vote_option_id: Optional[int] = None
    total_votes: int = 0


class RelationshipRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    relation_type: str
    status: str
    created_at: datetime.datetime
    sender: UserOut


class VoteCreate(BaseModel):
    option_id: int

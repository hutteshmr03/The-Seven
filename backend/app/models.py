import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    nickname = Column(String(50), nullable=False)
    full_name = Column(String(100), nullable=True)
    about_me = Column(Text, nullable=True, default="")
    photo_url = Column(String(500), nullable=True)

    is_leader = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    password_changed = Column(Boolean, default=True, nullable=False)
    father_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    mother_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    spouse_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    father_name = Column(String, nullable=True)
    father_photo = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    mother_photo = Column(String, nullable=True)
    spouse_name = Column(String, nullable=True)
    spouse_photo = Column(String, nullable=True)
    father_father_name = Column(String, nullable=True)
    father_father_photo = Column(String, nullable=True)
    father_mother_name = Column(String, nullable=True)
    father_mother_photo = Column(String, nullable=True)
    mother_father_name = Column(String, nullable=True)
    mother_father_photo = Column(String, nullable=True)
    mother_mother_name = Column(String, nullable=True)
    mother_mother_photo = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    photos = relationship("Photo", back_populates="uploader", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="author", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    polls_created = relationship("Poll", back_populates="creator", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")


class Photo(Base):
    """Shared gallery item: group photos, memes, inside jokes."""

    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(500), nullable=False)
    caption = Column(String(300), nullable=True)
    category = Column(String(100), default="Hangout", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    uploader = relationship("User", back_populates="photos")


class Memory(Base):
    """Timeline entry: hangouts, trips, milestones."""

    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    photo_url = Column(String(500), nullable=True)
    event_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    author = relationship("User", back_populates="memories")


class Post(Base):
    """Message board post."""

    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    seens = relationship("PostSeen", back_populates="post", cascade="all, delete-orphan")
    seen_by = relationship("User", secondary="post_seen", viewonly=True)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_closed = Column(Boolean, default=False, nullable=False)

    creator = relationship("User", back_populates="polls_created")
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    __tablename__ = "poll_options"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    text = Column(String(200), nullable=False)

    poll = relationship("Poll", back_populates="options")
    votes = relationship("Vote", back_populates="option", cascade="all, delete-orphan")


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("poll_id", "user_id", name="uq_vote_per_user_per_poll"),)

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("poll_options.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    option = relationship("PollOption", back_populates="votes")
    user = relationship("User", back_populates="votes")


class RelationshipRequest(Base):
    __tablename__ = "relationship_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(50), nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


class PostSeen(Base):
    __tablename__ = "post_seen"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_seen_per_user_per_post"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seen_at = Column(DateTime, default=datetime.datetime.utcnow)

    post = relationship("Post", back_populates="seens")
    user = relationship("User")

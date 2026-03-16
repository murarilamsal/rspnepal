from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OpinionBase(SQLModel):
    name: str = Field(index=True, min_length=2, max_length=120)
    email: str = Field(index=True, min_length=5, max_length=255)
    phone: str = Field(min_length=7, max_length=32)
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=5000)


class Opinion(OpinionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_name: Optional[str] = Field(default=None, max_length=255)
    file_path: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)

    reactions: list["Reaction"] = Relationship(back_populates="opinion")


class Reaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    opinion_id: int = Field(foreign_key="opinion.id", index=True)
    reaction_type: str = Field(min_length=2, max_length=32, index=True)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)

    opinion: Optional[Opinion] = Relationship(back_populates="reactions")


class UserEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, min_length=6, max_length=32, unique=True)
    name: str = Field(index=True, min_length=2, max_length=120)
    email: str = Field(index=True, min_length=5, max_length=255)
    phone: str = Field(min_length=7, max_length=32)
    password_hash: str = Field(default="", min_length=0, max_length=255)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)


class UserTopic(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_entry_id: int = Field(foreign_key="userentry.id", index=True)
    topics_text: str = Field(min_length=3, max_length=12000)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)


class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_topic_id: int = Field(foreign_key="usertopic.id", index=True)
    topic_label: str = Field(min_length=3, max_length=255)
    feedback_text: str = Field(min_length=3, max_length=5000)
    user_entry_id: Optional[int] = Field(default=None, foreign_key="userentry.id", index=True)
    user_name: Optional[str] = Field(default=None, max_length=120)
    user_email: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)


class AuthSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_entry_id: int = Field(foreign_key="userentry.id", index=True)
    token_hash: str = Field(index=True, min_length=32, max_length=255, unique=True)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)
    expires_at: datetime = Field(nullable=False)
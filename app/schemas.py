from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReactionCreate(BaseModel):
    reaction_type: str


class HighlightItem(BaseModel):
    title: str
    detail: str


class UserEntryCreate(BaseModel):
    name: str
    email: str
    phone: str
    password: str


class UserEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    email: str
    phone: str
    created_at: datetime


class UserTopicCreate(BaseModel):
    topics_text: str


class UserTopicUpdate(BaseModel):
    topics_text: str


class AuthLoginRequest(BaseModel):
    user_lookup: str
    password: str


class AuthActivateRequest(BaseModel):
    user_lookup: str
    phone: str
    password: str


class AuthSessionResponse(BaseModel):
    token: str
    user: UserEntryResponse


class UserTopicResponse(BaseModel):
    id: int
    user_entry_id: int
    user_id: str
    user_name: str
    user_email: str
    points: list[str]
    created_at: datetime


class FeedbackCreate(BaseModel):
    user_topic_id: int
    feedback_text: str
    use_logged_in_identity: bool = False


class FeedbackResponse(BaseModel):
    id: int
    user_topic_id: int
    topic_label: str
    feedback_text: str
    user_name: Optional[str]
    user_email: Optional[str]
    created_at: datetime


class OpinionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str
    title: str
    message: str
    file_name: Optional[str]
    file_path: Optional[str]
    created_at: datetime
    reactions: dict[str, int]
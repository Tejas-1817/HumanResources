from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InterviewerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    phone: str | None = Field(default=None, max_length=50)


class InterviewerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    phone: str | None = Field(default=None, max_length=50)


class InterviewerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

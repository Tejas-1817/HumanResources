from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class CompanyResponse(BaseModel):
    id: int
    name: str
    location: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyDetailResponse(CompanyResponse):
    job_roles_count: int = 0

    model_config = ConfigDict(from_attributes=True)

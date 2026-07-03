from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CandidateCreate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    raw_text: str | None = None
    skills: str | None = None
    experience_years: float = 0.0
    original_filename: str = Field(min_length=1, max_length=500)


class CandidateUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    skills: str | None = None
    experience_years: float | None = None


class CandidateResponse(BaseModel):
    id: int
    name: str | None
    email: str | None
    phone: str | None
    skills: str | None
    experience_years: float
    original_filename: str
    created_at: datetime
    source_label: str | None = None
    is_replacement: bool = False
    uploaded_by_vendor_id: int | None = None
    source_vendor: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CandidateDetailResponse(CandidateResponse):
    raw_text: str | None

    model_config = ConfigDict(from_attributes=True)


class SkillFrequency(BaseModel):
    name: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class CandidateStatsResponse(BaseModel):
    total_candidates: int
    average_experience: float
    top_skills: list[SkillFrequency]

    model_config = ConfigDict(from_attributes=True)

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PipelineStage(BaseModel):
    id: str
    title: str
    color: str | None = None
    bgGlow: str | None = None

    model_config = ConfigDict(extra="ignore")


class JobRoleCreate(BaseModel):
    company_id: int
    title: str = Field(min_length=2, max_length=255)
    description: str = ""
    deadline: date | None = None
    status: str = "open"
    pipeline_stages: list[PipelineStage] | None = None
    estimated_budget: float | None = None
    currency: str = "INR"
    positions_required: int = 1
    department: str | None = None
    location: str | None = None
    work_mode: str | None = None  # remote, hybrid, onsite
    experience_required: float | None = None
    project_time_period: str | None = None
    vendor_ids: list[int] | None = None


class JobRoleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    deadline: date | None = None
    status: str | None = None
    pipeline_stages: list[PipelineStage] | None = None
    estimated_budget: float | None = None
    currency: str | None = None
    positions_required: int | None = None
    department: str | None = None
    location: str | None = None
    work_mode: str | None = None
    experience_required: float | None = None
    project_time_period: str | None = None
    vendor_ids: list[int] | None = None


class JobRoleResponse(BaseModel):
    id: int
    company_id: int
    title: str
    description: str
    status: str
    deadline: date | None
    pipeline_stages: list[PipelineStage] | None = None
    estimated_budget: float | None = None
    currency: str = "INR"
    positions_required: int = 1
    department: str | None = None
    location: str | None = None
    work_mode: str | None = None
    experience_required: float | None = None
    project_time_period: str | None = None
    created_by: int | None
    company_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobRoleDetailResponse(JobRoleResponse):
    company_name: str

    model_config = ConfigDict(from_attributes=True)

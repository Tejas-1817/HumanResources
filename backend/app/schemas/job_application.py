from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ApplicationCreate(BaseModel):
    candidate_id: int
    job_role_id: int
    source: str = "direct"
    consultancy_name: str | None = Field(default=None, max_length=255)
    remarks: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: str
    note: str | None = None
    status_date: datetime | None = None
    interview_date: datetime | str | None = None
    offer_date: datetime | None = None
    remarks: str | None = None
    is_replacement: bool | None = None


class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    experience_years: float = 0.0
    skills: str | None = None
    job_role_id: int
    submitted_by: int | None
    source: str
    consultancy_name: str | None
    resume_sent: bool
    resume_sent_at: datetime | None
    status: str
    status_date: datetime | None = None
    interview_date: datetime | None = None
    offer_date: datetime | None = None
    remarks: str | None = None
    is_replacement: bool
    source_label: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationTimelineItem(BaseModel):
    id: int
    application_id: int
    changed_by: int | None
    old_status: str | None
    new_status: str
    note: str | None
    scheduled_date: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_selected_this_month: int
    total_replacements: int
    top_skills: list[str]
    recent_uploads: list[dict]
    pipeline_summary: dict


class PipelineSummaryItem(BaseModel):
    total_replacements: int

class BulkDeleteRequest(BaseModel):
    application_ids: list[int]

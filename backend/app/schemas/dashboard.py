from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RecentUploadItem(BaseModel):
    candidate_id: int
    name: str | None
    email: str | None
    skills: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineSummaryItem(BaseModel):
    pending: int
    shortlisted: int
    interview_scheduled: int
    interviewed: int
    selected: int
    rejected: int
    on_hold: int
    dropped: int
    not_joined: int

    model_config = ConfigDict(from_attributes=True)


class SkillFrequency(BaseModel):
    name: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class ActivityFeedItem(BaseModel):
    id: int
    text: str
    time: str
    iconBg: str
    created_at: datetime


class DashboardStatsResponse(BaseModel):
    total_candidates: int
    total_companies: int
    total_open_roles: int
    avg_experience: float
    total_selected_this_month: int
    total_replacements: int
    top_skills: list[SkillFrequency]
    recent_uploads: list[RecentUploadItem]
    activity_feed: list[ActivityFeedItem] | None = None
    pipeline_summary: PipelineSummaryItem

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from pydantic import BaseModel, ConfigDict

class InterviewScheduleCreate(BaseModel):
    job_role_id: int
    candidate_id: int | None = None
    interviewer_id: int
    date: str
    time: str
    venue: str

class InterviewScheduleResponse(BaseModel):
    id: int
    job_role_id: int
    candidate_id: int | None = None
    interviewer_id: int
    date: str
    time: str
    venue: str
    created_at: datetime
    
    candidate_name: str | None = None
    job_role_title: str | None = None
    interviewer_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignCandidatesPayload(BaseModel):
    candidate_ids: list[int]


class InterviewScheduleUpdate(BaseModel):
    interviewer_id: int | None = None
    date: str | None = None
    time: str | None = None
    venue: str | None = None



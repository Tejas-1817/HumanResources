from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.job_application import ApplicationResponse, ApplicationStatusUpdate
from app.services.application_service import ApplicationService

router = APIRouter(tags=["Job Applications"])


class PipelineUpdateRequest(BaseModel):
    status: str
    note: str | None = None
    status_date: datetime | None = None
    interview_date: datetime | str | None = None
    offer_date: datetime | None = None
    remarks: str | None = None
    is_replacement: bool | None = None


@router.get(
    "/pipeline",
    response_model=dict[str, list[ApplicationResponse]],
    status_code=status.HTTP_200_OK,
)
def get_pipeline(
    job_role_id: int | None = Query(default=None),
    company_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> dict[str, list[ApplicationResponse]]:
    print(f"[PIPELINE_GET] Fetching pipeline with job_role_id={job_role_id}, company_id={company_id}")
    
    interviewer_id = None
    candidate_role_map = {}
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        interviewer_id = current_user.id
        print(f"[PIPELINE_GET] Current user is interviewer (ID: {interviewer_id}). Filtering candidates.")
        from app.models.interview_schedule import InterviewSchedule
        schedules = db.query(InterviewSchedule).filter(
            InterviewSchedule.interviewer_id == interviewer_id
        ).all()
        for s in schedules:
            if s.candidate_id:
                candidate_role_map[s.candidate_id] = s.job_role_id

    rows = ApplicationService.get_all(
        db, job_role_id=job_role_id, company_id=company_id, interviewer_id=interviewer_id
    )
    print(f"[PIPELINE_GET] Total applications retrieved: {len(rows)}")
    
    grouped: dict[str, list[ApplicationResponse]] = defaultdict(list)
    status_counts: dict[str, int] = defaultdict(int)
    
    for row in rows:
        status = row.status.strip().lower()  # Normalize status to lowercase
        resp = ApplicationResponse.model_validate(row)
        if row.candidate_id in candidate_role_map:
            resp.job_role_id = candidate_role_map[row.candidate_id]
        grouped[status].append(resp)
        status_counts[status] += 1
    
    # Log status distribution
    for status, count in sorted(status_counts.items()):
        print(f"[PIPELINE_GET] Status '{status}': {count} applications")
    
    return dict(grouped)


@router.put(
    "/pipeline/{application_id}/mark-sent",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
def mark_pipeline_resume_sent(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> ApplicationResponse:
    # Security check: Ensure application belongs to the current user's company
    ApplicationService.get_by_id_for_company(db, application_id, current_user.company_id)
    
    application = ApplicationService.mark_resume_sent(db, application_id)
    return ApplicationResponse.model_validate(application)


@router.put(
    "/pipeline/{application_id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr", "interviewer"))],
)
def update_pipeline_status(
    application_id: int,
    payload: PipelineUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_role("admin", "hr", "interviewer")),
) -> ApplicationResponse:
    # Security check: Ensure application belongs to the current user's company (for admin/hr) or resolve directly (for interviewers)
    try:
        from app.models.interviewer import Interviewer
        if isinstance(current_user, Interviewer):
            from app.core.exceptions import ForbiddenException
            from app.models.interview_schedule import InterviewSchedule
            application = ApplicationService.get_by_id(db, application_id)
            assigned = db.query(InterviewSchedule).filter(
                InterviewSchedule.interviewer_id == current_user.id,
                InterviewSchedule.candidate_id == application.candidate_id
            ).first()
            if not assigned:
                raise ForbiddenException(message="Access denied: You are not assigned to this candidate")
            changed_by = None
            print(f"[PIPELINE_UPDATE_ENDPOINT] Received request from Interviewer for application_id={application_id}")
        else:
            application = ApplicationService.get_by_id_for_company(db, application_id, current_user.company_id)
            changed_by = current_user.id
            print(f"[PIPELINE_UPDATE_ENDPOINT] Received request for application_id={application_id} | changed_by={current_user.id}")
        
        print(f"[PIPELINE_UPDATE_ENDPOINT] Security check passed | Application exists")
        
        application = ApplicationService.update_status(
            db,
            application_id,
            ApplicationStatusUpdate(
                status=payload.status, 
                note=payload.note,
                status_date=payload.status_date,
                interview_date=payload.interview_date,
                offer_date=payload.offer_date,
                remarks=payload.remarks,
                is_replacement=payload.is_replacement
            ),
            changed_by=changed_by,
        )
        
        # Notify Admin if stage update is done by Interviewer
        from app.models.interviewer import Interviewer
        if isinstance(current_user, Interviewer):
            from app.models.notification import Notification
            c_name = application.candidate.name if application.candidate else "Candidate"
            r_title = application.job_role.title if application.job_role else "Job"
            admin_notification = Notification(
                recipient_role="admin",
                title="Candidate Stage Updated by Interviewer",
                message=f"Interviewer '{current_user.name}' updated status of candidate '{c_name}' to '{payload.status}' for Job '{r_title}'."
            )
            db.add(admin_notification)
            db.commit()
        
        print(f"[PIPELINE_UPDATE_ENDPOINT] SUCCESS: Returning updated application with status={application.status}")
        return ApplicationResponse.model_validate(application)
    except Exception as e:
        print(f"[PIPELINE_UPDATE_ENDPOINT] ERROR: {str(e)} | Type: {type(e).__name__}")
        raise

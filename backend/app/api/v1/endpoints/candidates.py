from typing import Any
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ForbiddenException
from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.schemas.candidate import (
    CandidateDetailResponse,
    CandidateManualCreate,
    CandidateResponse,
    CandidateStatsResponse,
    CandidateUpdate,
)
from app.schemas.job_application import ApplicationResponse
from app.services.candidate_service import CandidateService
from app.storage.local_storage import storage_service

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post(
    "",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def create_candidate(
    payload: CandidateManualCreate,
    db: Session = Depends(get_db),
) -> CandidateResponse:
    from app.models.candidate import Candidate as CandidateModel
    from app.core.exceptions import DuplicateException

    # Guard against duplicate email
    existing = db.query(CandidateModel).filter(
        CandidateModel.email == payload.email.strip().lower()
    ).first()
    if existing:
        raise DuplicateException(message=f"A candidate with email '{payload.email}' already exists.")

    new_candidate = CandidateModel(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip() if payload.phone else None,
        skills=payload.skills.strip() if payload.skills else None,
        experience_years=payload.experience_years,
        source=payload.source,
        original_filename="manual",
    )
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    return CandidateResponse.model_validate(new_candidate)


@router.get(
    "",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def list_candidates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    search: str | None = Query(default=None),
    company_id: int | None = Query(default=None),
    job_role_id: int | None = Query(default=None),
    min_experience: float | None = Query(default=None),
    max_experience: float | None = Query(default=None),
    vendor_id: int | None = Query(default=None),
    unassigned_only: bool = Query(default=False),
    interviewer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> dict:
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        interviewer_id = current_user.id
    items, total = CandidateService.get_all(
        db, 
        page=page, 
        page_size=page_size, 
        search=search, 
        company_id=company_id,
        job_role_id=job_role_id,
        min_experience=min_experience,
        max_experience=max_experience,
        vendor_id=vendor_id,
        unassigned_only=unassigned_only,
        interviewer_id=interviewer_id,
    )
    return {
        "items": [CandidateResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/stats",
    response_model=CandidateStatsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def candidate_stats(db: Session = Depends(get_db)) -> CandidateStatsResponse:
    stats = CandidateService.get_stats(db)
    return CandidateStatsResponse.model_validate(stats)


@router.get(
    "/{candidate_id}",
    response_model=CandidateDetailResponse,
    status_code=status.HTTP_200_OK,
)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> CandidateDetailResponse:
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        from app.models.interview_schedule import InterviewSchedule
        assigned = db.query(InterviewSchedule).filter(
            InterviewSchedule.interviewer_id == current_user.id,
            InterviewSchedule.candidate_id == candidate_id
        ).first()
        if not assigned:
            raise ForbiddenException(message="Access denied to this candidate")
            
    candidate = CandidateService.get_by_id(db, candidate_id)
    return CandidateDetailResponse.model_validate(candidate)


@router.patch(
    "/{candidate_id}",
    response_model=CandidateResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    db: Session = Depends(get_db),
) -> CandidateResponse:
    candidate = CandidateService.update(db, candidate_id, payload)
    return CandidateResponse.model_validate(candidate)


@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)) -> Response:
    CandidateService.delete(db, candidate_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{candidate_id}/file",
    status_code=status.HTTP_200_OK,
)
def get_candidate_file(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> FileResponse:
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        from app.models.interview_schedule import InterviewSchedule
        assigned = db.query(InterviewSchedule).filter(
            InterviewSchedule.interviewer_id == current_user.id,
            InterviewSchedule.candidate_id == candidate_id
        ).first()
        if not assigned:
            raise ForbiddenException(message="Access denied to this candidate file")
            
    candidate = CandidateService.get_by_id(db, candidate_id)
    file_path = storage_service.ensure_candidate_resume(candidate)
    ext = file_path.suffix.lower()
    mime_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if ext == ".docx"
        else "application/pdf"
    )
    raw_filename = candidate.original_filename or f"candidate-{candidate.id}{ext}"
    safe_filename = raw_filename.replace('"', '').replace('\r', '').replace('\n', '')
    return FileResponse(
        path=str(file_path),
        filename=safe_filename,
        media_type=mime_type,
        content_disposition_type="inline",
    )


@router.get(
    "/{candidate_id}/text",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_candidate_text(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> dict:
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        from app.models.interview_schedule import InterviewSchedule
        assigned = db.query(InterviewSchedule).filter(
            InterviewSchedule.interviewer_id == current_user.id,
            InterviewSchedule.candidate_id == candidate_id
        ).first()
        if not assigned:
            raise ForbiddenException(message="Access denied to this candidate text")
            
    candidate = CandidateService.get_by_id(db, candidate_id)
    return {
        "candidate_id": candidate.id,
        "raw_text": candidate.raw_text or "",
    }


@router.get(
    "/{candidate_id}/applications",
    response_model=list[ApplicationResponse],
    status_code=status.HTTP_200_OK,
)
def get_candidate_applications(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> list[ApplicationResponse]:
    from app.models.interviewer import Interviewer
    if isinstance(current_user, Interviewer):
        from app.models.interview_schedule import InterviewSchedule
        assigned = db.query(InterviewSchedule).filter(
            InterviewSchedule.interviewer_id == current_user.id,
            InterviewSchedule.candidate_id == candidate_id
        ).first()
        if not assigned:
            raise ForbiddenException(message="Access denied to this candidate applications")
            
    from app.services.application_service import ApplicationService
    applications = ApplicationService.get_all(db, candidate_id=candidate_id)
    return [ApplicationResponse.model_validate(item) for item in applications]


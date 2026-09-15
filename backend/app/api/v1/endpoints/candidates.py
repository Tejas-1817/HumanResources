from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, ForbiddenException, NotFoundException
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
from app.services.parser_service import ParserService
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
    applicant_status: str | None = Query(default=None),
    stage: str | None = Query(default=None),
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
        applicant_status=applicant_status,
        stage=stage,
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


@router.post(
    "/{candidate_id}/resume",
    response_model=CandidateDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr", "recruiter", "manager"))],
)
async def reupload_candidate_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CandidateDetailResponse:
    candidate = CandidateService.get_by_id(db, candidate_id)

    # 1. Validate file format and size
    storage_service.validate_file(file)

    temp_path: Path | None = None
    try:
        # 2. Save new file to temporary storage first (do not touch existing resume yet)
        temp_path = await storage_service.save_temp_file(file)

        # 3. Extract text and parse the new resume
        raw_text = ParserService.extract_text(str(temp_path))
        if not raw_text or not raw_text.strip():
            raise AppException(
                message="Unable to parse the new resume. Your existing resume and candidate information have been kept.",
                status_code=400,
            )

        parsed = ParserService.parse(str(temp_path))
        skills_value = parsed.get("skills") or []
        skills_text = ", ".join(skills_value) if isinstance(skills_value, list) else str(skills_value or "")

        # 4. Update candidate resume-derived fields only
        if parsed.get("name"):
            candidate.name = parsed["name"].strip()
        if parsed.get("email"):
            candidate.email = parsed["email"].strip().lower()
        if parsed.get("phone"):
            candidate.phone = parsed["phone"].strip()
        if skills_text:
            candidate.skills = skills_text.strip()
        candidate.experience_years = parsed.get("experience_years", candidate.experience_years)
        candidate.raw_text = raw_text
        candidate.original_filename = file.filename or candidate.original_filename

        # 5. Clean up old resume file(s) for this candidate and finalize the new one
        for old_file in storage_service.resumes_path.glob(f"{candidate_id}.*"):
            try:
                old_file.unlink()
            except Exception:
                pass

        ext = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
        await storage_service.finalize_file(
            temp_path,
            candidate_id=candidate.id,
            extension=ext,
        )
        temp_path = None

        db.commit()
        db.refresh(candidate)
        return CandidateDetailResponse.model_validate(candidate)
    except AppException:
        db.rollback()
        if temp_path and temp_path.exists():
            await storage_service.delete_file(temp_path)
        raise
    except Exception as exc:
        db.rollback()
        if temp_path and temp_path.exists():
            await storage_service.delete_file(temp_path)
        raise AppException(
            message="Unable to parse the new resume. Your existing resume and candidate information have been kept.",
            detail=str(exc),
            status_code=400,
        ) from exc


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


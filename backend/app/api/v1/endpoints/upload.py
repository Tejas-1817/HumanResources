from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.core.security import require_role
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.models.user import User
from app.services.parser_service import ParserService
from app.storage.local_storage import storage_service

router = APIRouter(prefix="/upload", tags=["Upload"])


class UploadResultResponse(BaseModel):
    success: bool
    filename: str
    candidate_id: int | None = None
    application_id: int | None = None
    error: str | None = None

    model_config = ConfigDict(from_attributes=True)


class BulkUploadResponse(BaseModel):
    total_files: int
    success_count: int
    failed_count: int
    results: list[UploadResultResponse]

    model_config = ConfigDict(from_attributes=True)


VALID_SOURCES = {"direct", "referral", "consultancy", "vendor", "linkedin", "indeed", "internshala"}


def resolve_or_create_job_role(
    db: Session,
    current_user: User,
    job_role_id: int | None,
    job_role_title: str | None,
    company_id: int | None = None,
) -> JobRole | None:
    if job_role_id is not None:
        role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
        if role is None:
            raise NotFoundException(message="Job role not found")
        return role

    title = (job_role_title or "").strip()
    if not title:
        if company_id is not None:
            role = db.query(JobRole).filter(
                JobRole.company_id == company_id,
                func.lower(JobRole.title) == "general"
            ).first()
            if role is not None:
                return role

            role = JobRole(
                company_id=company_id,
                title="General",
                description="General positions and unassigned talent pool.",
                status="open",
                created_by=current_user.id,
            )
            db.add(role)
            db.flush()
            return role
        return None

    role = db.query(JobRole).filter(func.lower(JobRole.title) == title.lower()).first()
    if role is not None:
        return role

    company = db.query(Company).filter(func.lower(Company.name) == "general").first()
    if company is None:
        company = Company(name="General")
        db.add(company)
        db.flush()

    role = JobRole(
        company_id=company.id,
        title=title,
        description=f"Auto-created from resume upload for role: {title}",
        status="open",
        created_by=current_user.id,
    )
    db.add(role)
    db.flush()
    return role


@router.post(
    "",
    response_model=BulkUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_files(
    files: list[UploadFile] = File(...),
    job_role_id: int | None = Form(default=None),
    job_role_title: str | None = Form(default=None),
    company_id: int | None = Form(default=None),
    source: str = Form(default="direct"),
    consultancy_name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> BulkUploadResponse:
    return await bulk_upload_resume(
        files=files,
        job_role_id=job_role_id,
        job_role_title=job_role_title,
        company_id=company_id,
        source=source,
        consultancy_name=consultancy_name,
        db=db,
        current_user=current_user,
    )


@router.post(
    "/resume",
    response_model=UploadResultResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume(
    file: UploadFile = File(...),
    job_role_id: int | None = Form(default=None),
    job_role_title: str | None = Form(default=None),
    company_id: int | None = Form(default=None),
    source: str = Form(default="direct"),
    consultancy_name: str | None = Form(default=None),
    vendor_name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> UploadResultResponse:
    role = resolve_or_create_job_role(db, current_user, job_role_id, job_role_title, company_id)

    normalized_source = source.strip().lower()
    if normalized_source not in VALID_SOURCES:
        raise AppException(
            message="Invalid source",
            detail="Allowed values are: direct, referral, consultancy, vendor, linkedin, indeed, internshala",
            status_code=422,
        )
    if normalized_source != "consultancy":
        consultancy_name = None
    if normalized_source != "vendor":
        vendor_name = None

    vendor_id = None
    if normalized_source == "vendor" and vendor_name:
        from app.models.vendor import Vendor
        from sqlalchemy import or_, func
        resolved_vendor = db.query(Vendor).filter(
            or_(
                func.lower(Vendor.name) == vendor_name.lower().strip(),
                func.lower(Vendor.company_name) == vendor_name.lower().strip()
            )
        ).first()
        if resolved_vendor:
            vendor_id = resolved_vendor.id

    temp_path: Path | None = None
    final_path: Path | None = None
    try:
        temp_path = await storage_service.save_temp_file(file)
        parsed = ParserService.parse(str(temp_path))
        skills_value = parsed.get("skills") or []
        skills_text = ", ".join(skills_value) if isinstance(skills_value, list) else str(skills_value or "")

        email = parsed.get("email")
        candidate = None
        if email:
            candidate = db.query(Candidate).filter(Candidate.email == email.lower().strip()).first()
        
        if candidate:
            # Update existing candidate
            candidate.name = parsed.get("name") or candidate.name
            candidate.phone = parsed.get("phone") or candidate.phone
            candidate.raw_text = parsed.get("raw_text") or candidate.raw_text
            candidate.skills = skills_text or candidate.skills
            candidate.experience_years = parsed.get("experience_years", candidate.experience_years)
            candidate.original_filename = file.filename or candidate.original_filename
            candidate.source = normalized_source
            candidate.consultancy_name = consultancy_name.strip() if consultancy_name else None
            if vendor_id:
                candidate.uploaded_by_vendor_id = vendor_id
        else:
            # Create new candidate
            candidate = Candidate(
                name=parsed.get("name"),
                email=email,
                phone=parsed.get("phone"),
                raw_text=parsed.get("raw_text") or "",
                skills=skills_text,
                experience_years=parsed.get("experience_years", 0.0),
                original_filename=file.filename or "resume.pdf",
                source=normalized_source,
                consultancy_name=consultancy_name.strip() if consultancy_name else None,
                uploaded_by_vendor_id=vendor_id,
            )
            db.add(candidate)
        
        db.flush()
        print(f"RESUME_SYNC_DEBUG: Candidate ID={candidate.id}, Email={candidate.email}, Role={role.title if role else 'General'}")

        ext = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
        final_path = await storage_service.finalize_file(
            temp_path,
            candidate_id=candidate.id,
            extension=ext,
        )
        temp_path = None

        application_id = None
        if role:
            application = JobApplication(
                candidate_id=candidate.id,
                job_role_id=role.id,
                submitted_by=current_user.id,
                source=normalized_source,
                consultancy_name=consultancy_name.strip() if consultancy_name else None,
                status="pending",
                resume_sent=False,
            )
            db.add(application)
            db.flush()
            application_id = application.id

        db.commit()

        return UploadResultResponse(
            success=True,
            filename=file.filename or "resume.pdf",
            candidate_id=candidate.id,
            application_id=application_id,
        )
    except AppException:
        db.rollback()
        if temp_path is not None:
            await storage_service.delete_file(temp_path)
        if final_path is not None:
            await storage_service.delete_file(final_path)
        raise
    except Exception as exc:
        db.rollback()
        if temp_path is not None:
            await storage_service.delete_file(temp_path)
        if final_path is not None:
            await storage_service.delete_file(final_path)
        raise AppException(
            message="Resume upload failed",
            detail=str(exc),
            status_code=500,
        ) from exc


@router.post(
    "/resume/bulk",
    response_model=BulkUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def bulk_upload_resume(
    files: list[UploadFile] = File(...),
    job_role_id: int | None = Form(default=None),
    job_role_title: str | None = Form(default=None),
    company_id: int | None = Form(default=None),
    source: str = Form(default="direct"),
    consultancy_name: str | None = Form(default=None),
    vendor_name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> BulkUploadResponse:
    role = resolve_or_create_job_role(db, current_user, job_role_id, job_role_title, company_id)

    normalized_source = source.strip().lower()
    if normalized_source not in VALID_SOURCES:
        raise AppException(
            message="Invalid source",
            detail="Allowed values are: direct, referral, consultancy, vendor, linkedin, indeed, internshala",
            status_code=422,
        )
    if normalized_source != "consultancy":
        consultancy_name = None
    if normalized_source != "vendor":
        vendor_name = None

    vendor_id = None
    if normalized_source == "vendor" and vendor_name:
        from app.models.vendor import Vendor
        from sqlalchemy import or_, func
        resolved_vendor = db.query(Vendor).filter(
            or_(
                func.lower(Vendor.name) == vendor_name.lower().strip(),
                func.lower(Vendor.company_name) == vendor_name.lower().strip()
            )
        ).first()
        if resolved_vendor:
            vendor_id = resolved_vendor.id

    results: list[UploadResultResponse] = []
    success_count = 0
    failed_count = 0

    for file in files:
        temp_path: Path | None = None
        final_path: Path | None = None
        try:
            temp_path = await storage_service.save_temp_file(file)
            parsed = ParserService.parse(str(temp_path))
            skills_value = parsed.get("skills") or []
            skills_text = ", ".join(skills_value) if isinstance(skills_value, list) else str(skills_value or "")

            email = parsed.get("email")
            candidate = None
            if email:
                candidate = db.query(Candidate).filter(Candidate.email == email.lower().strip()).first()
            
            if candidate:
                candidate.name = parsed.get("name") or candidate.name
                candidate.phone = parsed.get("phone") or candidate.phone
                candidate.raw_text = parsed.get("raw_text") or candidate.raw_text
                candidate.skills = skills_text or candidate.skills
                candidate.experience_years = parsed.get("experience_years", candidate.experience_years)
                candidate.original_filename = file.filename or candidate.original_filename
                candidate.source = normalized_source
                candidate.consultancy_name = consultancy_name.strip() if consultancy_name else None
                if vendor_id:
                    candidate.uploaded_by_vendor_id = vendor_id
            else:
                candidate = Candidate(
                    name=parsed.get("name"),
                    email=email,
                    phone=parsed.get("phone"),
                    raw_text=parsed.get("raw_text") or "",
                    skills=skills_text,
                    experience_years=parsed.get("experience_years", 0.0),
                    original_filename=file.filename or "resume.pdf",
                    source=normalized_source,
                    consultancy_name=consultancy_name.strip() if consultancy_name else None,
                    uploaded_by_vendor_id=vendor_id,
                )
                db.add(candidate)
            
            db.flush()

            ext = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
            final_path = await storage_service.finalize_file(
                temp_path,
                candidate_id=candidate.id,
                extension=ext,
            )
            temp_path = None

            application_id = None
            if role:
                application = JobApplication(
                    candidate_id=candidate.id,
                    job_role_id=role.id,
                    submitted_by=current_user.id,
                    source=normalized_source,
                    consultancy_name=consultancy_name.strip() if consultancy_name else None,
                    status="pending",
                    resume_sent=False,
                )
                db.add(application)
                db.flush()
                application_id = application.id

            db.commit()

            success_count += 1
            results.append(
                UploadResultResponse(
                    success=True,
                    filename=file.filename or "resume.pdf",
                    candidate_id=candidate.id,
                    application_id=application_id,
                    error=None,
                )
            )
        except Exception as exc:
            db.rollback()
            if temp_path is not None:
                await storage_service.delete_file(temp_path)
            if final_path is not None:
                await storage_service.delete_file(final_path)
            failed_count += 1
            results.append(
                UploadResultResponse(
                    success=False,
                    filename=file.filename or "unknown",
                    error=str(exc),
                )
            )

    return BulkUploadResponse(
        total_files=len(files),
        success_count=success_count,
        failed_count=failed_count,
        results=results,
    )

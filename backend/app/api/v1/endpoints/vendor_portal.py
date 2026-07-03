from fastapi import APIRouter, Depends, status, File, Form, UploadFile, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from app.database.session import get_db
from app.models.vendor import Vendor, VendorJobAssignment
from app.models.job_role import JobRole
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.schemas.vendor import (
    VendorLoginRequest, VendorTokenResponse, VendorAuthResponse,
    VendorStats, VendorPasswordChange
)
from app.schemas.job_role import JobRoleResponse
from app.schemas.candidate import CandidateResponse
from app.schemas.job_application import ApplicationResponse
from app.services.vendor_service import VendorService
from app.core.security import get_current_vendor
from app.core.exceptions import ForbiddenException, NotFoundException, AppException
from app.services.parser_service import ParserService
from app.storage.local_storage import storage_service

router = APIRouter(prefix="/vendor", tags=["Vendor Portal"])

@router.post("/login", response_model=VendorTokenResponse)
def login(payload: VendorLoginRequest, db: Session = Depends(get_db)):
    return VendorService.login(db, payload.email, payload.password)

@router.get("/me", response_model=VendorAuthResponse)
def me(current_vendor: Vendor = Depends(get_current_vendor)):
    return VendorAuthResponse.model_validate(current_vendor)

@router.get("/jobs", response_model=List[JobRoleResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    return VendorService.get_assigned_jobs(db, current_vendor.id)

@router.get("/jobs/{job_role_id}", response_model=JobRoleResponse)
def get_job_detail(
    job_role_id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    # Check if assigned
    assignment = db.query(VendorJobAssignment).filter(
        VendorJobAssignment.vendor_id == current_vendor.id,
        VendorJobAssignment.job_role_id == job_role_id
    ).first()
    if not assignment:
        raise ForbiddenException(message="Access denied to this job role")
    
    role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not role:
        raise NotFoundException(message="Job role not found")
    return role

@router.get("/candidates", response_model=List[CandidateResponse])
def get_candidates(
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    return db.query(Candidate).filter(Candidate.uploaded_by_vendor_id == current_vendor.id).all()

@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate_detail(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.uploaded_by_vendor_id == current_vendor.id
    ).first()
    if not candidate:
        raise NotFoundException(message="Candidate not found")
    return candidate

@router.get("/pipeline")
def get_pipeline(
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    # Scoped to assigned jobs
    assigned_job_ids = [a.job_role_id for a in current_vendor.job_assignments]
    
    apps = db.query(JobApplication).join(Candidate).filter(
        Candidate.uploaded_by_vendor_id == current_vendor.id,
        JobApplication.job_role_id.in_(assigned_job_ids)
    ).all()
    
    # Format as status-indexed dict for the pipeline view
    pipeline = {}
    for app in apps:
        status = app.status or "pending"
        if status not in pipeline:
            pipeline[status] = []
        pipeline[status].append(ApplicationResponse.model_validate(app))
    return pipeline

@router.get("/dashboard/stats", response_model=VendorStats)
def get_stats(
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    return VendorService.get_vendor_stats(db, current_vendor.id)

@router.get("/candidates/{candidate_id}/file")
async def get_candidate_file_vendor(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.uploaded_by_vendor_id == current_vendor.id
    ).first()
    
    if not candidate:
        raise NotFoundException(message="Candidate not found")

    file_path = storage_service.get_file_path(candidate_id, Path(candidate.original_filename).suffix.lower())
    if not file_path or not file_path.exists():
        raise NotFoundException(message="Resume file not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=candidate.original_filename,
        media_type="application/octet-stream"
    )

@router.post("/candidates/upload")
async def upload_candidate(
    file: UploadFile = File(...),
    job_role_id: int = Form(...),
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    # Check if job is assigned
    assignment = db.query(VendorJobAssignment).filter(
        VendorJobAssignment.vendor_id == current_vendor.id,
        VendorJobAssignment.job_role_id == job_role_id
    ).first()
    if not assignment:
        raise ForbiddenException(message="You are not assigned to this job role")

    role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not role:
        raise NotFoundException(message="Job role not found")

    temp_path: Path | None = None
    final_path: Path | None = None
    try:
        temp_path = await storage_service.save_temp_file(file)
        parsed = ParserService.parse(str(temp_path))
        
        email = parsed.get("email")
        candidate = None
        if email:
            candidate = db.query(Candidate).filter(Candidate.email == email.lower().strip()).first()
        
        skills_value = parsed.get("skills") or []
        skills_text = ", ".join(skills_value) if isinstance(skills_value, list) else str(skills_value or "")

        if candidate:
            # Check for cross-vendor collision
            if candidate.uploaded_by_vendor_id and candidate.uploaded_by_vendor_id != current_vendor.id:
                raise ForbiddenException(message="Candidate already exists in the system via another source")
            
            # Update existing candidate details from resume
            candidate.name = parsed.get("name") or candidate.name
            candidate.phone = parsed.get("phone") or candidate.phone
            candidate.raw_text = parsed.get("raw_text") or candidate.raw_text
            candidate.skills = skills_text or candidate.skills
            candidate.experience_years = parsed.get("experience_years", candidate.experience_years)
            candidate.uploaded_by_vendor_id = current_vendor.id
            candidate.source = "vendor"
        else:
            candidate = Candidate(
                name=parsed.get("name"),
                email=email,
                phone=parsed.get("phone"),
                raw_text=parsed.get("raw_text") or "",
                skills=skills_text,
                experience_years=parsed.get("experience_years", 0.0),
                original_filename=file.filename or "resume.pdf",
                source="vendor",
                uploaded_by_vendor_id=current_vendor.id,
            )
            db.add(candidate)
        
        db.flush()
        
        ext = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
        final_path = await storage_service.finalize_file(temp_path, candidate_id=candidate.id, extension=ext)
        temp_path = None
        
        # Create application record
        application = JobApplication(
            candidate_id=candidate.id,
            job_role_id=role.id,
            source="vendor",
            status="pending"
        )
        db.add(application)

        # Notify Admin
        from app.models.notification import Notification
        admin_notification = Notification(
            recipient_role="admin",
            title="Candidate Uploaded by Vendor",
            message=f"Vendor '{current_vendor.name}' ({current_vendor.company_name}) uploaded candidate '{candidate.name}' for Job '{role.title}'."
        )
        db.add(admin_notification)
        
        db.commit()
        
        return {
            "success": True, 
            "candidate_id": candidate.id, 
            "application_id": application.id,
            "filename": file.filename
        }
    except Exception as exc:
        db.rollback()
        if temp_path: await storage_service.delete_file(temp_path)
        if final_path: await storage_service.delete_file(final_path)
        raise AppException(message="Upload failed", detail=str(exc))

@router.post("/candidates/upload-on-bench")
async def upload_candidate_on_bench(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    temp_path: Path | None = None
    final_path: Path | None = None
    try:
        temp_path = await storage_service.save_temp_file(file)
        parsed = ParserService.parse(str(temp_path))
        
        email = parsed.get("email")
        candidate = None
        if email:
            candidate = db.query(Candidate).filter(Candidate.email == email.lower().strip()).first()
        
        skills_value = parsed.get("skills") or []
        skills_text = ", ".join(skills_value) if isinstance(skills_value, list) else str(skills_value or "")

        if candidate:
            if candidate.uploaded_by_vendor_id and candidate.uploaded_by_vendor_id != current_vendor.id:
                raise ForbiddenException(message="Candidate already exists in the system via another source")
            
            candidate.name = parsed.get("name") or candidate.name
            candidate.phone = parsed.get("phone") or candidate.phone
            candidate.raw_text = parsed.get("raw_text") or candidate.raw_text
            candidate.skills = skills_text or candidate.skills
            candidate.experience_years = parsed.get("experience_years", candidate.experience_years)
            candidate.uploaded_by_vendor_id = current_vendor.id
            candidate.source = "vendor"
        else:
            candidate = Candidate(
                name=parsed.get("name"),
                email=email,
                phone=parsed.get("phone"),
                raw_text=parsed.get("raw_text") or "",
                skills=skills_text,
                experience_years=parsed.get("experience_years", 0.0),
                original_filename=file.filename or "resume.pdf",
                source="vendor",
                uploaded_by_vendor_id=current_vendor.id,
            )
            db.add(candidate)
        
        db.flush()
        
        ext = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
        final_path = await storage_service.finalize_file(temp_path, candidate_id=candidate.id, extension=ext)
        temp_path = None

        # Notify Admin
        from app.models.notification import Notification
        admin_notification = Notification(
            recipient_role="admin",
            title="Candidate Uploaded to Bench",
            message=f"Vendor '{current_vendor.name}' ({current_vendor.company_name}) uploaded candidate '{candidate.name}' to the bench."
        )
        db.add(admin_notification)
        
        db.commit()
        
        return {
            "success": True, 
            "candidate_id": candidate.id, 
            "filename": file.filename
        }
    except Exception as exc:
        db.rollback()
        if temp_path: await storage_service.delete_file(temp_path)
        if final_path: await storage_service.delete_file(final_path)
        raise AppException(message="Upload failed", detail=str(exc))

@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    from app.services.candidate_service import CandidateService
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.uploaded_by_vendor_id == current_vendor.id
    ).first()
    
    if not candidate:
        raise NotFoundException(message="Candidate not found or unauthorized")
        
    CandidateService.delete(db, candidate_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/change-password")
def change_password(
    payload: VendorPasswordChange,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    VendorService.change_password(
        db, 
        current_vendor.id, 
        payload.current_password, 
        payload.new_password
    )
    return {"message": "Password updated successfully"}

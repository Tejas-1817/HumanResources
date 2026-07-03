from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.user import User
from app.schemas.vendor import (
    VendorCreate, VendorResponse, VendorUpdate,
    VendorJobAssignmentCreate, VendorJobAssignmentResponse
)
from app.schemas.job_role import JobRoleResponse
from app.services.vendor_service import VendorService
from app.core.security import require_role

router = APIRouter(prefix="/hr/vendors", tags=["HR - Vendor Management"])

@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.create_vendor(
        db=db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        company_name=payload.company_name,
        phone=payload.phone
    )

@router.get("", response_model=List[VendorResponse])
def list_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.list_vendors(db)

@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.get_vendor_by_id(db, vendor_id)

@router.patch("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.update_vendor(db, vendor_id, **payload.model_dump(exclude_none=True))

@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    VendorService.delete_vendor(db, vendor_id)
    return None

@router.post("/{vendor_id}/assign-job", response_model=VendorJobAssignmentResponse)
def assign_job(
    vendor_id: int,
    payload: VendorJobAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.assign_job(db, vendor_id, payload.job_role_id, current_user.id)

@router.delete("/{vendor_id}/assign-job/{job_role_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_job(
    vendor_id: int,
    job_role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    VendorService.unassign_job(db, vendor_id, job_role_id)
    return None

@router.get("/{vendor_id}/jobs", response_model=List[JobRoleResponse])
def get_vendor_jobs(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    return VendorService.get_assigned_jobs(db, vendor_id)

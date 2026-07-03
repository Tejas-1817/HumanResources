from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.models.user import User
from app.models.vendor import Vendor, VendorJobAssignment
from app.models.job_role import JobRole
from app.core.security import require_role
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/vendor-assignments", tags=["Vendor Assignments"])

class VendorAssignmentPayload(BaseModel):
    vendor_ids: List[int] = Field(..., description="List of vendor IDs")
    role_ids: List[int] = Field(..., description="List of job role IDs")

@router.post("", status_code=status.HTTP_200_OK)
def assign_vendors_to_roles(
    payload: VendorAssignmentPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr"))
):
    # Validate payload non-empty lists
    if not payload.vendor_ids:
        raise BadRequestException(message="vendor_ids list cannot be empty")
    if not payload.role_ids:
        raise BadRequestException(message="role_ids list cannot be empty")

    # 1. Validate vendors exist
    for vendor_id in payload.vendor_ids:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise NotFoundException(message="Vendor not found")

    # 2. Validate roles exist
    for role_id in payload.role_ids:
        role = db.query(JobRole).filter(JobRole.id == role_id).first()
        if not role:
            raise NotFoundException(message="Job role not found")

    # 3. Create assignments with duplicate prevention
    for vendor_id in payload.vendor_ids:
        for role_id in payload.role_ids:
            # Check if assignment already exists
            existing = db.query(VendorJobAssignment).filter(
                VendorJobAssignment.vendor_id == vendor_id,
                VendorJobAssignment.job_role_id == role_id
            ).first()
            
            if not existing:
                assignment = VendorJobAssignment(
                    vendor_id=vendor_id,
                    job_role_id=role_id,
                    assigned_by_id=current_user.id
                )
                db.add(assignment)

                # Notify Vendor
                role = db.query(JobRole).filter(JobRole.id == role_id).first()
                role_title = role.title if role else "New Job Role"
                from app.models.notification import Notification
                vendor_notification = Notification(
                    recipient_role="vendor",
                    recipient_id=vendor_id,
                    title="New Job Role Assigned",
                    message=f"You have been assigned to the Job Role '{role_title}' by the admin."
                )
                db.add(vendor_notification)
    
    db.commit()
    return {
        "success": True,
        "message": "Roles assigned successfully"
    }

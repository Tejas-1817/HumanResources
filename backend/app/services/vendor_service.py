from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.security import create_access_token, hash_password, verify_password
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, DuplicateException, NotFoundException
from app.models.vendor import Vendor, VendorJobAssignment
from app.models.job_role import JobRole
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.models.user import User
from typing import List, Optional

class VendorService:
    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        processed_email = email.lower().strip()
        print(f"DEBUG: Vendor portal login attempt for '{processed_email}'")
        
        # 1. Try Vendor
        from app.models.system_activity import SystemActivity
        vendor = db.query(Vendor).filter(Vendor.email == processed_email).first()
        if vendor:
            if not verify_password(password, vendor.hashed_password):
                print(f"DEBUG: Password verification failed for '{processed_email}'")
                raise UnauthorizedException(message="Invalid credentials")
            
            if not vendor.is_active:
                print(f"DEBUG: Vendor account is inactive: '{processed_email}'")
                raise UnauthorizedException(message="Vendor account is inactive")

            # Log Activity
            db.add(SystemActivity(text=f"Vendor {vendor.name} logged in", activity_type="login"))
            db.commit()

            access_token = create_access_token(
                data={"sub": vendor.email, "role": "vendor", "vendor_id": vendor.id},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "vendor": vendor,
                "role": "vendor"
            }

        # 2. Try HR User fallback
        from app.models.user import User
        user = db.query(User).filter(User.email == processed_email).first()
        if user:
            if not verify_password(password, user.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            if not user.is_active:
                raise UnauthorizedException(message="User is inactive")
            
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user,
                "role": user.role
            }

        raise UnauthorizedException(message="Invalid credentials")

    @staticmethod
    def create_vendor(db: Session, name: str, email: str, password: str, company_name: str, phone: Optional[str] = None) -> Vendor:
        normalized_email = email.lower().strip()
        existing_vendor = db.query(Vendor).filter(Vendor.email == normalized_email).first()
        if existing_vendor:
            raise DuplicateException(message="Email already registered for a vendor")

        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise DuplicateException(message="Email already registered for a vendor")
            
        vendor = Vendor(
            name=name.strip(),
            email=normalized_email,
            company_name=company_name.strip(),
            hashed_password=hash_password(password),
            phone=phone,
            is_active=True
        )
        db.add(vendor)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise DuplicateException(message="Email already registered")
        db.refresh(vendor)
        return vendor

    @staticmethod
    def list_vendors(db: Session) -> List[Vendor]:
        return db.query(Vendor).all()

    @staticmethod
    def get_vendor_by_id(db: Session, vendor_id: int) -> Vendor:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise NotFoundException(message="Vendor not found")
        return vendor

    @staticmethod
    def update_vendor(db: Session, vendor_id: int, **kwargs) -> Vendor:
        vendor = VendorService.get_vendor_by_id(db, vendor_id)
        if "password" in kwargs and kwargs["password"]:
            vendor.hashed_password = hash_password(kwargs.pop("password"))
        
        for key, value in kwargs.items():
            if value is not None:
                setattr(vendor, key, value)
        
        db.commit()
        db.refresh(vendor)
        return vendor

    @staticmethod
    def delete_vendor(db: Session, vendor_id: int):
        vendor = VendorService.get_vendor_by_id(db, vendor_id)
        db.delete(vendor)
        db.commit()

    @staticmethod
    def assign_job(db: Session, vendor_id: int, job_role_id: int, assigned_by_id: int) -> VendorJobAssignment:
        # Check if already assigned
        existing = db.query(VendorJobAssignment).filter(
            VendorJobAssignment.vendor_id == vendor_id,
            VendorJobAssignment.job_role_id == job_role_id
        ).first()
        if existing:
            return existing
            
        assignment = VendorJobAssignment(
            vendor_id=vendor_id,
            job_role_id=job_role_id,
            assigned_by_id=assigned_by_id
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def unassign_job(db: Session, vendor_id: int, job_role_id: int):
        db.query(VendorJobAssignment).filter(
            VendorJobAssignment.vendor_id == vendor_id,
            VendorJobAssignment.job_role_id == job_role_id
        ).delete()
        db.commit()

    @staticmethod
    def get_assigned_jobs(db: Session, vendor_id: int) -> List[JobRole]:
        return db.query(JobRole).join(
            VendorJobAssignment, JobRole.id == VendorJobAssignment.job_role_id
        ).filter(VendorJobAssignment.vendor_id == vendor_id).all()

    @staticmethod
    def get_vendor_stats(db: Session, vendor_id: int) -> dict:
        jobs_assigned = db.query(VendorJobAssignment).filter(VendorJobAssignment.vendor_id == vendor_id).count()
        
        candidates = db.query(Candidate).filter(Candidate.uploaded_by_vendor_id == vendor_id).all()
        resumes_submitted = len(candidates)
        
        candidate_ids = [c.id for c in candidates]
        
        in_pipeline = 0
        selected = 0
        
        if candidate_ids:
            in_pipeline = db.query(JobApplication).filter(
                JobApplication.candidate_id.in_(candidate_ids),
                JobApplication.status.notin_(["selected", "rejected", "dropped"])
            ).count()
            
            selected = db.query(JobApplication).filter(
                JobApplication.candidate_id.in_(candidate_ids),
                JobApplication.status == "selected"
            ).count()
        
        return {
            "jobs_assigned": jobs_assigned,
            "resumes_submitted": resumes_submitted,
            "candidates_in_pipeline": in_pipeline,
            "candidates_selected": selected
        }

    @staticmethod
    def change_password(db: Session, vendor_id: int, current_pwd: str, new_pwd: str):
        vendor = VendorService.get_vendor_by_id(db, vendor_id)
        if not verify_password(current_pwd, vendor.hashed_password):
            raise UnauthorizedException(message="Current password incorrect")
        
        vendor.hashed_password = hash_password(new_pwd)
        db.commit()

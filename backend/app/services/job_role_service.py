# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, NotFoundException
from app.models.company import Company
from app.models.job_role import JobRole
from app.schemas.job_role import JobRoleCreate, JobRoleUpdate


class JobRoleService:
    @staticmethod
    def create(db: Session, payload: JobRoleCreate, created_by: int | None) -> JobRole:
        company = db.query(Company).filter(Company.id == payload.company_id).first()
        if company is None:
            raise NotFoundException(message="Company not found")

        status = payload.status.strip().lower()
        if status not in {"open", "closed", "loss", "on_hold", "on-hold"}:
            raise AppException(
                message="Invalid job role status",
                detail="Allowed values are: open, closed, loss, on_hold",
                status_code=422,
            )

        role = JobRole(
            company_id=payload.company_id,
            title=payload.title.strip(),
            description=payload.description.strip(),
            status=status,
            deadline=payload.deadline,
            pipeline_stages=[s.model_dump() for s in payload.pipeline_stages] if payload.pipeline_stages else None,
            estimated_budget=payload.estimated_budget,
            currency=payload.currency,
            positions_required=payload.positions_required,
            department=payload.department,
            location=payload.location,
            work_mode=payload.work_mode,
            experience_required=payload.experience_required,
            project_time_period=payload.project_time_period,
            created_by=created_by,
        )
        db.add(role)
        db.flush() # Get the role ID before commit

        # Handle vendor assignments
        if payload.vendor_ids:
            from app.models.vendor import VendorJobAssignment
            for vendor_id in payload.vendor_ids:
                assignment = VendorJobAssignment(
                    vendor_id=vendor_id,
                    job_role_id=role.id,
                    assigned_by_id=created_by
                )
                db.add(assignment)

        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def get_by_id(db: Session, role_id: int) -> JobRole:
        role = (
            db.query(JobRole)
            .options(joinedload(JobRole.company))
            .filter(JobRole.id == role_id)
            .first()
        )
        if role is None:
            raise NotFoundException(message="Job role not found")
        return role

    @staticmethod
    def get_all(
        db: Session,
        company_id: int | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[JobRole]:
        query = db.query(JobRole).options(joinedload(JobRole.company))
        if company_id is not None:
            query = query.filter(JobRole.company_id == company_id)
        if status:
            query = query.filter(JobRole.status == status.strip().lower())
        if search:
            query = query.filter(JobRole.title.ilike(f"%{search.strip()}%"))
        return query.order_by(JobRole.created_at.desc()).all()

    @staticmethod
    def update(db: Session, role_id: int, payload: JobRoleUpdate) -> JobRole:
        role = JobRoleService.get_by_id(db, role_id)

        if payload.company_id is not None:
            role.company_id = payload.company_id
        if payload.title is not None:
            role.title = payload.title.strip()
        if payload.description is not None:
            role.description = payload.description.strip()
        # Allow explicit null to clear deadline (use model_fields_set to detect intentional null)
        if "deadline" in payload.model_fields_set:
            role.deadline = payload.deadline
        if payload.status is not None:
            next_status = payload.status.strip().lower()
            if next_status not in {"open", "closed", "loss", "on_hold", "on-hold"}:
                raise AppException(
                    message="Invalid job role status",
                    detail="Allowed values are: open, closed, loss, on_hold",
                    status_code=422,
                )
            role.status = next_status

        if "pipeline_stages" in payload.model_fields_set:
            role.pipeline_stages = [s.model_dump() for s in payload.pipeline_stages] if payload.pipeline_stages else None
        
        if "estimated_budget" in payload.model_fields_set:
            role.estimated_budget = payload.estimated_budget
        if "currency" in payload.model_fields_set and payload.currency is not None:
            role.currency = payload.currency
        if "positions_required" in payload.model_fields_set and payload.positions_required is not None:
            role.positions_required = payload.positions_required
        if "department" in payload.model_fields_set:
            role.department = payload.department
        if "location" in payload.model_fields_set:
            role.location = payload.location.strip() if payload.location else None
        if "work_mode" in payload.model_fields_set:
            role.work_mode = payload.work_mode
        if "experience_required" in payload.model_fields_set:
            role.experience_required = payload.experience_required
        if "project_time_period" in payload.model_fields_set:
            role.project_time_period = payload.project_time_period

        # Handle vendor assignments
        if payload.vendor_ids is not None:
            from app.models.vendor import VendorJobAssignment
            # For updates, we replace existing ones with the new list
            db.query(VendorJobAssignment).filter(VendorJobAssignment.job_role_id == role.id).delete()
            for vendor_id in payload.vendor_ids:
                assignment = VendorJobAssignment(
                    vendor_id=vendor_id,
                    job_role_id=role.id,
                )
                db.add(assignment)

        db.commit()
        if payload.status is None:
            JobRoleService.sync_status(db, role.id)
        db.refresh(role)
        return role

    @staticmethod
    def sync_status(db: Session, role_id: int) -> None:
        from app.models.job_application import JobApplication
        from sqlalchemy import func
        role = db.query(JobRole).filter(JobRole.id == role_id).first()
        if not role:
            return
        
        # Do not override manual terminal statuses such as 'loss' or 'on_hold'
        if (role.status or "").lower() in {"loss", "on_hold", "on-hold"}:
            return

        filled_count = db.query(func.count(JobApplication.id)).filter(
            JobApplication.job_role_id == role_id,
            JobApplication.status.in_(["selected", "joined"])
        ).scalar() or 0
        
        if filled_count >= (role.positions_required or 1):
            role.status = "closed"
        elif role.status == "closed" and filled_count < (role.positions_required or 1):
            role.status = "open"
        db.commit()

    @staticmethod
    def close_role(db: Session, role_id: int) -> JobRole:
        role = JobRoleService.get_by_id(db, role_id)
        role.status = "closed"
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def delete(db: Session, role_id: int) -> None:
        role = JobRoleService.get_by_id(db, role_id)
        db.delete(role)
        db.commit()

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
        if status not in {"open", "closed"}:
            raise AppException(
                message="Invalid job role status",
                detail="Allowed values are: open, closed",
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

        if payload.title is not None:
            role.title = payload.title.strip()
        if payload.description is not None:
            role.description = payload.description.strip()
        # Allow explicit null to clear deadline (use model_fields_set to detect intentional null)
        if "deadline" in payload.model_fields_set:
            role.deadline = payload.deadline
        if payload.status is not None:
            next_status = payload.status.strip().lower()
            if next_status not in {"open", "closed"}:
                raise AppException(
                    message="Invalid job role status",
                    detail="Allowed values are: open, closed",
                    status_code=422,
                )
            role.status = next_status

        if payload.pipeline_stages is not None:
            role.pipeline_stages = [s.model_dump() for s in payload.pipeline_stages]
        
        if payload.estimated_budget is not None:
            role.estimated_budget = payload.estimated_budget
        if payload.currency is not None:
            role.currency = payload.currency
        if payload.positions_required is not None:
            role.positions_required = payload.positions_required
        if payload.location is not None:
            role.location = payload.location
        if payload.work_mode is not None:
            role.work_mode = payload.work_mode
        if payload.experience_required is not None:
            role.experience_required = payload.experience_required
        if payload.project_time_period is not None:
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
        db.refresh(role)
        return role

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

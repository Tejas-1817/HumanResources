from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, DuplicateException, NotFoundException
from app.models.company import Company
from app.models.job_role import JobRole
from app.schemas.company import CompanyCreate, CompanyUpdate


class CompanyService:
    @staticmethod
    def create(db: Session, payload: CompanyCreate) -> Company:
        existing = (
            db.query(Company)
            .filter(func.lower(Company.name) == payload.name.strip().lower())
            .first()
        )
        if existing is not None:
            raise DuplicateException(message="Company with this name already exists")

        company = Company(
            name=payload.name.strip(),
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        return company

    @staticmethod
    def get_by_id(db: Session, company_id: int) -> Company:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company is None:
            raise NotFoundException(message="Company not found")
        return company

    @staticmethod
    def get_all(db: Session, search: str | None = None, include_internal: bool = False) -> list[Company]:
        query = db.query(Company)
        if not include_internal:
            query = query.filter(Company.is_internal == False)
        if search:
            needle = f"%{search.strip()}%"
            query = query.filter(Company.name.ilike(needle))
        return query.order_by(Company.created_at.desc()).all()

    @staticmethod
    def update(db: Session, company_id: int, payload: CompanyUpdate) -> Company:
        company = CompanyService.get_by_id(db, company_id)

        if payload.name is not None:
            next_name = payload.name.strip()
            existing = (
                db.query(Company)
                .filter(func.lower(Company.name) == next_name.lower(), Company.id != company_id)
                .first()
            )
            if existing is not None:
                raise DuplicateException(message="Company with this name already exists")
            company.name = next_name



        db.commit()
        db.refresh(company)
        return company

    @staticmethod
    def delete(db: Session, company_id: int) -> None:
        company = CompanyService.get_by_id(db, company_id)
        linked_roles = db.query(JobRole).filter(JobRole.company_id == company_id).count()
        if linked_roles > 0:
            raise AppException(
                message="Cannot delete company with attached job roles",
                detail="Close or remove associated job roles first",
                status_code=409,
            )
        db.delete(company)
        db.commit()

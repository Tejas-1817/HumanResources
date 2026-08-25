from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.schemas.company import (
    CompanyCreate,
    CompanyDetailResponse,
    CompanyResponse,
    CompanyUpdate,
)
from app.services.company_service import CompanyService

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin", "hr", "recruiter", "manager"))],
)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> CompanyResponse:
    company = CompanyService.create(db, payload)
    return CompanyResponse.model_validate(company)


@router.get(
    "",
    response_model=list[CompanyResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_companies(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[CompanyResponse]:
    companies = CompanyService.get_all(db, search=search)
    return [CompanyResponse.model_validate(company) for company in companies]


@router.get(
    "/{company_id}",
    response_model=CompanyDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_company(company_id: int, db: Session = Depends(get_db)) -> CompanyDetailResponse:
    company = CompanyService.get_by_id(db, company_id)
    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        location=company.location,
        note=company.note,
        created_at=company.created_at,
        job_roles_count=len(company.job_roles),
    )


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr", "recruiter", "manager"))],
)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
) -> CompanyResponse:
    company = CompanyService.update(db, company_id, payload)
    return CompanyResponse.model_validate(company)


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def delete_company(company_id: int, db: Session = Depends(get_db)) -> Response:
    CompanyService.delete(db, company_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

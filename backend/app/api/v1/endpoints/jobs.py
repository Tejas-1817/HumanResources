from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.job_role import (
    JobRoleCreate,
    JobRoleDetailResponse,
    JobRoleResponse,
    JobRoleUpdate,
)
from app.services.job_role_service import JobRoleService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobRoleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job_role(
    payload: JobRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> JobRoleResponse:
    role = JobRoleService.create(db, payload, created_by=current_user.id)
    return JobRoleResponse.model_validate(role)


@router.get(
    "",
    response_model=list[JobRoleResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_job_roles(
    company_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[JobRoleResponse]:
    roles = JobRoleService.get_all(
        db,
        company_id=company_id,
        status=status_filter,
        search=search,
    )
    return [JobRoleResponse.model_validate(role) for role in roles]


@router.get(
    "/{role_id}",
    response_model=JobRoleDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_job_role(role_id: int, db: Session = Depends(get_db)) -> JobRoleDetailResponse:
    role = JobRoleService.get_by_id(db, role_id)
    return JobRoleDetailResponse(
        id=role.id,
        company_id=role.company_id,
        title=role.title,
        description=role.description,
        status=role.status,
        deadline=role.deadline,
        created_by=role.created_by,
        created_at=role.created_at,
        company_name=role.company.name,
    )


@router.patch(
    "/{role_id}",
    response_model=JobRoleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def update_job_role(
    role_id: int,
    payload: JobRoleUpdate,
    db: Session = Depends(get_db),
) -> JobRoleResponse:
    role = JobRoleService.update(db, role_id, payload)
    return JobRoleResponse.model_validate(role)


@router.patch(
    "/{role_id}/close",
    response_model=JobRoleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def close_job_role(role_id: int, db: Session = Depends(get_db)) -> JobRoleResponse:
    role = JobRoleService.close_role(db, role_id)
    return JobRoleResponse.model_validate(role)

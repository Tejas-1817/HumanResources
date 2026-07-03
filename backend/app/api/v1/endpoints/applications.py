from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.job_application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationTimelineItem,
    BulkDeleteRequest,
)
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> ApplicationResponse:
    application = ApplicationService.create(db, payload, submitted_by=current_user.id)
    return ApplicationResponse.model_validate(application)


@router.get(
    "",
    response_model=list[ApplicationResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def list_applications(
    status_filter: str | None = Query(default=None, alias="status"),
    job_role_id: int | None = Query(default=None),
    candidate_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    applications = ApplicationService.get_all(
        db,
        status=status_filter,
        job_role_id=job_role_id,
        candidate_id=candidate_id,
    )
    return [ApplicationResponse.model_validate(item) for item in applications]


@router.patch(
    "/{application_id}/send",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def mark_resume_sent(application_id: int, db: Session = Depends(get_db)) -> ApplicationResponse:
    application = ApplicationService.mark_resume_sent(db, application_id)
    return ApplicationResponse.model_validate(application)


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> ApplicationResponse:
    application = ApplicationService.update_status(
        db,
        application_id,
        payload,
        changed_by=current_user.id,
    )
    return ApplicationResponse.model_validate(application)


@router.get(
    "/{application_id}/timeline",
    response_model=list[ApplicationTimelineItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_application_timeline(
    application_id: int,
    db: Session = Depends(get_db),
) -> list[ApplicationTimelineItem]:
    timeline = ApplicationService.get_timeline(db, application_id)
    return [ApplicationTimelineItem.model_validate(item) for item in timeline]


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
) -> Response:
    ApplicationService.delete(db, application_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/bulk-delete",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def bulk_delete_applications(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
) -> Response:
    ApplicationService.bulk_delete(db, payload.application_ids)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


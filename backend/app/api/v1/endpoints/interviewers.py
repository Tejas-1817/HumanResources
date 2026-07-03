from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.schemas.interviewer import (
    InterviewerCreate,
    InterviewerResponse,
    InterviewerUpdate,
)
from app.services.interviewer_service import InterviewerService

router = APIRouter(prefix="/interviewers", tags=["Interviewers"])


@router.post(
    "",
    response_model=InterviewerResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def create_interviewer(payload: InterviewerCreate, db: Session = Depends(get_db)) -> InterviewerResponse:
    interviewer = InterviewerService.create(db, payload)
    return InterviewerResponse.model_validate(interviewer)


@router.get(
    "",
    response_model=list[InterviewerResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_interviewers(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[InterviewerResponse]:
    interviewers = InterviewerService.get_all(db, search=search)
    return [InterviewerResponse.model_validate(i) for i in interviewers]


@router.get(
    "/{interviewer_id}",
    response_model=InterviewerResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_interviewer(interviewer_id: int, db: Session = Depends(get_db)) -> InterviewerResponse:
    interviewer = InterviewerService.get_by_id(db, interviewer_id)
    return InterviewerResponse.model_validate(interviewer)


@router.patch(
    "/{interviewer_id}",
    response_model=InterviewerResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def update_interviewer(
    interviewer_id: int,
    payload: InterviewerUpdate,
    db: Session = Depends(get_db),
) -> InterviewerResponse:
    interviewer = InterviewerService.update(db, interviewer_id, payload)
    return InterviewerResponse.model_validate(interviewer)


@router.delete(
    "/{interviewer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def delete_interviewer(interviewer_id: int, db: Session = Depends(get_db)) -> Response:
    InterviewerService.delete(db, interviewer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


from pydantic import BaseModel, Field

class InterviewerResetPasswordRequest(BaseModel):
    password: str = Field(min_length=6, max_length=255)

@router.post(
    "/{interviewer_id}/reset-password",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def reset_interviewer_password(
    interviewer_id: int,
    payload: InterviewerResetPasswordRequest,
    db: Session = Depends(get_db),
):
    from app.core.security import hash_password
    interviewer = InterviewerService.get_by_id(db, interviewer_id)
    interviewer.hashed_password = hash_password(payload.password)
    db.commit()
    return {"message": "Password reset successfully"}


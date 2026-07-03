from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.interviewer import Interviewer
from app.models.interview_schedule import InterviewSchedule
from app.schemas.auth import InterviewerLoginResponse
from app.schemas.interview_schedule import InterviewScheduleResponse
from app.core.security import get_current_interviewer

router = APIRouter(prefix="/interviewer", tags=["Interviewer Portal"])


@router.get("/me", response_model=InterviewerLoginResponse, status_code=status.HTTP_200_OK)
def get_me(current_interviewer: Interviewer = Depends(get_current_interviewer)) -> InterviewerLoginResponse:
    """Get profile of current logged-in interviewer."""
    return InterviewerLoginResponse.model_validate(current_interviewer)


@router.get("/interviews", response_model=List[InterviewScheduleResponse], status_code=status.HTTP_200_OK)
def get_interviews(
    current_interviewer: Interviewer = Depends(get_current_interviewer),
    db: Session = Depends(get_db)
) -> List[InterviewScheduleResponse]:
    """Get scheduled interviews for current logged-in interviewer."""
    interviews = (
        db.query(InterviewSchedule)
        .filter(InterviewSchedule.interviewer_id == current_interviewer.id)
        .order_by(InterviewSchedule.date.asc(), InterviewSchedule.time.asc())
        .all()
    )
    return interviews


from app.schemas.auth import PasswordChangeRequest
from app.services.auth_service import AuthService

@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_interviewer: Interviewer = Depends(get_current_interviewer),
):
    """Change password for current logged-in interviewer."""
    AuthService.change_interviewer_password(
        db=db,
        interviewer_id=current_interviewer.id,
        current_pwd=payload.current_password,
        new_pwd=payload.new_password,
    )
    return {"message": "Password updated successfully"}


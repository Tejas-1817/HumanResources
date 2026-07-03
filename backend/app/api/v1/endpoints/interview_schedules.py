from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.interview_schedule import InterviewSchedule
from app.schemas.interview_schedule import (
    InterviewScheduleCreate,
    InterviewScheduleResponse,
    AssignCandidatesPayload,
    InterviewScheduleUpdate,
)
from app.services.interview_schedule_service import InterviewScheduleService

router = APIRouter(prefix="/interview-schedules", tags=["Interview Schedules"])


@router.patch(
    "/{schedule_id}",
    response_model=InterviewScheduleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def update_schedule(
    schedule_id: int,
    payload: InterviewScheduleUpdate,
    db: Session = Depends(get_db),
) -> InterviewScheduleResponse:
    schedule = InterviewScheduleService.update(db, schedule_id, payload)
    return InterviewScheduleResponse.model_validate(schedule)


@router.post(
    "",
    response_model=InterviewScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user)],
)
def create_schedule(
    payload: InterviewScheduleCreate, db: Session = Depends(get_db)
) -> InterviewScheduleResponse:

    schedule = InterviewScheduleService.create(db, payload)
    return InterviewScheduleResponse.model_validate(schedule)


@router.get(
    "",
    response_model=list[InterviewScheduleResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_schedules(db: Session = Depends(get_db)) -> list[InterviewScheduleResponse]:
    schedules = InterviewScheduleService.get_all(db)
    return [InterviewScheduleResponse.model_validate(s) for s in schedules]


@router.put(
    "/{schedule_id}/assign",
    response_model=list[InterviewScheduleResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def assign_candidates(
    schedule_id: int,
    payload: AssignCandidatesPayload,
    db: Session = Depends(get_db),
) -> list[InterviewScheduleResponse]:
    target = db.query(InterviewSchedule).filter(InterviewSchedule.id == schedule_id).first()
    if not target:
        raise NotFoundException(message="Interview schedule not found")

    # Store target properties locally to avoid lazy loading issues on deleted/modified instances
    job_role_id = target.job_role_id
    interviewer_id = target.interviewer_id
    date = target.date
    time = target.time
    venue = target.venue

    slot_schedules = db.query(InterviewSchedule).filter(
        InterviewSchedule.job_role_id == job_role_id,
        InterviewSchedule.interviewer_id == interviewer_id,
        InterviewSchedule.date == date,
        InterviewSchedule.time == time,
        InterviewSchedule.venue == venue,
    ).all()

    existing_candidate_ids = {s.candidate_id for s in slot_schedules if s.candidate_id is not None}
    new_candidate_ids = set(payload.candidate_ids)

    to_add = new_candidate_ids - existing_candidate_ids
    to_remove = existing_candidate_ids - new_candidate_ids

    null_schedules = [s for s in slot_schedules if s.candidate_id is None]

    # Remove schedules for candidates that are no longer assigned
    for s in slot_schedules:
        if s.candidate_id in to_remove:
            db.delete(s)

    # Add new schedules
    added_count = 0
    from app.models.candidate import Candidate
    from app.models.job_role import JobRole
    from app.models.notification import Notification

    for cid in to_add:
        if null_schedules and added_count < len(null_schedules):
            null_schedules[added_count].candidate_id = cid
            added_count += 1
        else:
            new_s = InterviewSchedule(
                job_role_id=job_role_id,
                interviewer_id=interviewer_id,
                candidate_id=cid,
                date=date,
                time=time,
                venue=venue,
            )
            db.add(new_s)

        # Notify Interviewer
        c_name = "a Candidate"
        cand = db.query(Candidate).filter(Candidate.id == cid).first()
        if cand:
            c_name = cand.name

        r_title = "Job Role"
        role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
        if role:
            r_title = role.title

        interviewer_notification = Notification(
            recipient_role="interviewer",
            recipient_id=interviewer_id,
            title="New Interview Scheduled",
            message=f"A new interview has been scheduled for candidate '{c_name}' for Job '{r_title}' on {date} at {time} (Venue: {venue})."
        )
        db.add(interviewer_notification)

    db.commit()

    updated_slot_schedules = db.query(InterviewSchedule).filter(
        InterviewSchedule.job_role_id == job_role_id,
        InterviewSchedule.interviewer_id == interviewer_id,
        InterviewSchedule.date == date,
        InterviewSchedule.time == time,
        InterviewSchedule.venue == venue,
    ).all()

    if len(updated_slot_schedules) == 0:
        new_s = InterviewSchedule(
            job_role_id=job_role_id,
            interviewer_id=interviewer_id,
            candidate_id=None,
            date=date,
            time=time,
            venue=venue,
        )
        db.add(new_s)
        db.commit()
        updated_slot_schedules = [new_s]

    return [InterviewScheduleResponse.model_validate(s) for s in updated_slot_schedules]


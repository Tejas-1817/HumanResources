from sqlalchemy.orm import Session
from app.models.interview_schedule import InterviewSchedule
from app.schemas.interview_schedule import InterviewScheduleCreate, InterviewScheduleUpdate
from app.core.exceptions import NotFoundException

class InterviewScheduleService:
    @staticmethod
    def create(db: Session, payload: InterviewScheduleCreate) -> InterviewSchedule:
        schedule = InterviewSchedule(
            job_role_id=payload.job_role_id,
            candidate_id=payload.candidate_id,
            interviewer_id=payload.interviewer_id,
            date=payload.date,
            time=payload.time,
            venue=payload.venue,
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        # Notify Interviewer
        from app.models.notification import Notification
        from app.models.candidate import Candidate
        from app.models.job_role import JobRole
        
        c_name = "a Candidate"
        if payload.candidate_id:
            cand = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
            if cand:
                c_name = cand.name
        
        r_title = "Job Role"
        if payload.job_role_id:
            role = db.query(JobRole).filter(JobRole.id == payload.job_role_id).first()
            if role:
                r_title = role.title
                
        interviewer_notification = Notification(
            recipient_role="interviewer",
            recipient_id=payload.interviewer_id,
            title="New Interview Scheduled",
            message=f"A new interview has been scheduled for candidate '{c_name}' for Job '{r_title}' on {payload.date} at {payload.time} (Venue: {payload.venue})."
        )
        db.add(interviewer_notification)
        db.commit()

        return schedule

    @staticmethod
    def get_all(db: Session) -> list[InterviewSchedule]:
        return db.query(InterviewSchedule).order_by(InterviewSchedule.created_at.desc()).all()

    @staticmethod
    def update(db: Session, schedule_id: int, payload: InterviewScheduleUpdate) -> InterviewSchedule:
        schedule = db.query(InterviewSchedule).filter(InterviewSchedule.id == schedule_id).first()
        if not schedule:
            raise NotFoundException(message="Interview schedule not found")

        if payload.interviewer_id is not None:
            schedule.interviewer_id = payload.interviewer_id
        if payload.date is not None:
            schedule.date = payload.date
        if payload.time is not None:
            schedule.time = payload.time
        if payload.venue is not None:
            schedule.venue = payload.venue

        db.commit()
        db.refresh(schedule)
        return schedule


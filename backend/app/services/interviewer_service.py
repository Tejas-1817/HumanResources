# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateException, NotFoundException
from app.models.interviewer import Interviewer
from app.schemas.interviewer import InterviewerCreate, InterviewerUpdate


class InterviewerService:
    @staticmethod
    def create(db: Session, payload: InterviewerCreate) -> Interviewer:
        from app.core.security import hash_password
        
        payload_email = payload.email.strip().lower()
        existing = (
            db.query(Interviewer)
            .filter(func.lower(Interviewer.email) == payload_email)
            .first()
        )
        if existing is not None:
            raise DuplicateException(message="Interviewer with this email already exists")

        interviewer = Interviewer(
            name=payload.name.strip(),
            email=payload_email,
            phone=payload.phone.strip() if payload.phone else None,
            hashed_password=hash_password("Altzor123"),
        )
        db.add(interviewer)
        db.commit()
        db.refresh(interviewer)
        return interviewer

    @staticmethod
    def get_by_id(db: Session, interviewer_id: int) -> Interviewer:
        interviewer = db.query(Interviewer).filter(Interviewer.id == interviewer_id).first()
        if interviewer is None:
            raise NotFoundException(message="Interviewer not found")
        return interviewer

    @staticmethod
    def get_all(db: Session, search: str | None = None) -> list[Interviewer]:
        query = db.query(Interviewer)
        if search:
            needle = f"%{search.strip()}%"
            query = query.filter(
                (Interviewer.name.ilike(needle)) |
                (Interviewer.email.ilike(needle)) |
                (Interviewer.phone.ilike(needle))
            )
        return query.order_by(Interviewer.name.asc()).all()

    @staticmethod
    def update(db: Session, interviewer_id: int, payload: InterviewerUpdate) -> Interviewer:
        interviewer = InterviewerService.get_by_id(db, interviewer_id)

        if payload.name is not None:
            interviewer.name = payload.name.strip()
        
        if payload.email is not None:
            payload_email = payload.email.strip().lower()
            existing = (
                db.query(Interviewer)
                .filter(func.lower(Interviewer.email) == payload_email, Interviewer.id != interviewer_id)
                .first()
            )
            if existing is not None:
                raise DuplicateException(message="Interviewer with this email already exists")
            interviewer.email = payload_email
            
        if payload.phone is not None:
            interviewer.phone = payload.phone.strip() if payload.phone else None

        db.commit()
        db.refresh(interviewer)
        return interviewer

    @staticmethod
    def delete(db: Session, interviewer_id: int) -> None:
        interviewer = InterviewerService.get_by_id(db, interviewer_id)
        db.delete(interviewer)
        db.commit()

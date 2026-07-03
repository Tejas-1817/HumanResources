import re

from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppException, NotFoundException
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate


class CandidateService:
    @staticmethod
    def create(db: Session, payload: CandidateCreate) -> Candidate:
        candidate = Candidate(
            name=payload.name.strip() if payload.name else None,
            email=payload.email.strip().lower() if payload.email else None,
            phone=payload.phone.strip() if payload.phone else None,
            raw_text=payload.raw_text,
            skills=payload.skills,
            experience_years=payload.experience_years,
            original_filename=payload.original_filename.strip(),
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def get_by_id(db: Session, candidate_id: int) -> Candidate:
        candidate = (
            db.query(Candidate)
            .options(
                selectinload(Candidate.applications),
                selectinload(Candidate.uploader_vendor)
            )
            .filter(Candidate.id == candidate_id)
            .first()
        )
        if candidate is None:
            raise NotFoundException(message="Candidate not found")
        return candidate

    @staticmethod
    def get_all(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        company_id: int | None = None,
        job_role_id: int | None = None,
        min_experience: float | None = None,
        max_experience: float | None = None,
        vendor_id: int | None = None,
        unassigned_only: bool = False,
        interviewer_id: int | None = None,
    ) -> tuple[list[Candidate], int]:
        safe_page = max(page, 1)
        safe_page_size = max(1, min(page_size, 100))

        query = db.query(Candidate).options(
            selectinload(Candidate.applications),
            selectinload(Candidate.uploader_vendor)
        )

        if vendor_id:
            query = query.filter(Candidate.uploaded_by_vendor_id == vendor_id)

        if interviewer_id:
            from app.models.interview_schedule import InterviewSchedule
            query = query.join(InterviewSchedule, InterviewSchedule.candidate_id == Candidate.id)
            query = query.filter(InterviewSchedule.interviewer_id == interviewer_id)
            query = query.distinct()
            
        if unassigned_only:
            from app.models.job_application import JobApplication
            query = query.filter(~Candidate.applications.any(JobApplication.status == "selected"))

        if company_id or job_role_id:
            from app.models.job_application import JobApplication
            from app.models.job_role import JobRole
            query = query.join(Candidate.applications).join(JobRole)
            
            if company_id:
                query = query.filter(JobRole.company_id == company_id)
            if job_role_id:
                query = query.filter(JobApplication.job_role_id == job_role_id)
                
            query = query.distinct()

        if min_experience is not None:
            query = query.filter(Candidate.experience_years >= min_experience)
        if max_experience is not None:
            query = query.filter(Candidate.experience_years < max_experience)

        if search:
            # allow searching by multiple terms (e.g. "john react django")
            # it will require ALL terms to be present somewhere in the candidate's fields
            raw_tokens = [t.strip() for t in search.replace(",", " ").split() if t.strip()]
            
            if raw_tokens:
                and_conditions = []
                for token in raw_tokens:
                    escaped = token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                    term = f"%{escaped}%"
                    and_conditions.append(
                        or_(
                            Candidate.name.ilike(term, escape="\\"),
                            Candidate.email.ilike(term, escape="\\"),
                            Candidate.phone.ilike(term, escape="\\"),
                            Candidate.skills.ilike(term, escape="\\"),
                        )
                    )
                query = query.filter(and_(*and_conditions))

        total = query.count()
        items = (
            query.order_by(Candidate.id.desc())
            .offset((safe_page - 1) * safe_page_size)
            .limit(safe_page_size)
            .all()
        )
        return items, total

    @staticmethod
    def update(db: Session, candidate_id: int, payload: CandidateUpdate) -> Candidate:
        candidate = CandidateService.get_by_id(db, candidate_id)
        if payload.name is not None:
            candidate.name = payload.name.strip() if payload.name else None
        if payload.email is not None:
            candidate.email = payload.email.strip().lower() if payload.email else None
        if payload.phone is not None:
            candidate.phone = payload.phone.strip() if payload.phone else None
        if payload.skills is not None:
            candidate.skills = payload.skills
        if payload.experience_years is not None:
            if payload.experience_years < 0:
                raise AppException(
                    message="Invalid experience value",
                    detail="experience_years cannot be negative",
                    status_code=422,
                )
            candidate.experience_years = payload.experience_years

        db.commit()
        # Return candidate re-fetched with relationships to avoid DetachedInstanceError during serialization
        return CandidateService.get_by_id(db, candidate.id)

    @staticmethod
    def delete(db: Session, candidate_id: int) -> None:
        from app.storage.local_storage import storage_service
        candidate = CandidateService.get_by_id(db, candidate_id)
        
        # Determine file path
        file_path = storage_service.get_candidate_file_path(candidate_id)
        
        # Delete from DB first (cascade handles applications)
        db.delete(candidate)
        db.commit()
        
        # Delete file if it exists
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            # We don't want to fail the whole request if file deletion fails
            pass

    @staticmethod
    def get_stats(db: Session) -> dict:
        total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
        average_experience = db.query(func.avg(Candidate.experience_years)).scalar() or 0.0

        top_candidates = (
            db.query(Candidate.skills)
            .filter(Candidate.skills.isnot(None), Candidate.skills != "")
            .limit(300)
            .all()
        )
        frequency: dict[str, int] = {}
        for (skills_raw,) in top_candidates:
            for token in [item.strip() for item in skills_raw.split(",") if item.strip()]:
                frequency[token] = frequency.get(token, 0) + 1

        top_skills = [
            {"name": skill, "count": count}
            for skill, count in sorted(
                frequency.items(),
                key=lambda pair: pair[1],
                reverse=True,
            )[:10]
        ]

        return {
            "total_candidates": int(total_candidates),
            "average_experience": round(float(average_experience), 2),
            "top_skills": top_skills,
        }

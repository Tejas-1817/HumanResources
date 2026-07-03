from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class InterviewSchedule(Base):
    __tablename__ = "interview_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_roles.id", ondelete="CASCADE"),
        nullable=False,
    )
    candidate_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=True,
    )
    interviewer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("interviewers.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    venue: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job_role = relationship("JobRole")
    candidate = relationship("Candidate")
    interviewer = relationship("Interviewer")

    @property
    def candidate_name(self) -> str | None:
        return self.candidate.name if self.candidate else None

    @property
    def job_role_title(self) -> str | None:
        return self.job_role.title if self.job_role else None

    @property
    def interviewer_name(self) -> str | None:
        return self.interviewer.name if self.interviewer else None

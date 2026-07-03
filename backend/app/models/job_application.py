from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submitted_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default=text("'direct'"),
    )
    consultancy_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_sent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0"),
    )
    resume_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default=text("'pending'"),
    )
    status_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    interview_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    offer_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_replacement: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    candidate = relationship("Candidate", back_populates="applications")
    job_role = relationship("JobRole", back_populates="applications")
    submitter = relationship("User", back_populates="submitted_applications")
    activity_logs = relationship(
        "ActivityLog",
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def candidate_name(self) -> str | None:
        return self.candidate.name if self.candidate else None

    @property
    def candidate_email(self) -> str | None:
        return self.candidate.email if self.candidate else None

    @property
    def candidate_phone(self) -> str | None:
        return self.candidate.phone if self.candidate else None

    @property
    def experience_years(self) -> float:
        return self.candidate.experience_years if self.candidate else 0.0

    @property
    def skills(self) -> str | None:
        return self.candidate.skills if self.candidate else None

    @property
    def source_label(self) -> str | None:
        return self.candidate.source_label if self.candidate else None

    @property
    def source_vendor(self) -> str | None:
        return self.candidate.source_vendor if self.candidate else None

from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class JobRole(Base):
    __tablename__ = "job_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default=text("'open'"),
    )
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    pipeline_stages: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    estimated_budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'INR'"))
    positions_required: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)  # remote, hybrid, onsite
    experience_required: Mapped[float | None] = mapped_column(Float, nullable=True)  # years
    project_time_period: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    company = relationship("Company", back_populates="job_roles")
    
    @property
    def company_name(self) -> str:
        return self.company.name if self.company else "Unknown Company"

    creator = relationship("User", back_populates="created_job_roles")
    applications = relationship(
        "JobApplication",
        back_populates="job_role",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

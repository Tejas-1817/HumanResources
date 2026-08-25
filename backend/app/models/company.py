from datetime import datetime


from sqlalchemy import Boolean, DateTime, Integer, String, Text, func, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_internal: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0"),
        default=False,
    )

    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job_roles = relationship(
        "JobRole",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    users = relationship("User", back_populates="company")


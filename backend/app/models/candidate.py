from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy import text as sa_text
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default=sa_text("'direct'"),
    )
    consultancy_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_years: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    uploaded_by_vendor_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    applications = relationship(
        "JobApplication",
        back_populates="candidate",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    uploader_vendor = relationship("Vendor", back_populates="candidates")

    @property
    def source_vendor(self) -> str | None:
        if self.uploader_vendor:
            return self.uploader_vendor.name
        return None

    @property
    def source_label(self) -> str | None:
        if self.uploader_vendor:
            return self.uploader_vendor.name
            
        # Prefer candidate-level source (always set during upload)
        source_str = (self.source or "direct").title()
        label = source_str
        # Append the name detail based on source type
        detail = self.consultancy_name
        if not detail and self.applications:
            app = self.applications[0]
            detail = app.consultancy_name
        if detail:
            label += f" ({detail})"
        return label

    @property
    def is_replacement(self) -> bool:
        if not self.applications:
            return False
        return any(app.is_replacement for app in self.applications)

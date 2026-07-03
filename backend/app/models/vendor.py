from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, 
        nullable=False, 
        default=True, 
        server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )

    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def role(self):
        return "vendor"

    job_assignments = relationship("VendorJobAssignment", back_populates="vendor", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="uploader_vendor")

class VendorJobAssignment(Base):
    __tablename__ = "vendor_job_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("vendors.id", ondelete="CASCADE"), 
        nullable=False
    )
    job_role_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("job_roles.id", ondelete="CASCADE"), 
        nullable=False
    )
    assigned_by_id: Mapped[int | None] = mapped_column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )

    vendor = relationship("Vendor", back_populates="job_assignments")
    job_role = relationship("JobRole")
    assigned_by = relationship("User")

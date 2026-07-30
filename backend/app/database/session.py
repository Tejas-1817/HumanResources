from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.base import Base


print(settings.db_url)

engine = create_engine(
    settings.db_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_admin() -> None:
    """Ensure the default admin account always exists in the database."""
    from app.core.security import hash_password
    from app.models.user import User

    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == "ankita.mate@altzor.com").first()
        if existing is None:
            admin = User(
                name="Admin",
                email="ankita.mate@altzor.com",
                hashed_password=hash_password("admin123"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("[seed] Admin user created: ankita.mate@altzor.com")
        else:
            print("[seed] Admin user already exists, skipping.")


def seed_company() -> None:
    """Ensure the default company Altzor Digital Solutions always exists in the database."""
    from app.models.company import Company

    with SessionLocal() as db:
        existing = db.query(Company).filter(Company.name == "Altzor Digital Solutions").first()
        if existing is None:
            company = Company(name="Altzor Digital Solutions", location="Pune, India")
            db.add(company)
            db.commit()
            print("[seed] Company created: Altzor Digital Solutions")
        else:
            print("[seed] Company Altzor Digital Solutions already exists, skipping.")


def init_db() -> None:
    from app.models.activity_log import ActivityLog  # noqa: F401
    from app.models.candidate import Candidate  # noqa: F401
    from app.models.company import Company  # noqa: F401
    from app.models.job_application import JobApplication  # noqa: F401
    from app.models.job_role import JobRole  # noqa: F401
    from app.models.user import User  # noqa: F401
    from app.models.vendor import Vendor, VendorJobAssignment  # noqa: F401
    from app.models.interviewer import Interviewer  # noqa: F401
    from app.models.interview_schedule import InterviewSchedule  # noqa: F401
    from app.models.notification import Notification  # noqa: F401
    from app.models.system_activity import SystemActivity  # noqa: F401

    Base.metadata.create_all(bind=engine)
    
    # Ensure companies table has location column (for MySQL/SQLite migration)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN location VARCHAR(255)"))
            conn.commit()
            print("[migration] Added location column to companies table")
        except Exception:
            pass  # Already exists or connection issue
            
    seed_admin()
    seed_company()


def verify_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

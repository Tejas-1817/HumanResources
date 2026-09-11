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
    

    # Ensure companies table has location and is_internal default (for MySQL/SQLite migration)

    # Ensure companies table has location and note columns (for MySQL/SQLite migration)

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN location VARCHAR(255)"))
            conn.commit()
            print("[migration] Added location column to companies table")
        except Exception:
            pass  # Already exists or connection issue

        try:
            conn.execute(text("ALTER TABLE companies MODIFY COLUMN is_internal TINYINT(1) NOT NULL DEFAULT 0"))
            conn.commit()
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN note TEXT NULL"))
            conn.commit()
            print("[migration] Added note column to companies table")
        except Exception:
            pass
            
    seed_admin()
    seed_company()
    sync_job_roles_status()


def sync_job_roles_status() -> None:
    """Ensure JobRole status in database is clean, trimmed, and correctly reflects open positions."""
    from app.models.job_role import JobRole
    from app.models.job_application import JobApplication
    from sqlalchemy import func

    with SessionLocal() as db:
        try:
            roles = db.query(JobRole).all()
            updated = 0
            for r in roles:
                raw = (r.status or "").strip().lower()
                clean = "open" if raw in {"", "active"} else raw
                if r.status != clean:
                    r.status = clean
                    updated += 1
                # If marked closed, verify against filled positions
                if r.status == "closed":
                    filled_count = db.query(func.count(JobApplication.id)).filter(
                        JobApplication.job_role_id == r.id,
                        JobApplication.status.in_(["selected", "joined"])
                    ).scalar() or 0
                    if filled_count < (r.positions_required or 1):
                        r.status = "open"
                        updated += 1
            if updated > 0:
                db.commit()
                print(f"[sync] Synchronized status for {updated} job role(s).")
        except Exception as e:
            print(f"[sync] JobRole status sync warning: {e}")


def verify_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

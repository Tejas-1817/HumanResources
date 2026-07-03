from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import case, extract, func
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.schemas.dashboard import DashboardStatsResponse, PipelineSummaryItem, RecentUploadItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_cache: dict = {
    "value": None,
    "updated_at": None,
    "ttl_seconds": 30,
}


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStatsResponse:
    now = datetime.now(timezone.utc)
    updated_at: datetime | None = _cache["updated_at"]
    if updated_at and _cache["value"] is not None:
        age = (now - updated_at).total_seconds()
        if age < _cache["ttl_seconds"]:
            return DashboardStatsResponse.model_validate(_cache["value"])

    total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_open_roles = db.query(func.count(JobRole.id)).filter(JobRole.status == "open").scalar() or 0
    avg_experience = db.query(func.avg(Candidate.experience_years)).scalar() or 0.0

    month = now.month
    year = now.year
    total_selected_this_month = (
        db.query(func.count(JobApplication.id))
        .filter(
            JobApplication.status == "selected",
            extract("month", JobApplication.created_at) == month,
            extract("year", JobApplication.created_at) == year,
        )
        .scalar()
        or 0
    )

    total_replacements = db.query(func.count(JobApplication.id)).filter(JobApplication.is_replacement == True).scalar() or 0

    # Single aggregated query for pipeline summary.
    pipeline_counts = (
        db.query(
            func.sum(case((JobApplication.status == "pending", 1), else_=0)).label("pending"),
            func.sum(case((JobApplication.status == "shortlisted", 1), else_=0)).label("shortlisted"),
            func.sum(
                case((JobApplication.status == "interview_scheduled", 1), else_=0)
            ).label("interview_scheduled"),
            func.sum(case((JobApplication.status == "interviewed", 1), else_=0)).label("interviewed"),
            func.sum(case((JobApplication.status == "selected", 1), else_=0)).label("selected"),
            func.sum(case((JobApplication.status == "rejected", 1), else_=0)).label("rejected"),
            func.sum(case((JobApplication.status == "on_hold", 1), else_=0)).label("on_hold"),
            func.sum(case((JobApplication.status == "dropped", 1), else_=0)).label("dropped"),
            func.sum(case((JobApplication.status == "not_joined", 1), else_=0)).label("not_joined"),
        )
        .one()
    )

    recent_candidates = (
        db.query(Candidate)
        .options(selectinload(Candidate.applications))
        .order_by(Candidate.created_at.desc())
        .limit(8)
        .all()
    )
    recent_uploads = [
        RecentUploadItem(
            candidate_id=item.id,
            name=item.name,
            email=item.email,
            skills=item.skills,
            created_at=item.created_at,
        )
        for item in recent_candidates
    ]

    skill_rows = (
        db.query(Candidate.skills)
        .filter(Candidate.skills.isnot(None), Candidate.skills != "")
        .limit(500)
        .all()
    )
    frequency: dict[str, int] = {}
    for (skills_raw,) in skill_rows:
        for skill in [s.strip() for s in skills_raw.split(",") if s.strip()]:
            frequency[skill] = frequency.get(skill, 0) + 1
    top_skills = [
        {"name": skill, "count": count}
        for skill, count in sorted(frequency.items(), key=lambda i: i[1], reverse=True)[:10]
    ]

    payload = {
        "total_candidates": int(total_candidates),
        "total_companies": int(total_companies),
        "total_open_roles": int(total_open_roles),
        "avg_experience": round(float(avg_experience), 2),
        "total_selected_this_month": int(total_selected_this_month),
        "total_replacements": int(total_replacements),
        "top_skills": top_skills,
        "recent_uploads": recent_uploads,
        "pipeline_summary": PipelineSummaryItem(
            pending=int(pipeline_counts.pending or 0),
            shortlisted=int(pipeline_counts.shortlisted or 0),
            interview_scheduled=int(pipeline_counts.interview_scheduled or 0),
            interviewed=int(pipeline_counts.interviewed or 0),
            selected=int(pipeline_counts.selected or 0),
            rejected=int(pipeline_counts.rejected or 0),
            on_hold=int(pipeline_counts.on_hold or 0),
            dropped=int(pipeline_counts.dropped or 0),
            not_joined=int(pipeline_counts.not_joined or 0),
        ),
    }

    _cache["value"] = payload
    _cache["updated_at"] = now
    return DashboardStatsResponse.model_validate(payload)

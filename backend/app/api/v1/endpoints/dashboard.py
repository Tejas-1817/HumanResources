import calendar
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import case, extract, func, or_, and_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.models.user import User
from app.schemas.dashboard import (
    ActivityFeedItem,
    DashboardStatsResponse,
    FilterOptionItem,
    MonthlyRecruitmentTrendItem,
    OpenPositionItem,
    PipelineSummaryItem,
    RecentUploadItem,
    RecruiterOptionItem,
    RecruitmentFilterOptionsResponse,
)


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStatsResponse:
    now = datetime.now(timezone.utc)

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

    # ── Open Positions with accurate applicant counts ────────────────────
    raw_open_roles = (
        db.query(JobRole)
        .options(joinedload(JobRole.company))
        .filter(JobRole.status == "open")
        .order_by(JobRole.created_at.desc())
        .all()
    )

    # Count filled applications (selected or joined) per role
    filled_role_counts: dict[int, int] = dict(
        db.query(JobApplication.job_role_id, func.count(JobApplication.id))
        .filter(JobApplication.status.in_(["selected", "joined"]))
        .group_by(JobApplication.job_role_id)
        .all()
    )

    open_roles = [
        r for r in raw_open_roles
        if not (r.positions_required and filled_role_counts.get(r.id, 0) >= r.positions_required)
    ]

    # Count ALL applications (across every status) per role in one query
    role_applicant_counts: dict[int, int] = dict(
        db.query(JobApplication.job_role_id, func.count(JobApplication.id))
        .group_by(JobApplication.job_role_id)
        .all()
    )

    open_positions = [
        OpenPositionItem(
            id=r.id,
            company=r.company.name if r.company else "Unknown",
            role=r.title,
            positions=r.positions_required or 1,
            count=role_applicant_counts.get(r.id, 0),
            status="Active",
        )
        for r in open_roles
    ]

    # ── Activity Feed (today and yesterday) ──────────────────────────────
    yesterday = now - timedelta(days=2)

    activities = []

    new_candidates_feed = db.query(Candidate).filter(Candidate.created_at >= yesterday).all()
    for c in new_candidates_feed:
        activities.append({
            "id": f"cand-{c.id}",
            "text": f"New candidate {c.name or c.email or 'Candidate'} added to talent pool",
            "created_at": c.created_at,
            "iconBg": "bg-blue-50 text-blue-600"
        })

    new_jobs = db.query(JobRole).filter(JobRole.created_at >= yesterday).all()
    for j in new_jobs:
        activities.append({
            "id": f"job-{j.id}",
            "text": f"Job position {j.title} created",
            "created_at": j.created_at,
            "iconBg": "bg-amber-50 text-amber-600"
        })

    from app.models.activity_log import ActivityLog
    act_logs = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.application).selectinload(JobApplication.candidate))
        .filter(ActivityLog.created_at >= yesterday)
        .all()
    )
    for a in act_logs:
        c_name = a.application.candidate.name if a.application and a.application.candidate else "Candidate"
        action = "moved to"
        if a.new_status == "shortlisted":
            action = "was shortlisted"
        elif a.new_status == "interview_scheduled":
            action = "Interview scheduled for"
        elif a.new_status == "selected":
            action = "was selected"

        activities.append({
            "id": f"act-{a.id}",
            "text": f"{c_name} {action} {a.new_status.replace('_', ' ')}",
            "created_at": a.created_at,
            "iconBg": "bg-purple-50 text-purple-600"
        })

    activities.sort(key=lambda x: x["created_at"], reverse=True)

    def format_time_ago(d: datetime) -> str:
        if not d:
            return ""
        now_local = datetime.now(d.tzinfo)
        diff = now_local - d
        diff_mins = int(diff.total_seconds() / 60)
        if diff_mins < 1:
            return "Just now"
        if diff_mins < 60:
            return f"{diff_mins}m ago"
        diff_hours = int(diff_mins / 60)
        if diff_hours < 24:
            return f"{diff_hours}h ago"
        diff_days = int(diff_hours / 24)
        return f"{diff_days}d ago"

    activity_feed = []
    for idx, act in enumerate(activities[:50]):
        activity_feed.append(ActivityFeedItem(
            id=idx,
            text=act["text"],
            time=format_time_ago(act["created_at"]),
            iconBg=act["iconBg"],
            created_at=act["created_at"]
        ))

    monthly_trends = calculate_monthly_recruitment_trends(db)

    payload = {
        "total_candidates": int(total_candidates),
        "total_companies": int(total_companies),
        "total_open_roles": int(total_open_roles),
        "avg_experience": round(float(avg_experience), 2),
        "total_selected_this_month": int(total_selected_this_month),
        "total_replacements": int(total_replacements),
        "top_skills": top_skills,
        "recent_uploads": recent_uploads,
        "activity_feed": activity_feed,
        "open_positions": open_positions,
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
        "monthly_recruitment_trends": monthly_trends,
    }

    return DashboardStatsResponse.model_validate(payload)


def calculate_monthly_recruitment_trends(
    db: Session,
    months: int | None = None,
    time_period: str = "last_6_months",
    start_date: str | None = None,
    end_date: str | None = None,
    department: str | None = None,
    position: str | None = None,
    recruiter_id: int | None = None,
    position_status: str | None = None,
    candidate_source: str | None = None,
    job_location: str | None = None,
    experience_level: str | None = None,
    vacancy_age: str | None = None,
) -> list[MonthlyRecruitmentTrendItem]:
    """
    Calculate monthly recruitment trends derived directly from actual JobRole positions:
    - Active Positions: Positions actively being recruited for during/at each month snapshot (pink #F45B8D)
    - Closed Positions: Distinct positions confirmed filled or successfully closed in each month (green #18B99A)
    - Lost Positions: Distinct positions marked as cancelled, lost, or abandoned in each month (orange #F28C38)
    Counts distinct position IDs to avoid any duplicates and uses historical status change logs.
    """
    now = datetime.now(timezone.utc)

    # 1. Determine chronological month_list based on date range or period
    month_list: list[tuple[int, int]] = []
    if start_date and end_date:
        try:
            s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
            curr = datetime(s_dt.year, s_dt.month, 1)
            end_m = datetime(e_dt.year, e_dt.month, 1)
            while curr <= end_m and len(month_list) < 48:
                month_list.append((curr.year, curr.month))
                m = curr.month + 1
                y = curr.year
                if m > 12:
                    m = 1
                    y += 1
                curr = datetime(y, m, 1)
        except Exception:
            month_list = []

    elif time_period == "all_time":
        min_job = db.query(func.min(JobRole.created_at)).scalar()
        min_app = db.query(func.min(JobApplication.created_at)).scalar()
        valid_dates = [d for d in [min_job, min_app] if d is not None]
        min_dt = min(valid_dates) if valid_dates else (now - timedelta(days=180))
        curr = datetime(min_dt.year, min_dt.month, 1)
        end_m = datetime(now.year, now.month, 1)
        while curr <= end_m and len(month_list) < 48:
            month_list.append((curr.year, curr.month))
            m = curr.month + 1
            y = curr.year
            if m > 12:
                m = 1
                y += 1
            curr = datetime(y, m, 1)

    if not month_list:
        num_months = 6
        if months is not None:
            num_months = max(1, min(int(months), 36))
        elif time_period == "last_30_days":
            num_months = 1
        elif time_period == "last_3_months":
            num_months = 3
        elif time_period == "last_6_months":
            num_months = 6
        elif time_period == "last_9_months":
            num_months = 9
        elif time_period == "last_12_months":
            num_months = 12

        y, m = now.year, now.month
        for _ in range(num_months):
            month_list.append((y, m))
            m -= 1
            if m == 0:
                m = 12
                y -= 1
        month_list.reverse()

    # 2. Query distinct JobRole records applying any optional attribute filters
    roles_q = db.query(JobRole)
    if department and department.strip() and department.strip().lower() != "all":
        roles_q = roles_q.filter(func.lower(JobRole.department) == department.strip().lower())
    if position and position.strip() and position.strip().lower() != "all":
        roles_q = roles_q.filter(func.lower(JobRole.title) == position.strip().lower())
    if recruiter_id and str(recruiter_id).lower() != "all":
        roles_q = roles_q.filter(JobRole.created_by == int(recruiter_id))
    if job_location and job_location.strip() and job_location.strip().lower() != "all":
        roles_q = roles_q.filter(JobRole.location.ilike(f"%{job_location.strip()}%"))
    if experience_level and experience_level.strip() and experience_level.strip().lower() != "all":
        exp = experience_level.strip()
        if exp == "0-2":
            roles_q = roles_q.filter(or_(
                JobRole.experience_required.in_(["0", "1", "2"]),
                JobRole.experience_required.ilike("%0%"),
                JobRole.experience_required.ilike("%1%"),
                JobRole.experience_required.ilike("%2%"),
            ))
        elif exp == "3-5":
            roles_q = roles_q.filter(or_(
                JobRole.experience_required.in_(["3", "4", "5"]),
                JobRole.experience_required.ilike("%3%"),
                JobRole.experience_required.ilike("%4%"),
                JobRole.experience_required.ilike("%5%"),
            ))
        elif exp == "6-8":
            roles_q = roles_q.filter(or_(
                JobRole.experience_required.in_(["6", "7", "8"]),
                JobRole.experience_required.ilike("%6%"),
                JobRole.experience_required.ilike("%7%"),
                JobRole.experience_required.ilike("%8%"),
            ))
        elif exp == "8+":
            roles_q = roles_q.filter(or_(
                JobRole.experience_required.in_(["8", "9", "10", "11", "12"]),
                JobRole.experience_required.ilike("%8%"),
                JobRole.experience_required.ilike("%9%"),
                JobRole.experience_required.ilike("%10%"),
            ))

    roles = roles_q.all()
    role_ids = [r.id for r in roles]

    # 3. Retrieve historical status change and hiring logs for applications
    app_hire_dates: dict[int, datetime] = {}
    if role_ids:
        # Check ActivityLog for exact timestamp when candidate was selected or joined
        logs = (
            db.query(ActivityLog)
            .join(JobApplication, ActivityLog.application_id == JobApplication.id)
            .filter(
                JobApplication.job_role_id.in_(role_ids),
                ActivityLog.new_status.in_(["selected", "joined"]),
            )
            .order_by(ActivityLog.created_at.asc())
            .all()
        )
        for log in logs:
            if log.application_id not in app_hire_dates:
                app_hire_dates[log.application_id] = log.created_at

    # Query all filled applications for these roles
    role_hire_dates: dict[int, list[datetime]] = {}
    if role_ids:
        filled_apps = (
            db.query(JobApplication)
            .filter(
                JobApplication.job_role_id.in_(role_ids),
                JobApplication.status.in_(["selected", "joined"]),
            )
            .all()
        )
        for app in filled_apps:
            h_dt = app_hire_dates.get(app.id) or app.completion_date or app.status_date or app.created_at
            if h_dt:
                if h_dt.tzinfo is None:
                    h_dt = h_dt.replace(tzinfo=timezone.utc)
                role_hire_dates.setdefault(app.job_role_id, []).append(h_dt)

    # Sort each role's hire timestamps chronologically
    for r_id in role_hire_dates:
        role_hire_dates[r_id].sort()

    # 4. Determine closed_at and lost_at timestamps for distinct roles
    role_closed_at: dict[int, datetime] = {}
    role_lost_at: dict[int, datetime] = {}

    for r in roles:
        req = r.positions_required or 1
        st = (r.status or "").lower()
        hires = role_hire_dates.get(r.id, [])

        # Position is confirmed closed if filled candidates reached positions_required
        if len(hires) >= req and req > 0:
            role_closed_at[r.id] = hires[req - 1]
        elif st == "closed":
            c_dt = r.created_at
            if c_dt.tzinfo is None:
                c_dt = c_dt.replace(tzinfo=timezone.utc)
            role_closed_at[r.id] = c_dt
        elif st in ["loss", "lost", "cancelled", "abandoned"]:
            l_dt = r.created_at
            if l_dt.tzinfo is None:
                l_dt = l_dt.replace(tzinfo=timezone.utc)
            role_lost_at[r.id] = l_dt

    status_filter = (position_status or "").strip().lower()

    # 5. Calculate monthly trends for each requested month
    trends: list[MonthlyRecruitmentTrendItem] = []
    for curr_y, curr_m in month_list:
        last_day = calendar.monthrange(curr_y, curr_m)[1]
        start_dt = datetime(curr_y, curr_m, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(curr_y, curr_m, last_day, 23, 59, 59, tzinfo=timezone.utc)

        active_count = 0
        closed_count = 0
        lost_count = 0

        for r in roles:
            r_created = r.created_at
            if r_created.tzinfo is None:
                r_created = r_created.replace(tzinfo=timezone.utc)

            c_dt = role_closed_at.get(r.id)
            l_dt = role_lost_at.get(r.id)
            req = r.positions_required or 1

            # Positions confirmed closed in this month
            if c_dt and start_dt <= c_dt <= end_dt:
                if status_filter in ["", "all", "closed", "close"]:
                    closed_count += req

            # Positions marked as lost/cancelled in this month
            if l_dt and start_dt <= l_dt <= end_dt:
                if status_filter in ["", "all", "loss", "lost"]:
                    lost_count += req

            # Positions actively being recruited for at the end of this month
            if r_created <= end_dt:
                was_closed = c_dt is not None and c_dt <= end_dt
                was_lost = l_dt is not None and l_dt <= end_dt
                is_on_hold = (r.status or "").lower() in ["on_hold", "on-hold"]
                if not was_closed and not was_lost and not is_on_hold:
                    if status_filter in ["", "all", "open", "active"]:
                        hires_by_then = len([h for h in role_hire_dates.get(r.id, []) if h <= end_dt])
                        remaining = max(0, req - hires_by_then)
                        active_count += remaining

        m_name = calendar.month_abbr[curr_m]

        trends.append(
            MonthlyRecruitmentTrendItem(
                month=m_name,
                full_month=f"{calendar.month_name[curr_m]} {curr_y}",
                year=curr_y,
                month_num=curr_m,
                active_positions=active_count,
                closed_positions=closed_count,
                lost_positions=lost_count,
                open_positions=active_count,
                hired=closed_count,
                new_openings=0,
            )
        )

    return trends


@router.get(
    "/filter-options",
    response_model=RecruitmentFilterOptionsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_recruitment_filter_options(db: Session = Depends(get_db)) -> RecruitmentFilterOptionsResponse:
    departments = [
        d[0]
        for d in db.query(JobRole.department)
        .filter(JobRole.department.isnot(None), JobRole.department != "")
        .distinct()
        .order_by(JobRole.department)
        .all()
        if d[0]
    ]

    positions = [
        p[0]
        for p in db.query(JobRole.title)
        .filter(JobRole.title.isnot(None), JobRole.title != "")
        .distinct()
        .order_by(JobRole.title)
        .all()
        if p[0]
    ]

    recruiters = [
        RecruiterOptionItem(id=u.id, name=u.name)
        for u in db.query(User).filter(User.is_active == True).order_by(User.name).all()
    ]

    position_statuses = [
        s[0]
        for s in db.query(JobRole.status)
        .filter(JobRole.status.isnot(None), JobRole.status != "")
        .distinct()
        .order_by(JobRole.status)
        .all()
        if s[0]
    ]

    sources_candidates = [
        s[0]
        for s in db.query(Candidate.source)
        .filter(Candidate.source.isnot(None), Candidate.source != "")
        .distinct()
        .all()
        if s[0]
    ]
    sources_apps = [
        s[0]
        for s in db.query(JobApplication.source)
        .filter(JobApplication.source.isnot(None), JobApplication.source != "")
        .distinct()
        .all()
        if s[0]
    ]
    candidate_sources = sorted(list(set(sources_candidates + sources_apps + ["direct", "vendor"])))

    locations = [
        loc[0]
        for loc in db.query(JobRole.location)
        .filter(JobRole.location.isnot(None), JobRole.location != "")
        .distinct()
        .order_by(JobRole.location)
        .all()
        if loc[0]
    ]

    time_periods = [
        FilterOptionItem(label="Last 30 Days", value="last_30_days"),
        FilterOptionItem(label="Last 3 Months", value="last_3_months"),
        FilterOptionItem(label="Last 6 Months", value="last_6_months"),
        FilterOptionItem(label="Last 9 Months", value="last_9_months"),
        FilterOptionItem(label="Last 12 Months", value="last_12_months"),
        FilterOptionItem(label="All Time", value="all_time"),
        FilterOptionItem(label="Custom Range", value="custom"),
    ]

    experience_levels = [
        FilterOptionItem(label="0 - 2 Years (Entry)", value="0-2"),
        FilterOptionItem(label="3 - 5 Years (Mid)", value="3-5"),
        FilterOptionItem(label="6 - 8 Years (Senior)", value="6-8"),
        FilterOptionItem(label="8+ Years (Lead / Exec)", value="8+"),
    ]

    vacancy_ages = [
        FilterOptionItem(label="< 30 Days", value="0-30"),
        FilterOptionItem(label="30 - 60 Days", value="30-60"),
        FilterOptionItem(label="60 - 90 Days", value="60-90"),
        FilterOptionItem(label="90+ Days", value="90+"),
    ]

    return RecruitmentFilterOptionsResponse(
        time_periods=time_periods,
        departments=departments,
        positions=positions,
        recruiters=recruiters,
        position_statuses=position_statuses,
        candidate_sources=candidate_sources,
        locations=locations,
        experience_levels=experience_levels,
        vacancy_ages=vacancy_ages,
    )


@router.get(
    "/monthly-trends",
    response_model=list[MonthlyRecruitmentTrendItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_monthly_recruitment_trends(
    months: int | None = None,
    time_period: str = "last_6_months",
    start_date: str | None = None,
    end_date: str | None = None,
    department: str | None = None,
    position: str | None = None,
    recruiter_id: int | None = None,
    position_status: str | None = None,
    candidate_source: str | None = None,
    job_location: str | None = None,
    experience_level: str | None = None,
    vacancy_age: str | None = None,
    db: Session = Depends(get_db),
) -> list[MonthlyRecruitmentTrendItem]:
    return calculate_monthly_recruitment_trends(
        db,
        months=months,
        time_period=time_period,
        start_date=start_date,
        end_date=end_date,
        department=department,
        position=position,
        recruiter_id=recruiter_id,
        position_status=position_status,
        candidate_source=candidate_source,
        job_location=job_location,
        experience_level=experience_level,
        vacancy_age=vacancy_age,
    )





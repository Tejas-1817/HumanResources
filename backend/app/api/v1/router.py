
from fastapi import APIRouter
from app.api.v1.endpoints.applications import router as applications_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.candidates import router as candidates_router
from app.api.v1.endpoints.companies import router as companies_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.job_applications import router as job_applications_router
from app.api.v1.endpoints.job_roles import router as job_roles_router
from app.api.v1.endpoints.upload import router as upload_router
from app.api.v1.endpoints.vendors import router as vendors_router
from app.api.v1.endpoints.vendor_portal import router as vendor_portal_router
from app.api.v1.endpoints.vendor_assignments import router as vendor_assignments_router
from app.api.v1.endpoints.interviewers import router as interviewers_router
from app.api.v1.endpoints.interview_schedules import router as interview_schedules_router
from app.api.v1.endpoints.interviewer_portal import router as interviewer_portal_router
from app.api.v1.endpoints.notifications import router as notifications_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(companies_router)
api_router.include_router(job_roles_router)
api_router.include_router(upload_router)
api_router.include_router(candidates_router)
api_router.include_router(job_applications_router)
api_router.include_router(applications_router)
api_router.include_router(dashboard_router)
api_router.include_router(vendors_router)
api_router.include_router(vendor_portal_router)
api_router.include_router(vendor_assignments_router)
api_router.include_router(interviewers_router)
api_router.include_router(interview_schedules_router)
api_router.include_router(interviewer_portal_router)
api_router.include_router(notifications_router)

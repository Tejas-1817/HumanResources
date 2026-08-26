from pathlib import Path
import io
import docx
import pdfplumber
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.job_role import (
    JobRoleCreate,
    JobRoleDetailResponse,
    JobRoleResponse,
    JobRoleUpdate,
)
from app.services.job_role_service import JobRoleService

router = APIRouter(prefix="/job-roles", tags=["Job Roles"])


def clean_extracted_text(text: str) -> str:
    """Clean CID codes (like (cid:127)), weird bullet symbols, and extra whitespaces from extracted text."""
    if not text:
        return ""
    import re
    # 1. Replace CID codes (e.g. (cid:127), (cid:1)) with clean standard bullets
    cleaned = re.sub(r'\(cid:\s*0\)', '', text)
    cleaned = re.sub(r'\(cid:\s*\d+\)', '• ', cleaned)

    # 2. Normalize non-standard Unicode / font bullets (Wingdings, Dingbats, bullet variants)
    cleaned = re.sub(r'[\u2022\u2023\u25E6\u2043\u2219\u25CB\u25CF\u25AA\u25AB\uF0B7\uF0A7\uF0A8\uF0D8]', '• ', cleaned)

    # 3. Clean non-breaking spaces and normalize newlines
    cleaned = cleaned.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')

    # 4. Standardize spacing after bullet points
    cleaned = re.sub(r'•\s+', '• ', cleaned)

    # 5. Remove excessive consecutive blank lines (max 2)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # 6. Trim leading and trailing whitespace on each line
    lines = [line.strip() for line in cleaned.split('\n')]
    return '\n'.join(lines).strip()


@router.post("/extract-jd")
async def extract_jd_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Extract readable text from an uploaded Job Description (PDF, DOCX, TXT)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    extracted_text = ""
    if ext == ".pdf":
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                chunks = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        chunks.append(page_text)
                extracted_text = "\n\n".join(chunks).strip()
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to extract text from PDF: {str(e)}")
    elif ext in [".docx", ".doc"]:
        try:
            doc = docx.Document(io.BytesIO(content))
            extracted_text = "\n".join(p.text for p in doc.paragraphs if p.text).strip()
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to extract text from Word document: {str(e)}")
    elif ext in [".txt", ".md", ".rtf"]:
        try:
            extracted_text = content.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to read text file: {str(e)}")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a PDF, DOCX, or TXT document."
        )

    # Clean CID artifacts, bullets, and spacing
    cleaned_text = clean_extracted_text(extracted_text)

    if not cleaned_text:
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the uploaded document."
        )

    return {
        "filename": file.filename,
        "text": cleaned_text,
    }


@router.post("", response_model=JobRoleResponse, status_code=status.HTTP_201_CREATED)
def create_job_role(
    payload: JobRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> JobRoleResponse:
    role = JobRoleService.create(db, payload, created_by=current_user.id)
    return JobRoleResponse.model_validate(role)


@router.get(
    "",
    response_model=list[JobRoleResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_job_roles(
    company_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[JobRoleResponse]:
    roles = JobRoleService.get_all(
        db,
        company_id=company_id,
        status=status_filter,
        search=search,
    )
    return [JobRoleResponse.model_validate(role) for role in roles]


@router.get(
    "/{role_id}",
    response_model=JobRoleDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_job_role(role_id: int, db: Session = Depends(get_db)) -> JobRoleDetailResponse:
    role = JobRoleService.get_by_id(db, role_id)
    return JobRoleDetailResponse(
        id=role.id,
        company_id=role.company_id,
        title=role.title,
        description=role.description,
        status=role.status,
        deadline=role.deadline,
        pipeline_stages=role.pipeline_stages,
        estimated_budget=role.estimated_budget,
        currency=role.currency,
        positions_required=role.positions_required,
        location=role.location,
        work_mode=role.work_mode,
        experience_required=role.experience_required,
        project_time_period=role.project_time_period,
        created_by=role.created_by,
        created_at=role.created_at,
        company_name=role.company.name,
    )


@router.patch(
    "/{role_id}",
    response_model=JobRoleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr", "recruiter", "manager"))],
)
def update_job_role(
    role_id: int,
    payload: JobRoleUpdate,
    db: Session = Depends(get_db),
) -> JobRoleResponse:
    role = JobRoleService.update(db, role_id, payload)
    return JobRoleResponse.model_validate(role)


@router.patch(
    "/{role_id}/close",
    response_model=JobRoleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def close_job_role(role_id: int, db: Session = Depends(get_db)) -> JobRoleResponse:
    """Convenience endpoint to close a job role (sets status to 'closed')."""
    role = JobRoleService.close_role(db, role_id)
    return JobRoleResponse.model_validate(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> None:
    JobRoleService.delete(db, role_id)


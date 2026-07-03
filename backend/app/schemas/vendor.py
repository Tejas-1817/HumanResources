from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class VendorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    company_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    is_active: bool = True

class VendorCreate(VendorBase):
    password: str = Field(..., min_length=6, max_length=128)

class VendorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[str] = Field(None, min_length=3, max_length=255)
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)

class VendorResponse(VendorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VendorJobAssignmentBase(BaseModel):
    vendor_id: int
    job_role_id: int

class VendorJobAssignmentCreate(VendorJobAssignmentBase):
    pass

class VendorJobAssignmentResponse(VendorJobAssignmentBase):
    id: int
    assigned_at: datetime
    assigned_by_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)

class VendorLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

class VendorAuthResponse(BaseModel):
    id: int
    name: str
    email: str
    company_name: str
    role: str = "vendor"

    model_config = ConfigDict(from_attributes=True)

from typing import Any, List, Optional

class VendorTokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    vendor: Optional[VendorAuthResponse] = None
    user: Optional[Any] = None

class VendorStats(BaseModel):
    jobs_assigned: int
    resumes_submitted: int
    candidates_in_pipeline: int
    candidates_selected: int

class VendorPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)

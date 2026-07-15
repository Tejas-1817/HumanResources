from datetime import datetime

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="hr")


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    company_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VendorLoginResponse(BaseModel):
    id: int
    name: str
    email: str
    company_name: str
    role: str = "vendor"

    model_config = ConfigDict(from_attributes=True)


class InterviewerLoginResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    role: str = "interviewer"

    model_config = ConfigDict(from_attributes=True)


from typing import Any, Optional

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user: Optional[AuthUserResponse] = None
    vendor: Optional[VendorLoginResponse] = None
    interviewer: Optional[InterviewerLoginResponse] = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class UserUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None



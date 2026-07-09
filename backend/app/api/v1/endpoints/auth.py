from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import AuthUserResponse, LoginRequest, RegisterRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, UserUpdatePayload
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthUserResponse:
    user = AuthService.register(
        db=db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
    )
    return AuthUserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    result = AuthService.login(
        db=db,
        email=payload.email,
        password=payload.password,
    )
    return TokenResponse.model_validate(result)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from app.core.config import settings
    token, email_sent, is_vendor = AuthService.request_password_reset(db=db, email=payload.email)
    response: dict = {"message": "Password reset instructions sent", "email_sent": email_sent}
    # Expose the reset link in the response when SMTP is not configured or in debug mode (development fallback)
    # But do not expose the reset link for vendors
    if not is_vendor and (not email_sent or settings.debug):
        response["reset_link"] = f"/reset-password/{token}"
    return response



@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db=db, token=payload.token, new_password=payload.new_password)
    return {"message": "Password has been reset successfully"}


@router.get("/me", response_model=AuthUserResponse, status_code=status.HTTP_200_OK)
def me(current_user: User = Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse.model_validate(current_user)


@router.patch("/me", response_model=AuthUserResponse, status_code=status.HTTP_200_OK)
def update_me(
    payload: UserUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> AuthUserResponse:
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = payload.email
    if payload.password is not None and payload.password:
        from app.core.security import get_password_hash
        current_user.hashed_password = get_password_hash(payload.password)
    db.commit()
    db.refresh(current_user)
    return AuthUserResponse.model_validate(current_user)

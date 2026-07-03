from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, ExpiredSignatureError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.database.session import get_db
from app.models.user import User
from app.models.vendor import Vendor


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_value, algorithm=settings.jwt_algorithm_value)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_value, algorithms=[settings.jwt_algorithm_value])
        if not payload.get("sub"):
            raise UnauthorizedException(message="Invalid token", detail="Missing subject")
        return payload
    except ExpiredSignatureError as exc:
        raise UnauthorizedException(message="Token expired") from exc
    except JWTError as exc:
        raise UnauthorizedException(message="Invalid token") from exc


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Any:
    payload = decode_access_token(token)
    email = payload.get("sub")
    role = payload.get("role")
    
    if role and role == "vendor":
        raise ForbiddenException(message="Forbidden", detail="HR access required")

    if role and role == "interviewer":
        from app.models.interviewer import Interviewer
        interviewer = db.query(Interviewer).filter(Interviewer.email == email).first()
        if interviewer is None:
            raise UnauthorizedException(message="Unauthorized", detail="Interviewer not found")
        return interviewer

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise UnauthorizedException(message="Unauthorized", detail="User not found")
    if not user.is_active:
        raise UnauthorizedException(message="Unauthorized", detail="User is inactive")
    return user


def get_current_vendor(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Vendor:
    payload = decode_access_token(token)
    email = payload.get("sub")
    role = payload.get("role")
    
    if role != "vendor":
        raise ForbiddenException(message="Forbidden", detail="Vendor access required")

    vendor = db.query(Vendor).filter(Vendor.email == email).first()
    if vendor is None:
        raise UnauthorizedException(message="Unauthorized", detail="Vendor not found")
    if not vendor.is_active:
        raise UnauthorizedException(message="Unauthorized", detail="Vendor is inactive")
    return vendor


def get_current_interviewer(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(token)
    email = payload.get("sub")
    role = payload.get("role")
    
    if role != "interviewer":
        raise ForbiddenException(message="Forbidden", detail="Interviewer access required")

    from app.models.interviewer import Interviewer
    interviewer = db.query(Interviewer).filter(Interviewer.email == email).first()
    if interviewer is None:
        raise UnauthorizedException(message="Unauthorized", detail="Interviewer not found")
    return interviewer


def require_role(*roles: str):
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        allowed = {role.strip().lower() for role in roles}
        if current_user.role.lower() not in allowed:
            raise ForbiddenException(
                message="Forbidden",
                detail=f"Required role: {', '.join(sorted(allowed))}",
            )
        return current_user

    return role_dependency

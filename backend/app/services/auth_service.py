import secrets
from typing import Any
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import DuplicateException, UnauthorizedException, NotFoundException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


class AuthService:
    VALID_ROLES = {"admin", "hr", "viewer"}

    @staticmethod
    def register(
        db: Session,
        name: str,
        email: str,
        password: str,
        role: str = "hr",
    ) -> Any:
        from app.models.vendor import Vendor
        processed_email = email.lower().strip()
        
        # Check both tables for existing email
        existing_user = db.query(User).filter(User.email == processed_email).first()
        existing_vendor = db.query(Vendor).filter(Vendor.email == processed_email).first()
        
        if existing_user is not None or existing_vendor is not None:
            raise DuplicateException(message="Email already registered")

        normalized_role = role.strip().lower()
        
        if normalized_role == "vendor":
            vendor = Vendor(
                name=name.strip(),
                email=processed_email,
                hashed_password=hash_password(password),
                company_name=name.strip(), # Use name as company_name for self-signup
                is_active=True
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)
            return vendor
        else:
            if normalized_role not in AuthService.VALID_ROLES:
                normalized_role = "hr"
            user = User(
                name=name.strip(),
                email=processed_email,
                hashed_password=hash_password(password),
                role=normalized_role,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        processed_email = email.lower().strip()
        
        # 1. Try HR User
        user = db.query(User).filter(User.email == processed_email).first()
        if user:
            if not verify_password(password, user.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            if not user.is_active:
                raise UnauthorizedException(message="User is inactive")
            
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user,
                "role": user.role
            }

        # 2. Try Vendor
        from app.models.vendor import Vendor
        vendor = db.query(Vendor).filter(Vendor.email == processed_email).first()
        if vendor:
            if not verify_password(password, vendor.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            if not vendor.is_active:
                raise UnauthorizedException(message="Vendor account is inactive")
            
            access_token = create_access_token(
                data={"sub": vendor.email, "role": "vendor", "vendor_id": vendor.id},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "vendor": vendor,
                "role": "vendor"
            }

        # 3. Try Interviewer
        from app.models.interviewer import Interviewer
        interviewer = db.query(Interviewer).filter(Interviewer.email == processed_email).first()
        if interviewer:
            if not verify_password(password, interviewer.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            
            access_token = create_access_token(
                data={"sub": interviewer.email, "role": "interviewer", "interviewer_id": interviewer.id},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "interviewer": interviewer,
                "role": "interviewer"
            }

        raise UnauthorizedException(message="Invalid credentials")

    @staticmethod
    def request_password_reset(db: Session, email: str) -> tuple[str, bool, bool]:
        from app.models.vendor import Vendor
        from app.models.interviewer import Interviewer
        from app.services.email_service import send_password_reset_email

        processed_email = email.lower().strip()
        print(f"DEBUG: Requesting reset for '{processed_email}'")
        
        # Search User, Vendor, Interviewer
        target = db.query(User).filter(User.email == processed_email).first()
        is_vendor = False
        
        if target is None:
            target = db.query(Vendor).filter(Vendor.email == processed_email).first()
            if target is not None:
                is_vendor = True
        if target is None:
            target = db.query(Interviewer).filter(Interviewer.email == processed_email).first()
            
        if target is None:
            print(f"DEBUG: Account not found for '{processed_email}'")
            raise NotFoundException(message="User not found")

        token = secrets.token_urlsafe(32)
        target.reset_token = token
        target.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db.commit()
        
        reset_link = f"/reset-password/{token}"
        user_name = getattr(target, "name", "")
        
        # Attempt to send real email; fall back to console log if SMTP not configured
        email_sent = send_password_reset_email(
            to_email=processed_email,
            reset_link=reset_link,
            user_name=user_name,
        )
        
        if not email_sent:
            print(f"DEBUG: Password reset token for {email}: {token}")
            print(f"DEBUG: Reset link: http://localhost:5173{reset_link}")
        
        return token, email_sent, is_vendor

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> Any:
        from app.models.vendor import Vendor
        from app.models.interviewer import Interviewer

        # Search User, Vendor, Interviewer
        target = db.query(User).filter(User.reset_token == token).first()
        if target is None:
            target = db.query(Vendor).filter(Vendor.reset_token == token).first()
        if target is None:
            target = db.query(Interviewer).filter(Interviewer.reset_token == token).first()
            
        if target is None:
            raise UnauthorizedException(message="Invalid or expired token")
            
        expires = target.reset_token_expires
        if expires is not None and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
            
        if expires is None or expires < datetime.now(timezone.utc):
            raise UnauthorizedException(message="Token has expired")
            
        target.hashed_password = hash_password(new_password)
        target.reset_token = None
        target.reset_token_expires = None
        
        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def change_interviewer_password(db: Session, interviewer_id: int, current_pwd: str, new_pwd: str):
        from app.models.interviewer import Interviewer
        interviewer = db.query(Interviewer).filter(Interviewer.id == interviewer_id).first()
        if interviewer is None:
            raise NotFoundException(message="Interviewer not found")
        if not verify_password(current_pwd, interviewer.hashed_password):
            raise UnauthorizedException(message="Current password incorrect")
        interviewer.hashed_password = hash_password(new_pwd)
        db.commit()


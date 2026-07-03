from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import oauth2_scheme, decode_access_token
from app.core.exceptions import NotFoundException, UnauthorizedException
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_current_actor(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> dict:
    payload = decode_access_token(token)
    email = payload.get("sub")
    role = payload.get("role")

    if role == "vendor":
        from app.models.vendor import Vendor
        vendor = db.query(Vendor).filter(Vendor.email == email).first()
        if not vendor or not vendor.is_active:
            raise UnauthorizedException(message="Vendor not found or inactive")
        return {"role": "vendor", "id": vendor.id}
    elif role == "interviewer":
        from app.models.interviewer import Interviewer
        interviewer = db.query(Interviewer).filter(Interviewer.email == email).first()
        if not interviewer:
            raise UnauthorizedException(message="Interviewer not found")
        return {"role": "interviewer", "id": interviewer.id}
    else:
        from app.models.user import User
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            raise UnauthorizedException(message="User not found or inactive")
        # Admin or HR role
        return {"role": "admin", "id": None}


@router.get("", response_model=List[NotificationResponse], status_code=status.HTTP_200_OK)
def get_notifications(
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
) -> List[Notification]:
    query = db.query(Notification)
    if actor["role"] == "admin":
        query = query.filter(Notification.recipient_role == "admin")
    else:
        query = query.filter(
            Notification.recipient_role == actor["role"],
            Notification.recipient_id == actor["id"]
        )
    return query.order_by(Notification.created_at.desc()).all()


@router.put("/{notification_id}/read", response_model=NotificationResponse, status_code=status.HTTP_200_OK)
def mark_as_read(
    notification_id: int,
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
) -> Notification:
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise NotFoundException(message="Notification not found")

    # Authorize: ensure notification matches recipient role and ID
    if notification.recipient_role != actor["role"]:
        raise UnauthorizedException(message="Access denied to notification")
    if actor["role"] != "admin" and notification.recipient_id != actor["id"]:
        raise UnauthorizedException(message="Access denied to notification")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_as_read(
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.is_read == False)
    if actor["role"] == "admin":
        query = query.filter(Notification.recipient_role == "admin")
    else:
        query = query.filter(
            Notification.recipient_role == actor["role"],
            Notification.recipient_id == actor["id"]
        )
    
    unread = query.all()
    for notification in unread:
        notification.is_read = True
    
    db.commit()
    return {"success": True, "message": "All notifications marked as read"}

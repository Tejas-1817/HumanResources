import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str, user_name: str = "") -> bool:
    """
    Send a password reset email.
    Returns True if sent successfully, False otherwise.
    If SMTP credentials are not configured, logs a warning and returns False.
    """
    smtp_user = settings.smtp_user.strip()
    smtp_password = settings.smtp_password.strip()
    from_email = settings.smtp_from_email.strip() or smtp_user

    if not smtp_user or not smtp_password:
        logger.warning(
            "SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD in .env to enable email sending."
        )
        return False

    subject = "Reset Your Altzor HR Password"
    full_reset_url = f"{settings.frontend_url}{reset_link}"

    greeting = f"Hi {user_name}," if user_name else "Hi,"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
    .container {{ max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; text-align: center; }}
    .header h1 {{ color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }}
    .body {{ padding: 36px 40px; }}
    .body p {{ color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }}
    .btn {{ display: inline-block; margin: 20px 0; padding: 14px 32px; background: #6366f1; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }}
    .link-fallback {{ font-size: 12px; color: #9ca3af; word-break: break-all; margin-top: 12px; }}
    .footer {{ padding: 20px 40px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Password Reset Request</h1>
    </div>
    <div class="body">
      <p>{greeting}</p>
      <p>We received a request to reset the password for your <strong>Altzor HR</strong> account associated with this email address.</p>
      <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
      <p style="text-align:center;">
        <a href="{full_reset_url}" class="btn">Reset My Password</a>
      </p>
      <p class="link-fallback">If the button above doesn't work, copy and paste this link into your browser:<br>{full_reset_url}</p>
      <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>
    </div>
    <div class="footer">
      &copy; 2025 Altzor Digital Solutions. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

    text_body = (
        f"{greeting}\n\n"
        f"We received a request to reset your Altzor HR password.\n\n"
        f"Click here to reset it (valid for 1 hour):\n{full_reset_url}\n\n"
        f"If you did not request this, ignore this email.\n\n"
        f"— Altzor HR Team"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{from_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info(f"Password reset email sent successfully to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD in .env. "
            "For Gmail, use an App Password (not your regular password)."
        )
        return False
    except smtplib.SMTPException as exc:
        logger.error(f"SMTP error while sending password reset email to {to_email}: {exc}")
        return False
    except Exception as exc:
        logger.error(f"Unexpected error sending email to {to_email}: {exc}")
        return False

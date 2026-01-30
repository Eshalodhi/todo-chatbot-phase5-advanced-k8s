"""
Email notification sender using aiosmtplib.

Handles sending reminder notifications with retry logic.
Per specs/phase5/research.md.
"""

import logging
import asyncio
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import (
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_FROM_EMAIL, MAX_RETRY_ATTEMPTS,
)

logger = logging.getLogger(__name__)

# Retry backoff schedule (seconds): 1min, 5min, 15min
RETRY_BACKOFF_SECONDS = [60, 300, 900]


async def send_email(
    to_email: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send an email notification.

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body text

    Returns:
        True if sent successfully
    """
    if not SMTP_HOST:
        logger.warning("SMTP not configured, skipping email send")
        return False

    try:
        import aiosmtplib

        message = MIMEMultipart()
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))

        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER if SMTP_USER else None,
            password=SMTP_PASS if SMTP_PASS else None,
            use_tls=True,
        )

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
        return False


async def send_notification(
    user_id: str,
    subject: str,
    body: str,
    user_email: Optional[str] = None,
) -> bool:
    """
    Send a notification to a user with retry logic.

    Uses exponential backoff: 1min, 5min, 15min.

    Args:
        user_id: User to notify
        subject: Notification subject
        body: Notification body
        user_email: Optional email (if not provided, would look up from DB)

    Returns:
        True if sent successfully
    """
    if not user_email:
        # In production, look up user email from database
        logger.warning(f"No email for user {user_id}, skipping notification")
        return False

    for attempt in range(MAX_RETRY_ATTEMPTS):
        success = await send_email(user_email, subject, body)

        if success:
            logger.info(f"Notification sent to user {user_id} on attempt {attempt + 1}")
            return True

        # Apply backoff
        if attempt < len(RETRY_BACKOFF_SECONDS):
            backoff = RETRY_BACKOFF_SECONDS[attempt]
            logger.warning(
                f"Notification attempt {attempt + 1} failed for user {user_id}, "
                f"retrying in {backoff}s"
            )
            await asyncio.sleep(backoff)

    logger.error(
        f"All {MAX_RETRY_ATTEMPTS} notification attempts failed for user {user_id}"
    )
    return False

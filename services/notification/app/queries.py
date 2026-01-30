"""
Database queries for pending reminders.

Per specs/phase5/data-model.md.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def get_pending_reminders(now: datetime) -> list[dict]:
    """
    Query for reminders that are due and haven't been sent.

    Args:
        now: Current UTC time

    Returns:
        List of reminder dicts with id, task_id, user_id, remind_at
    """
    # In production, this would query the database directly
    # For now, return empty list as placeholder
    # The actual query would be:
    # SELECT r.*, t.title as task_title
    # FROM reminders r
    # JOIN tasks t ON r.task_id = t.id
    # WHERE r.sent = false
    #   AND r.remind_at <= :now
    #   AND r.retry_count < 3
    # ORDER BY r.remind_at ASC
    logger.debug(f"Querying pending reminders due before {now.isoformat()}")
    return []

"""
Date calculator for recurring task next occurrence.

Handles daily, weekly, and monthly recurrence patterns
with edge case handling for month-end dates.
Per specs/phase5/research.md.
"""

import logging
import calendar
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


def calculate_next_occurrence(
    current_due_date: datetime | None,
    recurrence_pattern: str,
    completed_at: datetime | None = None,
) -> datetime:
    """
    Calculate the next occurrence date based on the recurrence pattern.

    Args:
        current_due_date: The current task's due date (if any)
        recurrence_pattern: One of "daily", "weekly", "monthly"
        completed_at: When the task was completed (fallback if no due date)

    Returns:
        Next occurrence datetime

    Raises:
        ValueError: If recurrence_pattern is invalid
    """
    # Use due date as base, fall back to completed_at, then now
    base_date = current_due_date or completed_at or datetime.now(timezone.utc)

    if recurrence_pattern == "daily":
        return base_date + timedelta(days=1)

    elif recurrence_pattern == "weekly":
        return base_date + timedelta(weeks=1)

    elif recurrence_pattern == "monthly":
        return _add_months(base_date, 1)

    else:
        raise ValueError(f"Invalid recurrence pattern: {recurrence_pattern}")


def _add_months(dt: datetime, months: int) -> datetime:
    """
    Add months to a datetime, handling month-end edge cases.

    For example:
    - Jan 31 + 1 month = Feb 28/29 (last day of Feb)
    - Mar 31 + 1 month = Apr 30 (last day of Apr)

    Args:
        dt: Base datetime
        months: Number of months to add

    Returns:
        New datetime with months added
    """
    month = dt.month + months
    year = dt.year + (month - 1) // 12
    month = (month - 1) % 12 + 1

    # Handle month-end edge case (e.g., Jan 31 → Feb 28)
    max_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, max_day)

    return dt.replace(year=year, month=month, day=day)

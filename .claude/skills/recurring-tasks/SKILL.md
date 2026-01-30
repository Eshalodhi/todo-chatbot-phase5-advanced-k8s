# Recurring Tasks Skill

## Purpose

Guide for implementing recurring task functionality in the Phase II Todo Chatbot application. Covers recurrence pattern definitions, date calculations, event-driven task creation, and handling of edge cases like month boundaries and timezone issues.

## Technology Stack

- **Python 3.11+** - Core implementation
- **python-dateutil** - Advanced date calculations
- **Pydantic** - Pattern validation
- **aiokafka** - Event consumption
- **SQLModel** - Database models
- **FastAPI** - API endpoints

---

## Project Structure

```
backend/
├── models/
│   ├── task.py                    # Task model with recurrence
│   └── recurrence.py              # Recurrence pattern model
├── services/
│   └── recurring/
│       ├── __init__.py
│       ├── patterns.py            # Recurrence pattern definitions
│       ├── calculator.py          # Next occurrence calculator
│       ├── service.py             # Recurring task service
│       └── consumer.py            # Event consumer
├── events/
│   └── schemas.py                 # Recurring task events
└── tests/
    └── test_recurring.py          # Recurrence tests
```

---

## Requirements

```txt
# requirements.txt - Add to existing
python-dateutil>=2.8.2
croniter>=2.0.0  # Optional: for cron-style patterns
pytz>=2024.1
```

---

## Recurrence Pattern Model

### Database Models

```python
# models/recurrence.py
from datetime import datetime, date, time
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, JSON, func, Index
from pydantic import field_validator


class RecurrenceFrequency(str, Enum):
    """Recurrence frequency types."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"  # For advanced patterns


class WeekDay(str, Enum):
    """Days of the week."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class MonthlyType(str, Enum):
    """Monthly recurrence type."""
    DAY_OF_MONTH = "day_of_month"  # e.g., 15th of every month
    DAY_OF_WEEK = "day_of_week"   # e.g., 2nd Tuesday of every month
    LAST_DAY = "last_day"          # Last day of month


class RecurrencePattern(SQLModel, table=True):
    """
    Recurrence pattern definition.

    Supports:
    - Daily: Every N days
    - Weekly: Every N weeks on specific days
    - Biweekly: Every 2 weeks on specific days
    - Monthly: Day of month or day of week
    - Yearly: Specific date each year
    """

    __tablename__ = "recurrence_pattern"
    __table_args__ = (
        Index("ix_recurrence_user_id", "user_id"),
        Index("ix_recurrence_active", "is_active"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)

    # Frequency settings
    frequency: RecurrenceFrequency
    interval: int = Field(default=1, ge=1, le=365)  # Every N periods

    # Weekly settings
    days_of_week: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSON),
    )  # ["monday", "wednesday", "friday"]

    # Monthly settings
    monthly_type: Optional[MonthlyType] = None
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    week_of_month: Optional[int] = Field(default=None, ge=1, le=5)  # 5 = last
    day_of_week_monthly: Optional[str] = None  # For "2nd Tuesday" patterns

    # Yearly settings
    month_of_year: Optional[int] = Field(default=None, ge=1, le=12)

    # Time settings
    preferred_time: Optional[time] = None  # Time of day for due date
    timezone: str = Field(default="UTC")

    # Bounds
    start_date: date
    end_date: Optional[date] = None  # None = no end
    max_occurrences: Optional[int] = None  # None = unlimited

    # State
    is_active: bool = Field(default=True)
    occurrence_count: int = Field(default=0)
    last_occurrence: Optional[datetime] = None
    next_occurrence: Optional[datetime] = None

    # Metadata
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    # Relationships
    tasks: List["Task"] = Relationship(back_populates="recurrence")

    @field_validator("days_of_week", mode="before")
    @classmethod
    def validate_days_of_week(cls, v):
        if v is None:
            return None
        valid_days = {d.value for d in WeekDay}
        for day in v:
            if day.lower() not in valid_days:
                raise ValueError(f"Invalid day: {day}")
        return [d.lower() for d in v]

    @field_validator("day_of_month", mode="before")
    @classmethod
    def validate_day_of_month(cls, v):
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Day of month must be between 1 and 31")
        return v


class Task(SQLModel, table=True):
    """Task model with recurrence support."""

    __tablename__ = "task"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str
    description: Optional[str] = None
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    priority: str = Field(default="medium")
    due_date: Optional[datetime] = None

    # Recurrence
    recurrence_id: Optional[int] = Field(
        default=None,
        foreign_key="recurrence_pattern.id",
    )
    is_recurring_instance: bool = Field(default=False)
    original_task_id: Optional[int] = None  # Links to parent recurring task

    # Relationships
    recurrence: Optional[RecurrencePattern] = Relationship(
        back_populates="tasks"
    )

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )
```

---

## Pattern Definitions

### Pattern Schema

```python
# services/recurring/patterns.py
from datetime import date, time, datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field, field_validator, model_validator
from models.recurrence import RecurrenceFrequency, WeekDay, MonthlyType


class DailyPattern(BaseModel):
    """Daily recurrence pattern."""
    frequency: RecurrenceFrequency = RecurrenceFrequency.DAILY
    interval: int = Field(default=1, ge=1, le=365, description="Every N days")

    class Config:
        json_schema_extra = {
            "examples": [
                {"frequency": "daily", "interval": 1},  # Every day
                {"frequency": "daily", "interval": 2},  # Every other day
                {"frequency": "daily", "interval": 7},  # Every week (alt)
            ]
        }


class WeeklyPattern(BaseModel):
    """Weekly recurrence pattern."""
    frequency: RecurrenceFrequency = RecurrenceFrequency.WEEKLY
    interval: int = Field(default=1, ge=1, le=52, description="Every N weeks")
    days_of_week: List[WeekDay] = Field(
        min_length=1,
        max_length=7,
        description="Days to recur on",
    )

    @field_validator("days_of_week", mode="before")
    @classmethod
    def normalize_days(cls, v):
        if isinstance(v, list):
            return [WeekDay(d.lower()) if isinstance(d, str) else d for d in v]
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "frequency": "weekly",
                    "interval": 1,
                    "days_of_week": ["monday", "wednesday", "friday"],
                },
                {
                    "frequency": "weekly",
                    "interval": 2,
                    "days_of_week": ["tuesday", "thursday"],
                },
            ]
        }


class MonthlyPattern(BaseModel):
    """Monthly recurrence pattern."""
    frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY
    interval: int = Field(default=1, ge=1, le=12, description="Every N months")
    monthly_type: MonthlyType

    # For DAY_OF_MONTH
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)

    # For DAY_OF_WEEK
    week_of_month: Optional[int] = Field(default=None, ge=1, le=5)  # 5 = last
    day_of_week: Optional[WeekDay] = None

    @model_validator(mode="after")
    def validate_monthly_fields(self):
        if self.monthly_type == MonthlyType.DAY_OF_MONTH:
            if self.day_of_month is None:
                raise ValueError("day_of_month required for DAY_OF_MONTH type")
        elif self.monthly_type == MonthlyType.DAY_OF_WEEK:
            if self.week_of_month is None or self.day_of_week is None:
                raise ValueError(
                    "week_of_month and day_of_week required for DAY_OF_WEEK type"
                )
        return self

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "frequency": "monthly",
                    "monthly_type": "day_of_month",
                    "day_of_month": 15,
                },  # 15th of every month
                {
                    "frequency": "monthly",
                    "monthly_type": "day_of_week",
                    "week_of_month": 2,
                    "day_of_week": "tuesday",
                },  # 2nd Tuesday
                {
                    "frequency": "monthly",
                    "monthly_type": "last_day",
                },  # Last day of month
            ]
        }


class YearlyPattern(BaseModel):
    """Yearly recurrence pattern."""
    frequency: RecurrenceFrequency = RecurrenceFrequency.YEARLY
    interval: int = Field(default=1, ge=1, le=10, description="Every N years")
    month_of_year: int = Field(ge=1, le=12)
    day_of_month: int = Field(ge=1, le=31)

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "frequency": "yearly",
                    "month_of_year": 12,
                    "day_of_month": 25,
                },  # Christmas
                {
                    "frequency": "yearly",
                    "month_of_year": 1,
                    "day_of_month": 1,
                },  # New Year
            ]
        }


class RecurrencePatternCreate(BaseModel):
    """Create recurrence pattern request."""
    pattern: Union[DailyPattern, WeeklyPattern, MonthlyPattern, YearlyPattern]
    start_date: date
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = Field(default=None, ge=1, le=1000)
    preferred_time: Optional[time] = None
    timezone: str = Field(default="UTC")

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be after start_date")
        return self
```

---

## Date Calculator

### Next Occurrence Calculator

```python
# services/recurring/calculator.py
from datetime import datetime, date, time, timedelta
from typing import Optional, List, Tuple
from dateutil.relativedelta import relativedelta, MO, TU, WE, TH, FR, SA, SU
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY
import calendar
import pytz

from models.recurrence import (
    RecurrencePattern,
    RecurrenceFrequency,
    MonthlyType,
    WeekDay,
)


# Weekday mapping for dateutil
WEEKDAY_MAP = {
    WeekDay.MONDAY: MO,
    WeekDay.TUESDAY: TU,
    WeekDay.WEDNESDAY: WE,
    WeekDay.THURSDAY: TH,
    WeekDay.FRIDAY: FR,
    WeekDay.SATURDAY: SA,
    WeekDay.SUNDAY: SU,
    "monday": MO,
    "tuesday": TU,
    "wednesday": WE,
    "thursday": TH,
    "friday": FR,
    "saturday": SA,
    "sunday": SU,
}

WEEKDAY_INT_MAP = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


class RecurrenceCalculator:
    """
    Calculates next occurrence dates for recurrence patterns.

    Handles:
    - All frequency types (daily, weekly, monthly, yearly)
    - Edge cases (month boundaries, leap years, DST)
    - Timezone conversions
    - Skip patterns
    """

    def calculate_next(
        self,
        pattern: RecurrencePattern,
        after: Optional[datetime] = None,
    ) -> Optional[datetime]:
        """
        Calculate the next occurrence after the given datetime.

        Args:
            pattern: The recurrence pattern
            after: Calculate occurrence after this datetime (default: now)

        Returns:
            Next occurrence datetime or None if pattern exhausted
        """
        if not pattern.is_active:
            return None

        # Default to now if not specified
        if after is None:
            after = datetime.now(pytz.UTC)

        # Convert to pattern timezone
        tz = pytz.timezone(pattern.timezone)
        if after.tzinfo is None:
            after = tz.localize(after)
        else:
            after = after.astimezone(tz)

        # Check if pattern has ended
        if pattern.end_date and after.date() > pattern.end_date:
            return None

        if pattern.max_occurrences and pattern.occurrence_count >= pattern.max_occurrences:
            return None

        # Calculate based on frequency
        next_date = self._calculate_next_date(pattern, after)

        if next_date is None:
            return None

        # Apply preferred time
        if pattern.preferred_time:
            next_date = next_date.replace(
                hour=pattern.preferred_time.hour,
                minute=pattern.preferred_time.minute,
                second=0,
                microsecond=0,
            )

        # Validate against end date
        if pattern.end_date and next_date.date() > pattern.end_date:
            return None

        return next_date

    def _calculate_next_date(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> Optional[datetime]:
        """Calculate next date based on frequency type."""
        if pattern.frequency == RecurrenceFrequency.DAILY:
            return self._next_daily(pattern, after)

        elif pattern.frequency == RecurrenceFrequency.WEEKLY:
            return self._next_weekly(pattern, after)

        elif pattern.frequency == RecurrenceFrequency.BIWEEKLY:
            return self._next_biweekly(pattern, after)

        elif pattern.frequency == RecurrenceFrequency.MONTHLY:
            return self._next_monthly(pattern, after)

        elif pattern.frequency == RecurrenceFrequency.YEARLY:
            return self._next_yearly(pattern, after)

        return None

    def _next_daily(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next daily occurrence."""
        # Start from the day after 'after'
        next_date = after + timedelta(days=1)
        next_date = next_date.replace(hour=0, minute=0, second=0, microsecond=0)

        if pattern.interval == 1:
            return next_date

        # Calculate based on start date and interval
        days_since_start = (next_date.date() - pattern.start_date).days
        days_until_next = pattern.interval - (days_since_start % pattern.interval)

        if days_until_next == pattern.interval:
            return next_date

        return next_date + timedelta(days=days_until_next)

    def _next_weekly(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next weekly occurrence."""
        if not pattern.days_of_week:
            # Default to same day as start date
            target_weekday = pattern.start_date.weekday()
            days_of_week = [target_weekday]
        else:
            days_of_week = [
                WEEKDAY_INT_MAP[d.lower()]
                for d in pattern.days_of_week
            ]

        # Start from the day after 'after'
        current = after + timedelta(days=1)
        current = current.replace(hour=0, minute=0, second=0, microsecond=0)

        # Calculate week number from start
        weeks_since_start = (current.date() - pattern.start_date).days // 7

        # Find the start of the current recurrence week
        current_week_start = pattern.start_date + timedelta(
            weeks=(weeks_since_start // pattern.interval) * pattern.interval
        )

        # Look for next valid day
        for _ in range(pattern.interval * 7 + 7):  # Max search
            if current.weekday() in days_of_week:
                # Check if we're in a valid week
                weeks_from_start = (current.date() - pattern.start_date).days // 7
                if weeks_from_start % pattern.interval == 0:
                    if current > after:
                        return current

            current += timedelta(days=1)

        return current

    def _next_biweekly(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next biweekly occurrence (every 2 weeks)."""
        # Treat as weekly with interval=2
        pattern_copy = pattern.model_copy()
        pattern_copy.frequency = RecurrenceFrequency.WEEKLY
        pattern_copy.interval = 2
        return self._next_weekly(pattern_copy, after)

    def _next_monthly(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next monthly occurrence."""
        if pattern.monthly_type == MonthlyType.DAY_OF_MONTH:
            return self._next_monthly_day_of_month(pattern, after)

        elif pattern.monthly_type == MonthlyType.DAY_OF_WEEK:
            return self._next_monthly_day_of_week(pattern, after)

        elif pattern.monthly_type == MonthlyType.LAST_DAY:
            return self._next_monthly_last_day(pattern, after)

        # Default to day of month from start date
        return self._next_monthly_day_of_month(pattern, after)

    def _next_monthly_day_of_month(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """
        Calculate next occurrence for day-of-month pattern.

        Handles edge cases like Feb 30 -> Feb 28/29.
        """
        target_day = pattern.day_of_month or pattern.start_date.day

        # Start from next month if we're past the target day
        current = after.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if after.day >= target_day:
            current += relativedelta(months=1)

        # Apply interval
        months_since_start = (
            (current.year - pattern.start_date.year) * 12 +
            (current.month - pattern.start_date.month)
        )
        months_to_add = pattern.interval - (months_since_start % pattern.interval)

        if months_to_add == pattern.interval and after.day < target_day:
            months_to_add = 0

        current += relativedelta(months=months_to_add)

        # Handle month overflow (e.g., Jan 31 -> Feb 28)
        max_day = calendar.monthrange(current.year, current.month)[1]
        actual_day = min(target_day, max_day)

        return current.replace(day=actual_day)

    def _next_monthly_day_of_week(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """
        Calculate next occurrence for Nth weekday pattern.

        E.g., "2nd Tuesday of every month"
        """
        target_weekday = WEEKDAY_INT_MAP.get(
            pattern.day_of_week_monthly.lower()
            if pattern.day_of_week_monthly
            else "monday"
        )
        week_of_month = pattern.week_of_month or 1

        # Start from current month
        current = after.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        for _ in range(24):  # Search up to 2 years
            # Find the Nth weekday of this month
            nth_weekday = self._get_nth_weekday_of_month(
                current.year,
                current.month,
                target_weekday,
                week_of_month,
            )

            if nth_weekday and nth_weekday > after.date():
                # Check interval
                months_since_start = (
                    (current.year - pattern.start_date.year) * 12 +
                    (current.month - pattern.start_date.month)
                )
                if months_since_start % pattern.interval == 0:
                    return datetime.combine(
                        nth_weekday,
                        time(0, 0),
                        tzinfo=pytz.timezone(pattern.timezone),
                    )

            current += relativedelta(months=1)

        raise ValueError("Could not calculate next occurrence")

    def _next_monthly_last_day(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next occurrence for last day of month."""
        current = after.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # If we haven't passed the last day of this month
        last_day = calendar.monthrange(current.year, current.month)[1]
        if after.day < last_day:
            # Check interval
            months_since_start = (
                (current.year - pattern.start_date.year) * 12 +
                (current.month - pattern.start_date.month)
            )
            if months_since_start % pattern.interval == 0:
                return current.replace(day=last_day)

        # Move to next valid month
        for _ in range(24):
            current += relativedelta(months=1)
            months_since_start = (
                (current.year - pattern.start_date.year) * 12 +
                (current.month - pattern.start_date.month)
            )
            if months_since_start % pattern.interval == 0:
                last_day = calendar.monthrange(current.year, current.month)[1]
                return current.replace(day=last_day)

        raise ValueError("Could not calculate next occurrence")

    def _next_yearly(
        self,
        pattern: RecurrencePattern,
        after: datetime,
    ) -> datetime:
        """Calculate next yearly occurrence."""
        target_month = pattern.month_of_year or pattern.start_date.month
        target_day = pattern.day_of_month or pattern.start_date.day

        # Create target date for this year
        try:
            target = after.replace(
                month=target_month,
                day=target_day,
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
        except ValueError:
            # Handle Feb 29 in non-leap year
            if target_month == 2 and target_day == 29:
                target = after.replace(
                    month=2,
                    day=28,
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
            else:
                raise

        # If we're past the date this year, go to next occurrence
        if target <= after:
            target += relativedelta(years=pattern.interval)

            # Handle leap year edge case
            if target_month == 2 and target_day == 29:
                if not calendar.isleap(target.year):
                    target = target.replace(day=28)

        return target

    def _get_nth_weekday_of_month(
        self,
        year: int,
        month: int,
        weekday: int,
        n: int,
    ) -> Optional[date]:
        """
        Get the Nth occurrence of a weekday in a month.

        Args:
            year: Year
            month: Month (1-12)
            weekday: Day of week (0=Monday, 6=Sunday)
            n: Which occurrence (1-5, 5=last)

        Returns:
            Date or None if not found
        """
        if n == 5:
            # Last occurrence
            return self._get_last_weekday_of_month(year, month, weekday)

        # Find first occurrence of weekday
        first_day = date(year, month, 1)
        days_until_weekday = (weekday - first_day.weekday()) % 7
        first_occurrence = first_day + timedelta(days=days_until_weekday)

        # Calculate Nth occurrence
        nth_occurrence = first_occurrence + timedelta(weeks=n - 1)

        # Verify it's still in the same month
        if nth_occurrence.month != month:
            return None

        return nth_occurrence

    def _get_last_weekday_of_month(
        self,
        year: int,
        month: int,
        weekday: int,
    ) -> date:
        """Get the last occurrence of a weekday in a month."""
        # Get last day of month
        last_day = date(year, month, calendar.monthrange(year, month)[1])

        # Find last occurrence
        days_since_weekday = (last_day.weekday() - weekday) % 7
        return last_day - timedelta(days=days_since_weekday)

    def calculate_occurrences(
        self,
        pattern: RecurrencePattern,
        start: datetime,
        end: datetime,
        max_count: int = 100,
    ) -> List[datetime]:
        """
        Calculate all occurrences between start and end dates.

        Useful for calendar views.
        """
        occurrences = []
        current = start - timedelta(days=1)  # Start before to include start date

        while len(occurrences) < max_count:
            next_occurrence = self.calculate_next(pattern, current)

            if next_occurrence is None:
                break

            if next_occurrence > end:
                break

            occurrences.append(next_occurrence)
            current = next_occurrence

        return occurrences


# Singleton instance
calculator = RecurrenceCalculator()
```

---

## Event Flow

### Event Schemas

```python
# events/recurring_schemas.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid

from events.schemas import BaseEvent, EventType


class RecurringTaskEventPayload(BaseModel):
    """Payload for recurring task events."""
    task_id: int
    recurrence_id: int
    title: str
    due_date: Optional[datetime] = None
    occurrence_number: int


class RecurringTaskCreatedEvent(BaseEvent):
    """Event emitted when a new recurring task instance is created."""
    event_type: str = "recurring_task.created"
    payload: RecurringTaskEventPayload


class RecurringTaskDueEvent(BaseEvent):
    """Event emitted when a recurring task is due."""
    event_type: str = "recurring_task.due"
    payload: RecurringTaskEventPayload


class RecurrencePatternCreatedEvent(BaseEvent):
    """Event emitted when a recurrence pattern is created."""
    event_type: str = "recurrence.created"
    payload: dict  # Pattern details


class RecurrencePatternUpdatedEvent(BaseEvent):
    """Event emitted when a recurrence pattern is updated."""
    event_type: str = "recurrence.updated"
    payload: dict


class RecurrencePatternDeactivatedEvent(BaseEvent):
    """Event emitted when a recurrence pattern is deactivated."""
    event_type: str = "recurrence.deactivated"
    payload: dict
```

### Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RECURRING TASK FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER CREATES RECURRING TASK
   ┌──────────────┐
   │ POST /tasks  │ ──► Creates Task + RecurrencePattern
   │ with recur   │     └─► Calculates first next_occurrence
   └──────────────┘         └─► Publishes: recurrence.created

2. USER COMPLETES TASK
   ┌──────────────┐     ┌─────────────────────┐
   │ PATCH /tasks │ ──► │  task-events topic  │
   │ /{id}/complete│    │  task.completed     │
   └──────────────┘     └──────────┬──────────┘
                                   │
                                   ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                    RECURRING TASK SERVICE                           │
   │  ┌─────────────────────────────────────────────────────────────┐   │
   │  │ Consumes: task.completed                                    │   │
   │  │                                                             │   │
   │  │ 1. Check if task has recurrence_id                          │   │
   │  │ 2. Load RecurrencePattern                                    │   │
   │  │ 3. Check if pattern is still active                          │   │
   │  │ 4. Calculate next occurrence date                            │   │
   │  │ 5. Create new Task instance                                  │   │
   │  │ 6. Update pattern (occurrence_count, last_occurrence)       │   │
   │  │ 7. Publish: recurring_task.created                           │   │
   │  └─────────────────────────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                    REMINDER SERVICE                                 │
   │  ┌─────────────────────────────────────────────────────────────┐   │
   │  │ Consumes: recurring_task.created                             │   │
   │  │                                                             │   │
   │  │ 1. Create reminder for new task instance                     │   │
   │  │ 2. Schedule notification                                     │   │
   │  └─────────────────────────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────────────────────────┘

3. TASK DELETION FLOW
   ┌──────────────┐     ┌─────────────────────┐
   │ DELETE /tasks│ ──► │  task-events topic  │
   │ /{id}        │     │  task.deleted       │
   └──────────────┘     └──────────┬──────────┘
                                   │
                                   ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                    RECURRING TASK SERVICE                           │
   │  ┌─────────────────────────────────────────────────────────────┐   │
   │  │ Consumes: task.deleted                                       │   │
   │  │                                                             │   │
   │  │ Options:                                                     │   │
   │  │ A. Delete single instance only (default)                     │   │
   │  │ B. Delete all future instances (user choice)                 │   │
   │  │ C. Deactivate pattern (user choice)                          │   │
   │  └─────────────────────────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────────────────────────┘
```

### Recurring Task Consumer

```python
# services/recurring/consumer.py
import logging
from datetime import datetime
from typing import Optional

from events.consumer import BaseKafkaConsumer, EventRouter
from events.producer import producer
from events.topics import TopicName
from events.recurring_schemas import (
    RecurringTaskCreatedEvent,
    RecurringTaskEventPayload,
)
from models.recurrence import RecurrencePattern
from models.task import Task
from .calculator import calculator

logger = logging.getLogger(__name__)


class RecurringTaskConsumer(BaseKafkaConsumer):
    """
    Consumes task events and creates recurring task instances.

    Responsibilities:
    - Listen for task.completed events
    - Check if task has active recurrence
    - Calculate next occurrence
    - Create new task instance
    - Update recurrence pattern state
    """

    def __init__(self, session_factory):
        super().__init__(
            topics=[TopicName.TASK_EVENTS],
            group_id="recurring-task-service",
            max_retries=3,
            enable_dlq=True,
        )
        self.session_factory = session_factory
        self.router = EventRouter()
        self.router.register("task.completed", self.handle_task_completed)
        self.router.register("task.deleted", self.handle_task_deleted)

    async def handle_message(self, message: dict) -> None:
        """Route message to appropriate handler."""
        await self.router.route(message)

    async def handle_task_completed(self, event: dict) -> None:
        """
        Handle task completion - create next recurring instance.

        CRITICAL: This must be idempotent to handle retries.
        """
        task_id = event["payload"]["task_id"]
        user_id = event["user_id"]
        event_id = event["event_id"]

        logger.info(f"Processing task.completed: task_id={task_id}")

        async with self.session_factory() as session:
            # Check idempotency
            if await self._is_processed(event_id, session):
                logger.info(f"Event already processed: {event_id}")
                return

            # Load task with recurrence
            task = await self._get_task(task_id, user_id, session)

            if not task or not task.recurrence_id:
                logger.debug(f"Task {task_id} is not recurring")
                return

            # Load recurrence pattern
            pattern = await self._get_pattern(task.recurrence_id, session)

            if not pattern or not pattern.is_active:
                logger.debug(f"Recurrence pattern inactive: {task.recurrence_id}")
                return

            # Calculate next occurrence
            next_occurrence = calculator.calculate_next(
                pattern,
                after=datetime.utcnow(),
            )

            if next_occurrence is None:
                # Pattern exhausted
                logger.info(f"Recurrence pattern exhausted: {pattern.id}")
                pattern.is_active = False
                session.add(pattern)
                await session.commit()
                return

            # Create new task instance
            new_task = Task(
                user_id=user_id,
                title=task.title,
                description=task.description,
                priority=task.priority,
                due_date=next_occurrence,
                recurrence_id=pattern.id,
                is_recurring_instance=True,
                original_task_id=task.original_task_id or task.id,
            )

            session.add(new_task)

            # Update pattern state
            pattern.occurrence_count += 1
            pattern.last_occurrence = datetime.utcnow()
            pattern.next_occurrence = next_occurrence
            session.add(pattern)

            # Mark event as processed
            await self._mark_processed(event_id, session)

            await session.commit()
            await session.refresh(new_task)

            logger.info(
                f"Created recurring task instance: "
                f"task_id={new_task.id}, due={next_occurrence}"
            )

            # Publish event for other services
            event = RecurringTaskCreatedEvent(
                user_id=user_id,
                correlation_id=event.get("correlation_id"),
                payload=RecurringTaskEventPayload(
                    task_id=new_task.id,
                    recurrence_id=pattern.id,
                    title=new_task.title,
                    due_date=next_occurrence,
                    occurrence_number=pattern.occurrence_count,
                ),
            )

            await producer.send_event(
                TopicName.RECURRING_TASK_EVENTS,
                event,
            )

    async def handle_task_deleted(self, event: dict) -> None:
        """
        Handle task deletion for recurring tasks.

        Options:
        - Delete single instance (default)
        - Delete all future instances
        - Deactivate pattern entirely
        """
        task_id = event["payload"]["task_id"]
        user_id = event["user_id"]
        delete_future = event["payload"].get("delete_future_instances", False)
        deactivate_pattern = event["payload"].get("deactivate_pattern", False)

        logger.info(f"Processing task.deleted: task_id={task_id}")

        if not delete_future and not deactivate_pattern:
            # Just deleting single instance, nothing to do
            return

        async with self.session_factory() as session:
            task = await self._get_task(task_id, user_id, session)

            if not task or not task.recurrence_id:
                return

            if deactivate_pattern:
                # Deactivate the entire pattern
                pattern = await self._get_pattern(task.recurrence_id, session)
                if pattern:
                    pattern.is_active = False
                    session.add(pattern)

            if delete_future:
                # Delete all future instances
                await self._delete_future_instances(
                    task.recurrence_id,
                    user_id,
                    session,
                )

            await session.commit()

    async def _get_task(
        self,
        task_id: int,
        user_id: str,
        session,
    ) -> Optional[Task]:
        """Get task with user isolation."""
        return await session.exec(
            select(Task)
            .where(Task.id == task_id)
            .where(Task.user_id == user_id)
        ).first()

    async def _get_pattern(
        self,
        pattern_id: int,
        session,
    ) -> Optional[RecurrencePattern]:
        """Get recurrence pattern."""
        return await session.get(RecurrencePattern, pattern_id)

    async def _is_processed(self, event_id: str, session) -> bool:
        """Check if event was already processed (idempotency)."""
        # Use state store or database table
        result = await session.exec(
            select(ProcessedEvent)
            .where(ProcessedEvent.event_id == event_id)
        ).first()
        return result is not None

    async def _mark_processed(self, event_id: str, session) -> None:
        """Mark event as processed."""
        processed = ProcessedEvent(event_id=event_id)
        session.add(processed)

    async def _delete_future_instances(
        self,
        recurrence_id: int,
        user_id: str,
        session,
    ) -> None:
        """Delete all incomplete future instances."""
        await session.exec(
            delete(Task)
            .where(Task.recurrence_id == recurrence_id)
            .where(Task.user_id == user_id)
            .where(Task.completed == False)
            .where(Task.due_date > datetime.utcnow())
        )
```

---

## Recurring Task Service

### API Service

```python
# services/recurring/service.py
from datetime import datetime, date, time
from typing import Optional, List
from sqlmodel import Session, select

from models.task import Task
from models.recurrence import RecurrencePattern, RecurrenceFrequency
from .patterns import RecurrencePatternCreate
from .calculator import calculator
from events.producer import producer
from events.topics import TopicName
from events.recurring_schemas import RecurrencePatternCreatedEvent


class RecurringTaskService:
    """
    Service for managing recurring tasks.

    Handles:
    - Creating recurring task patterns
    - Updating patterns
    - Deactivating patterns
    - Previewing occurrences
    """

    def __init__(self, session: Session):
        self.session = session

    async def create_recurring_task(
        self,
        user_id: str,
        title: str,
        pattern_data: RecurrencePatternCreate,
        description: Optional[str] = None,
        priority: str = "medium",
    ) -> tuple[Task, RecurrencePattern]:
        """
        Create a new recurring task with pattern.

        Returns:
            Tuple of (first task instance, recurrence pattern)
        """
        # Create recurrence pattern
        pattern = RecurrencePattern(
            user_id=user_id,
            frequency=pattern_data.pattern.frequency,
            interval=pattern_data.pattern.interval,
            start_date=pattern_data.start_date,
            end_date=pattern_data.end_date,
            max_occurrences=pattern_data.max_occurrences,
            preferred_time=pattern_data.preferred_time,
            timezone=pattern_data.timezone,
        )

        # Set frequency-specific fields
        if hasattr(pattern_data.pattern, "days_of_week"):
            pattern.days_of_week = [
                d.value for d in pattern_data.pattern.days_of_week
            ]

        if hasattr(pattern_data.pattern, "monthly_type"):
            pattern.monthly_type = pattern_data.pattern.monthly_type
            pattern.day_of_month = getattr(pattern_data.pattern, "day_of_month", None)
            pattern.week_of_month = getattr(pattern_data.pattern, "week_of_month", None)
            pattern.day_of_week_monthly = getattr(
                pattern_data.pattern, "day_of_week", None
            )
            if pattern.day_of_week_monthly:
                pattern.day_of_week_monthly = pattern.day_of_week_monthly.value

        if hasattr(pattern_data.pattern, "month_of_year"):
            pattern.month_of_year = pattern_data.pattern.month_of_year

        # Calculate first occurrence
        first_occurrence = calculator.calculate_next(
            pattern,
            after=datetime.combine(
                pattern_data.start_date,
                time(0, 0),
            ) - timedelta(days=1),
        )

        if first_occurrence is None:
            raise ValueError("Could not calculate first occurrence")

        pattern.next_occurrence = first_occurrence

        self.session.add(pattern)
        await self.session.flush()  # Get pattern.id

        # Create first task instance
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            due_date=first_occurrence,
            recurrence_id=pattern.id,
            is_recurring_instance=False,  # Original task
        )

        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(pattern)
        await self.session.refresh(task)

        # Publish event
        await producer.send_event(
            TopicName.RECURRING_TASK_EVENTS,
            RecurrencePatternCreatedEvent(
                user_id=user_id,
                payload={
                    "pattern_id": pattern.id,
                    "task_id": task.id,
                    "frequency": pattern.frequency.value,
                    "first_occurrence": first_occurrence.isoformat(),
                },
            ),
        )

        return task, pattern

    async def update_pattern(
        self,
        pattern_id: int,
        user_id: str,
        updates: dict,
        update_future_only: bool = True,
    ) -> RecurrencePattern:
        """
        Update a recurrence pattern.

        Args:
            pattern_id: Pattern ID
            user_id: User ID (for isolation)
            updates: Fields to update
            update_future_only: If True, only affects future instances

        Returns:
            Updated pattern
        """
        pattern = await self.session.exec(
            select(RecurrencePattern)
            .where(RecurrencePattern.id == pattern_id)
            .where(RecurrencePattern.user_id == user_id)
        ).first()

        if not pattern:
            raise ValueError("Pattern not found")

        # Apply updates
        for field, value in updates.items():
            if hasattr(pattern, field):
                setattr(pattern, field, value)

        # Recalculate next occurrence
        pattern.next_occurrence = calculator.calculate_next(
            pattern,
            after=datetime.utcnow(),
        )

        self.session.add(pattern)
        await self.session.commit()
        await self.session.refresh(pattern)

        return pattern

    async def deactivate_pattern(
        self,
        pattern_id: int,
        user_id: str,
        delete_future_tasks: bool = False,
    ) -> None:
        """
        Deactivate a recurrence pattern.

        Args:
            pattern_id: Pattern ID
            user_id: User ID
            delete_future_tasks: If True, delete incomplete future tasks
        """
        pattern = await self.session.exec(
            select(RecurrencePattern)
            .where(RecurrencePattern.id == pattern_id)
            .where(RecurrencePattern.user_id == user_id)
        ).first()

        if not pattern:
            raise ValueError("Pattern not found")

        pattern.is_active = False
        self.session.add(pattern)

        if delete_future_tasks:
            # Delete incomplete future tasks
            await self.session.exec(
                delete(Task)
                .where(Task.recurrence_id == pattern_id)
                .where(Task.user_id == user_id)
                .where(Task.completed == False)
                .where(Task.due_date > datetime.utcnow())
            )

        await self.session.commit()

    async def preview_occurrences(
        self,
        pattern_data: RecurrencePatternCreate,
        count: int = 10,
    ) -> List[datetime]:
        """
        Preview future occurrences without creating pattern.

        Useful for UI preview before confirming.
        """
        # Create temporary pattern (not saved)
        pattern = RecurrencePattern(
            user_id="preview",
            frequency=pattern_data.pattern.frequency,
            interval=pattern_data.pattern.interval,
            start_date=pattern_data.start_date,
            end_date=pattern_data.end_date,
            preferred_time=pattern_data.preferred_time,
            timezone=pattern_data.timezone,
        )

        # Set frequency-specific fields
        if hasattr(pattern_data.pattern, "days_of_week"):
            pattern.days_of_week = [
                d.value for d in pattern_data.pattern.days_of_week
            ]

        if hasattr(pattern_data.pattern, "monthly_type"):
            pattern.monthly_type = pattern_data.pattern.monthly_type
            pattern.day_of_month = getattr(pattern_data.pattern, "day_of_month", None)

        # Calculate occurrences
        occurrences = []
        current = datetime.combine(pattern_data.start_date, time(0, 0)) - timedelta(days=1)

        while len(occurrences) < count:
            next_occurrence = calculator.calculate_next(pattern, current)

            if next_occurrence is None:
                break

            occurrences.append(next_occurrence)
            current = next_occurrence

        return occurrences

    async def get_user_patterns(
        self,
        user_id: str,
        active_only: bool = True,
    ) -> List[RecurrencePattern]:
        """Get all recurrence patterns for a user."""
        query = select(RecurrencePattern).where(
            RecurrencePattern.user_id == user_id
        )

        if active_only:
            query = query.where(RecurrencePattern.is_active == True)

        return await self.session.exec(query).all()
```

---

## Edge Cases

### Comprehensive Edge Case Handling

```python
# services/recurring/edge_cases.py
"""
Edge case handling for recurring tasks.

This module documents and handles various edge cases that can occur
with date calculations and recurrence patterns.
"""

from datetime import datetime, date, timedelta
from typing import Optional
import calendar
import pytz
from dateutil.relativedelta import relativedelta


class EdgeCaseHandler:
    """Handles edge cases in recurrence calculations."""

    # ============================================================
    # MONTH BOUNDARY EDGE CASES
    # ============================================================

    def handle_month_overflow(
        self,
        target_day: int,
        year: int,
        month: int,
    ) -> int:
        """
        Handle day overflow when target day doesn't exist in month.

        Examples:
        - Jan 31 -> Feb 28/29 (Feb doesn't have 31 days)
        - Jan 30 -> Feb 28/29
        - Jan 29 -> Feb 28 (non-leap year)
        - Mar 31 -> Apr 30 (April has 30 days)

        Strategy: Use the last day of the month if target day doesn't exist.
        """
        max_day = calendar.monthrange(year, month)[1]
        return min(target_day, max_day)

    def get_same_day_next_month(
        self,
        current: date,
        months: int = 1,
    ) -> date:
        """
        Get the same day N months from now, handling overflow.

        Example: Jan 31 + 1 month = Feb 28 (or 29 in leap year)
        """
        target = current + relativedelta(months=months)

        # Adjust for overflow
        if current.day != target.day:
            # Day was adjusted - use last day of target month
            max_day = calendar.monthrange(target.year, target.month)[1]
            target = target.replace(day=min(current.day, max_day))

        return target

    # ============================================================
    # LEAP YEAR EDGE CASES
    # ============================================================

    def handle_leap_year(
        self,
        year: int,
        month: int,
        day: int,
    ) -> date:
        """
        Handle Feb 29 in non-leap years.

        Strategy: Use Feb 28 in non-leap years.
        """
        if month == 2 and day == 29:
            if not calendar.isleap(year):
                return date(year, 2, 28)

        return date(year, month, day)

    def next_feb_29(self, after: date) -> date:
        """
        Find the next Feb 29 after the given date.

        Used for yearly patterns that land on Feb 29.
        """
        year = after.year

        # If we're before Feb 29 this year and it's a leap year
        if after < date(year, 2, 29) and calendar.isleap(year):
            return date(year, 2, 29)

        # Find next leap year
        year += 1
        while not calendar.isleap(year):
            year += 1

        return date(year, 2, 29)

    # ============================================================
    # TIMEZONE EDGE CASES
    # ============================================================

    def handle_dst_transition(
        self,
        dt: datetime,
        timezone: str,
    ) -> datetime:
        """
        Handle Daylight Saving Time transitions.

        Edge cases:
        - 2:30 AM doesn't exist on spring forward day
        - 1:30 AM exists twice on fall back day

        Strategy:
        - Spring forward: Use the next valid time (3:00 AM)
        - Fall back: Use the first occurrence (standard time)
        """
        tz = pytz.timezone(timezone)

        try:
            # Try to localize directly
            localized = tz.localize(dt.replace(tzinfo=None), is_dst=None)
            return localized

        except pytz.exceptions.AmbiguousTimeError:
            # Fall back - time exists twice, use first (is_dst=True)
            return tz.localize(dt.replace(tzinfo=None), is_dst=True)

        except pytz.exceptions.NonExistentTimeError:
            # Spring forward - time doesn't exist
            # Move to next valid time
            return tz.localize(
                dt.replace(tzinfo=None) + timedelta(hours=1),
                is_dst=True,
            )

    def normalize_to_timezone(
        self,
        dt: datetime,
        from_tz: str,
        to_tz: str,
    ) -> datetime:
        """
        Convert datetime between timezones, handling edge cases.
        """
        from_timezone = pytz.timezone(from_tz)
        to_timezone = pytz.timezone(to_tz)

        if dt.tzinfo is None:
            dt = from_timezone.localize(dt)

        return dt.astimezone(to_timezone)

    # ============================================================
    # WEEKLY PATTERN EDGE CASES
    # ============================================================

    def handle_week_boundary(
        self,
        target_days: list[int],
        current: date,
        interval: int,
        start_date: date,
    ) -> date:
        """
        Handle week boundary transitions.

        Edge case: When interval > 1, we need to track which "week number"
        we're in relative to the start date.

        Example:
        - Start: Week 1, Monday
        - Interval: 2 (every 2 weeks)
        - Current: Week 3, Friday
        - Next should be: Week 4, Monday (not Week 3's Monday)
        """
        # Calculate week number from start
        days_since_start = (current - start_date).days
        current_week = days_since_start // 7

        # Check if we're in a valid week
        if current_week % interval != 0:
            # Move to next valid week
            weeks_to_skip = interval - (current_week % interval)
            next_week_start = start_date + timedelta(
                weeks=current_week + weeks_to_skip
            )

            # Find first target day in that week
            for day_offset in range(7):
                candidate = next_week_start + timedelta(days=day_offset)
                if candidate.weekday() in target_days:
                    return candidate

        # We're in a valid week, find next target day
        for day_offset in range(1, 8):
            candidate = current + timedelta(days=day_offset)
            if candidate.weekday() in target_days:
                # Verify still in valid week
                candidate_week = (candidate - start_date).days // 7
                if candidate_week % interval == 0:
                    return candidate

        # Move to next valid week
        return self.handle_week_boundary(
            target_days,
            current + timedelta(weeks=1),
            interval,
            start_date,
        )

    # ============================================================
    # NTH WEEKDAY EDGE CASES
    # ============================================================

    def handle_missing_nth_weekday(
        self,
        year: int,
        month: int,
        weekday: int,
        n: int,
    ) -> Optional[date]:
        """
        Handle case where Nth weekday doesn't exist in month.

        Example: "5th Monday" doesn't exist in most months.

        Strategy: Return None to indicate the occurrence should be skipped,
        or optionally use the last occurrence of that weekday.
        """
        # Find first occurrence
        first_day = date(year, month, 1)
        days_until_weekday = (weekday - first_day.weekday()) % 7
        first_occurrence = first_day + timedelta(days=days_until_weekday)

        # Calculate Nth occurrence
        nth_occurrence = first_occurrence + timedelta(weeks=n - 1)

        if nth_occurrence.month != month:
            # Nth weekday doesn't exist in this month
            return None

        return nth_occurrence

    def get_last_weekday(
        self,
        year: int,
        month: int,
        weekday: int,
    ) -> date:
        """
        Get the last occurrence of a weekday in a month.

        Always exists, unlike Nth weekday.
        """
        last_day = date(year, month, calendar.monthrange(year, month)[1])
        days_since_weekday = (last_day.weekday() - weekday) % 7
        return last_day - timedelta(days=days_since_weekday)

    # ============================================================
    # PATTERN EXHAUSTION EDGE CASES
    # ============================================================

    def is_pattern_exhausted(
        self,
        pattern,
        current: datetime,
    ) -> bool:
        """
        Check if a recurrence pattern is exhausted.

        Exhaustion conditions:
        1. end_date is reached
        2. max_occurrences is reached
        3. Pattern is deactivated
        """
        if not pattern.is_active:
            return True

        if pattern.end_date and current.date() > pattern.end_date:
            return True

        if pattern.max_occurrences is not None:
            if pattern.occurrence_count >= pattern.max_occurrences:
                return True

        return False

    def should_skip_occurrence(
        self,
        occurrence: datetime,
        skip_dates: list[date] = None,
        skip_weekends: bool = False,
        skip_holidays: list[date] = None,
    ) -> bool:
        """
        Check if an occurrence should be skipped.

        Used for business day adjustments or holiday skipping.
        """
        if skip_dates and occurrence.date() in skip_dates:
            return True

        if skip_weekends and occurrence.weekday() >= 5:
            return True

        if skip_holidays and occurrence.date() in skip_holidays:
            return True

        return False

    def adjust_to_business_day(
        self,
        dt: datetime,
        direction: str = "forward",  # "forward" or "backward"
    ) -> datetime:
        """
        Adjust datetime to nearest business day.

        Used when a recurrence falls on a weekend/holiday.
        """
        while dt.weekday() >= 5:  # Saturday = 5, Sunday = 6
            if direction == "forward":
                dt += timedelta(days=1)
            else:
                dt -= timedelta(days=1)

        return dt
```

---

## API Endpoints

```python
# routes/recurring.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from services.recurring.service import RecurringTaskService
from services.recurring.patterns import RecurrencePatternCreate
from models.recurrence import RecurrencePattern
from schemas import TaskResponse

router = APIRouter(prefix="/recurring", tags=["Recurring Tasks"])


@router.post("/{user_id}/tasks", response_model=TaskResponse)
async def create_recurring_task(
    user_id: str,
    title: str,
    pattern: RecurrencePatternCreate,
    description: str = None,
    priority: str = "medium",
    service: RecurringTaskService = Depends(get_recurring_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Create a new recurring task with pattern."""
    verify_user_access(user_id, user)

    task, _ = await service.create_recurring_task(
        user_id=user_id,
        title=title,
        pattern_data=pattern,
        description=description,
        priority=priority,
    )

    return TaskResponse.model_validate(task)


@router.post("/{user_id}/preview")
async def preview_occurrences(
    user_id: str,
    pattern: RecurrencePatternCreate,
    count: int = 10,
    service: RecurringTaskService = Depends(get_recurring_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Preview future occurrences without creating pattern."""
    verify_user_access(user_id, user)

    occurrences = await service.preview_occurrences(pattern, count)

    return {
        "occurrences": [o.isoformat() for o in occurrences],
        "count": len(occurrences),
    }


@router.get("/{user_id}/patterns")
async def list_patterns(
    user_id: str,
    active_only: bool = True,
    service: RecurringTaskService = Depends(get_recurring_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """List all recurrence patterns for user."""
    verify_user_access(user_id, user)

    patterns = await service.get_user_patterns(user_id, active_only)

    return {"patterns": patterns}


@router.delete("/{user_id}/patterns/{pattern_id}")
async def deactivate_pattern(
    user_id: str,
    pattern_id: int,
    delete_future: bool = False,
    service: RecurringTaskService = Depends(get_recurring_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Deactivate a recurrence pattern."""
    verify_user_access(user_id, user)

    await service.deactivate_pattern(
        pattern_id,
        user_id,
        delete_future_tasks=delete_future,
    )

    return {"message": "Pattern deactivated"}
```

---

## Testing

```python
# tests/test_recurring.py
import pytest
from datetime import date, datetime, time, timedelta
from services.recurring.calculator import RecurrenceCalculator
from models.recurrence import (
    RecurrencePattern,
    RecurrenceFrequency,
    MonthlyType,
)


@pytest.fixture
def calculator():
    return RecurrenceCalculator()


class TestDailyRecurrence:
    def test_every_day(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.DAILY,
            interval=1,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 1, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence.date() == date(2024, 1, 2)

    def test_every_other_day(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.DAILY,
            interval=2,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 1, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence.date() == date(2024, 1, 3)


class TestWeeklyRecurrence:
    def test_every_monday_wednesday_friday(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.WEEKLY,
            interval=1,
            days_of_week=["monday", "wednesday", "friday"],
            start_date=date(2024, 1, 1),  # Monday
        )

        # Starting from Monday
        after = datetime(2024, 1, 1, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        # Next should be Wednesday
        assert next_occurrence.date() == date(2024, 1, 3)
        assert next_occurrence.weekday() == 2  # Wednesday

    def test_biweekly(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.WEEKLY,
            interval=2,
            days_of_week=["monday"],
            start_date=date(2024, 1, 1),  # Week 1
        )

        # After week 1 Monday, next should be week 3 Monday
        after = datetime(2024, 1, 1, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence.date() == date(2024, 1, 15)


class TestMonthlyRecurrence:
    def test_15th_of_every_month(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.MONTHLY,
            interval=1,
            monthly_type=MonthlyType.DAY_OF_MONTH,
            day_of_month=15,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 16, 12, 0)  # After Jan 15
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence.date() == date(2024, 2, 15)

    def test_31st_february_overflow(self, calculator):
        """Test that Jan 31 -> Feb 28/29."""
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.MONTHLY,
            interval=1,
            monthly_type=MonthlyType.DAY_OF_MONTH,
            day_of_month=31,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 31, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        # 2024 is leap year, so Feb has 29 days
        assert next_occurrence.date() == date(2024, 2, 29)

    def test_second_tuesday(self, calculator):
        """Test 2nd Tuesday of every month."""
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.MONTHLY,
            interval=1,
            monthly_type=MonthlyType.DAY_OF_WEEK,
            week_of_month=2,
            day_of_week_monthly="tuesday",
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 10, 12, 0)  # After 2nd Tuesday (Jan 9)
        next_occurrence = calculator.calculate_next(pattern, after)

        # Feb 2024: 2nd Tuesday is Feb 13
        assert next_occurrence.date() == date(2024, 2, 13)

    def test_last_day_of_month(self, calculator):
        """Test last day of every month."""
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.MONTHLY,
            interval=1,
            monthly_type=MonthlyType.LAST_DAY,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 1, 31, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        # Feb 2024 has 29 days (leap year)
        assert next_occurrence.date() == date(2024, 2, 29)


class TestYearlyRecurrence:
    def test_christmas(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.YEARLY,
            interval=1,
            month_of_year=12,
            day_of_month=25,
            start_date=date(2024, 1, 1),
        )

        after = datetime(2024, 12, 26, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence.date() == date(2025, 12, 25)

    def test_leap_year_feb_29(self, calculator):
        """Test Feb 29 handling in non-leap years."""
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.YEARLY,
            interval=1,
            month_of_year=2,
            day_of_month=29,
            start_date=date(2024, 2, 29),  # Leap year
        )

        after = datetime(2024, 3, 1, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        # 2025 is not a leap year, should use Feb 28
        assert next_occurrence.date() == date(2025, 2, 28)


class TestPatternExhaustion:
    def test_max_occurrences(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.DAILY,
            interval=1,
            start_date=date(2024, 1, 1),
            max_occurrences=3,
            occurrence_count=3,  # Already at max
        )

        next_occurrence = calculator.calculate_next(pattern)

        assert next_occurrence is None

    def test_end_date_reached(self, calculator):
        pattern = RecurrencePattern(
            user_id="test",
            frequency=RecurrenceFrequency.DAILY,
            interval=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 5),
        )

        after = datetime(2024, 1, 6, 12, 0)
        next_occurrence = calculator.calculate_next(pattern, after)

        assert next_occurrence is None
```

---

## Quick Reference

### Pattern Examples

| Description | Frequency | Settings |
|-------------|-----------|----------|
| Every day | DAILY | interval=1 |
| Every other day | DAILY | interval=2 |
| Every Monday | WEEKLY | interval=1, days=["monday"] |
| MWF | WEEKLY | interval=1, days=["monday","wednesday","friday"] |
| Biweekly Tuesday | WEEKLY | interval=2, days=["tuesday"] |
| 15th of month | MONTHLY | type=DAY_OF_MONTH, day=15 |
| 2nd Tuesday | MONTHLY | type=DAY_OF_WEEK, week=2, day="tuesday" |
| Last Friday | MONTHLY | type=DAY_OF_WEEK, week=5, day="friday" |
| Last day of month | MONTHLY | type=LAST_DAY |
| Yearly on date | YEARLY | month=12, day=25 |

### Edge Cases Checklist

- [ ] Month overflow (Jan 31 -> Feb 28)
- [ ] Leap year (Feb 29)
- [ ] DST transitions
- [ ] 5th weekday doesn't exist
- [ ] Pattern exhaustion (max occurrences)
- [ ] End date boundary
- [ ] Timezone conversions
- [ ] Week boundary with intervals

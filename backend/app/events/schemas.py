"""
Event envelope base class for Phase V event-driven architecture.

Per specs/phase5/contracts/task-events.json and reminder-events.json
"""

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4
from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def generate_event_id() -> str:
    """Generate a unique event ID (UUID)."""
    return str(uuid4())


class EventEnvelope(BaseModel):
    """
    Base event envelope containing standard fields for all events.

    Per specs/phase5/02-event-schemas.md:
    - event_id: UUID for idempotency
    - event_type: Type of event (e.g., "task.created")
    - timestamp: ISO-8601 UTC timestamp
    - version: Schema version (MAJOR.MINOR format)
    - source: Service that produced the event
    - user_id: User ID for isolation and routing
    - payload: Event-specific data
    """

    event_id: str = Field(default_factory=generate_event_id)
    event_type: str
    timestamp: str = Field(default_factory=utc_now_iso)
    version: str = "1.0"
    source: str = "chat-api"
    user_id: str
    payload: dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "event_type": "task.created",
                "timestamp": "2026-01-28T12:00:00.000Z",
                "version": "1.0",
                "source": "chat-api",
                "user_id": "user-123-uuid",
                "payload": {}
            }
        }

    def to_dict(self) -> dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return self.model_dump()

    def to_json_bytes(self) -> bytes:
        """Convert event to JSON bytes for Kafka."""
        return self.model_dump_json().encode("utf-8")


class BasePayload(BaseModel):
    """Base class for event payloads."""
    pass

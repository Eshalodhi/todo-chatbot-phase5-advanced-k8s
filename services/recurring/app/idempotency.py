"""
Idempotency checker for the Recurring Task Service.

Prevents duplicate processing of events.
Per specs/phase5/data-model.md.
"""

import logging

logger = logging.getLogger(__name__)

# In-memory set for idempotency tracking (use database in production)
_processed_events: set[str] = set()


async def is_event_processed(event_id: str, service_name: str) -> bool:
    """Check if an event has already been processed."""
    key = f"{event_id}:{service_name}"
    return key in _processed_events


async def mark_event_processed(
    event_id: str,
    event_type: str,
    service_name: str
) -> None:
    """Mark an event as processed."""
    key = f"{event_id}:{service_name}"
    _processed_events.add(key)
    logger.info(f"Marked event {event_id} ({event_type}) as processed by {service_name}")

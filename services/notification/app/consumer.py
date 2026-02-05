"""
Kafka consumer for reminder-events topic.

Listens for reminder events and processes them accordingly.
Per specs/phase5/03-kafka-integration.md.
"""

import json
import logging
import asyncio
from typing import Optional

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

from app.config import KAFKA_BROKERS, KAFKA_CONSUMER_GROUP, MAX_RETRY_ATTEMPTS
from app.idempotency import is_event_processed, mark_event_processed
from app.notifier import send_notification

logger = logging.getLogger(__name__)

_consumer: Optional[AIOKafkaConsumer] = None
_consumer_task: Optional[asyncio.Task] = None

REMINDER_EVENTS_TOPIC = "reminder-events"
DLQ_TOPIC = "dlq.reminder-events"


async def create_consumer() -> AIOKafkaConsumer:
    """Create and start a Kafka consumer for reminder events."""
    logger.info(f"Connecting to Kafka brokers: {KAFKA_BROKERS}")
    consumer = AIOKafkaConsumer(
        REMINDER_EVENTS_TOPIC,
        bootstrap_servers=KAFKA_BROKERS,
        group_id=KAFKA_CONSUMER_GROUP,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )
    await consumer.start()
    logger.info(f"Kafka consumer started, listening on {REMINDER_EVENTS_TOPIC}")
    return consumer


async def consume_loop(consumer: AIOKafkaConsumer) -> None:
    """Main consumer loop for processing reminder events."""
    try:
        async for msg in consumer:
            try:
                event = msg.value
                event_id = event.get("event_id", "unknown")
                event_type = event.get("event_type", "unknown")

                logger.info(f"Received event: type={event_type}, id={event_id}")

                # Idempotency check
                if await is_event_processed(event_id, "notification-service"):
                    logger.info(f"Event {event_id} already processed, skipping")
                    continue

                # Process based on event type
                if event_type == "reminder.triggered":
                    await handle_reminder_triggered(event)
                elif event_type == "reminder.scheduled":
                    logger.info(f"Reminder scheduled: {event_id}")
                elif event_type == "reminder.cancelled":
                    logger.info(f"Reminder cancelled: {event_id}")
                else:
                    logger.warning(f"Unknown event type: {event_type}")

                # Mark as processed
                await mark_event_processed(event_id, event_type, "notification-service")

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                await route_to_dlq(msg.value, str(e))

    except asyncio.CancelledError:
        logger.info("Consumer loop cancelled")
    except Exception as e:
        logger.error(f"Consumer loop error: {e}", exc_info=True)


async def handle_reminder_triggered(event: dict) -> None:
    """Handle a reminder.triggered event by sending notification."""
    payload = event.get("payload", {})
    user_id = event.get("user_id")
    reminder_id = payload.get("reminder_id")
    task_title = payload.get("task_title", "Unknown task")

    logger.info(f"Processing reminder {reminder_id} for user {user_id}: {task_title}")

    success = await send_notification(
        user_id=user_id,
        subject=f"Reminder: {task_title}",
        body=f"This is a reminder for your task: {task_title}",
    )

    if success:
        logger.info(f"Notification sent for reminder {reminder_id}")
    else:
        logger.warning(f"Failed to send notification for reminder {reminder_id}")


async def route_to_dlq(event: dict, error: str) -> None:
    """Route failed events to dead letter queue."""
    logger.warning(f"Routing event to DLQ: {error}")
    # In production, this would publish to the DLQ topic
    # For now, log the failure
    logger.error(f"DLQ event: {json.dumps(event)}, error: {error}")


async def _connect_with_retry() -> None:
    """Attempt to connect to Kafka with retry, runs as a background task."""
    global _consumer, _consumer_task
    max_retries = 5
    retry_delay = 5

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to Kafka brokers: {KAFKA_BROKERS} (attempt {attempt}/{max_retries})")
            _consumer = await asyncio.wait_for(create_consumer(), timeout=10)
            _consumer_task = asyncio.create_task(consume_loop(_consumer))
            logger.info("Kafka consumer connected and running")
            return
        except asyncio.TimeoutError:
            logger.warning(f"Kafka connection timed out (attempt {attempt}/{max_retries})")
        except Exception as e:
            logger.warning(f"Kafka connection failed (attempt {attempt}/{max_retries}): {e}")

        if attempt < max_retries:
            await asyncio.sleep(retry_delay)

    logger.warning("Could not connect to Kafka after all retries. Running without event consumption.")


_startup_task: Optional[asyncio.Task] = None


async def start_consumer() -> None:
    """Start the Kafka consumer connection in a non-blocking background task."""
    global _startup_task
    _startup_task = asyncio.create_task(_connect_with_retry())


async def stop_consumer() -> None:
    """Stop the Kafka consumer."""
    global _consumer, _consumer_task

    if _consumer_task:
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass

    if _consumer:
        await _consumer.stop()
        logger.info("Kafka consumer stopped")

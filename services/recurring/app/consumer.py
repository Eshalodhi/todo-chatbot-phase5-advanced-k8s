"""
Kafka consumer for task-events topic.

Listens for task.completed events and triggers recurring task creation.
Per specs/phase5/03-kafka-integration.md.
"""

import json
import logging
import asyncio
from typing import Optional

from aiokafka import AIOKafkaConsumer

from app.config import KAFKA_BROKERS, KAFKA_CONSUMER_GROUP
from app.idempotency import is_event_processed, mark_event_processed
from app.task_creator import create_next_recurring_task

logger = logging.getLogger(__name__)

_consumer: Optional[AIOKafkaConsumer] = None
_consumer_task: Optional[asyncio.Task] = None

TASK_EVENTS_TOPIC = "task-events"
DLQ_TOPIC = "dlq.task-events"


async def create_consumer() -> AIOKafkaConsumer:
    """Create and start a Kafka consumer for task events."""
    logger.info(f"Connecting to Kafka brokers: {KAFKA_BROKERS}")
    consumer = AIOKafkaConsumer(
        TASK_EVENTS_TOPIC,
        bootstrap_servers=KAFKA_BROKERS,
        group_id=KAFKA_CONSUMER_GROUP,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )
    await consumer.start()
    logger.info(f"Kafka consumer started, listening on {TASK_EVENTS_TOPIC}")
    return consumer


async def consume_loop(consumer: AIOKafkaConsumer) -> None:
    """Main consumer loop for processing task events."""
    try:
        async for msg in consumer:
            try:
                event = msg.value
                event_id = event.get("event_id", "unknown")
                event_type = event.get("event_type", "unknown")

                logger.info(f"Received event: type={event_type}, id={event_id}")

                # Only process task.completed events with recurrence
                if event_type != "task.completed":
                    logger.debug(f"Skipping non-completion event: {event_type}")
                    continue

                payload = event.get("payload", {})
                if not payload.get("had_recurrence"):
                    logger.debug(f"Skipping non-recurring task completion: {event_id}")
                    continue

                # Idempotency check
                if await is_event_processed(event_id, "recurring-task-service"):
                    logger.info(f"Event {event_id} already processed, skipping")
                    continue

                # Process the recurring task completion
                await handle_task_completed(event)

                # Mark as processed
                await mark_event_processed(event_id, event_type, "recurring-task-service")

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                await route_to_dlq(msg.value, str(e))

    except asyncio.CancelledError:
        logger.info("Consumer loop cancelled")
    except Exception as e:
        logger.error(f"Consumer loop error: {e}", exc_info=True)


async def handle_task_completed(event: dict) -> None:
    """Handle a task.completed event for recurring tasks."""
    payload = event.get("payload", {})
    user_id = event.get("user_id")
    task_id = payload.get("task_id")
    recurrence_pattern = payload.get("recurrence_pattern")
    recurrence_end_date = payload.get("recurrence_end_date")
    title = payload.get("title", "Unknown task")

    logger.info(
        f"Processing recurring task completion: task={task_id}, "
        f"pattern={recurrence_pattern}, user={user_id}"
    )

    result = await create_next_recurring_task(
        user_id=user_id,
        original_task_id=task_id,
        title=title,
        recurrence_pattern=recurrence_pattern,
        recurrence_end_date=recurrence_end_date,
    )

    if result:
        logger.info(f"Created next recurring task instance for task {task_id}")
    else:
        logger.info(f"No new task created for task {task_id} (end date reached or error)")


async def route_to_dlq(event: dict, error: str) -> None:
    """Route failed events to dead letter queue."""
    logger.warning(f"Routing event to DLQ: {error}")
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

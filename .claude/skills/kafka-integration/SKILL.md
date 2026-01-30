# Kafka Integration Skill

## Purpose

Guide for implementing event streaming with Kafka/Redpanda using aiokafka for async Python producers and consumers in the Phase II hackathon microservices architecture.

## Technology Stack

- **Redpanda** - Kafka-compatible streaming platform (simpler operations)
- **Docker** - Local Redpanda development environment
- **Redpanda Cloud** - Managed streaming for production
- **aiokafka** - Async Kafka client for Python
- **Pydantic** - Event schema validation
- **FastAPI** - Integration with async web framework

---

## Project Structure

```
backend/
├── events/
│   ├── __init__.py
│   ├── producer.py           # Kafka producer singleton
│   ├── consumer.py           # Kafka consumer base class
│   ├── schemas.py            # Event Pydantic models
│   └── topics.py             # Topic configuration
├── services/
│   └── notification/
│       ├── __init__.py
│       ├── consumer.py       # Notification event consumer
│       └── handlers.py       # Event handlers
└── docker-compose.kafka.yml  # Local Redpanda setup
```

---

## Local Development Setup (Docker)

### docker-compose.kafka.yml

```yaml
version: '3.8'

services:
  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:v24.1.1
    container_name: redpanda
    command:
      - redpanda
      - start
      - --smp 1
      - --memory 1G
      - --reserve-memory 0M
      - --overprovisioned
      - --node-id 0
      - --kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://redpanda:29092,OUTSIDE://localhost:9092
      - --pandaproxy-addr 0.0.0.0:8082
      - --advertise-pandaproxy-addr localhost:8082
      - --set redpanda.enable_idempotence=true
      - --set redpanda.auto_create_topics_enabled=true
    ports:
      - "9092:9092"      # Kafka API
      - "8082:8082"      # Pandaproxy (REST API)
      - "9644:9644"      # Admin API
    healthcheck:
      test: ["CMD", "rpk", "cluster", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  redpanda-console:
    image: docker.redpanda.com/redpandadata/console:v2.4.5
    container_name: redpanda-console
    entrypoint: /bin/sh
    command: -c "echo \"$$CONSOLE_CONFIG_FILE\" > /tmp/config.yml && /app/console"
    environment:
      CONFIG_FILEPATH: /tmp/config.yml
      CONSOLE_CONFIG_FILE: |
        kafka:
          brokers: ["redpanda:29092"]
        redpanda:
          adminApi:
            enabled: true
            urls: ["http://redpanda:9644"]
    ports:
      - "8080:8080"      # Console UI
    depends_on:
      redpanda:
        condition: service_healthy
```

### Start Local Kafka

```bash
# Start Redpanda
docker compose -f docker-compose.kafka.yml up -d

# Verify cluster health
docker exec -it redpanda rpk cluster health

# Create topics manually (optional - auto-create enabled)
docker exec -it redpanda rpk topic create task-events --partitions 3
docker exec -it redpanda rpk topic create reminder-events --partitions 3
docker exec -it redpanda rpk topic create notification-events --partitions 3

# List topics
docker exec -it redpanda rpk topic list

# View console UI
# Open http://localhost:8080
```

---

## Requirements

```txt
# requirements.txt - Add to existing
aiokafka>=0.10.0
pydantic>=2.5.0
```

---

## Topic Configuration

```python
# events/topics.py
from enum import Enum
from dataclasses import dataclass
from typing import Optional


class TopicName(str, Enum):
    """Kafka topic names."""
    TASK_EVENTS = "task-events"
    REMINDER_EVENTS = "reminder-events"
    NOTIFICATION_EVENTS = "notification-events"
    RECURRING_TASK_EVENTS = "recurring-task-events"
    DEAD_LETTER = "dead-letter-queue"


@dataclass
class TopicConfig:
    """Topic configuration."""
    name: TopicName
    partitions: int = 3
    replication_factor: int = 1  # Set to 3 for production
    retention_ms: int = 604800000  # 7 days
    cleanup_policy: str = "delete"  # or "compact"


# Topic configurations
TOPICS: dict[TopicName, TopicConfig] = {
    TopicName.TASK_EVENTS: TopicConfig(
        name=TopicName.TASK_EVENTS,
        partitions=3,
    ),
    TopicName.REMINDER_EVENTS: TopicConfig(
        name=TopicName.REMINDER_EVENTS,
        partitions=3,
    ),
    TopicName.NOTIFICATION_EVENTS: TopicConfig(
        name=TopicName.NOTIFICATION_EVENTS,
        partitions=3,
    ),
    TopicName.RECURRING_TASK_EVENTS: TopicConfig(
        name=TopicName.RECURRING_TASK_EVENTS,
        partitions=3,
    ),
    TopicName.DEAD_LETTER: TopicConfig(
        name=TopicName.DEAD_LETTER,
        partitions=1,
        retention_ms=2592000000,  # 30 days for DLQ
    ),
}
```

---

## Event Schemas

```python
# events/schemas.py
from datetime import datetime
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field
import uuid


class EventType(str, Enum):
    """Event types for task domain."""
    # Task events
    TASK_CREATED = "task.created"
    TASK_UPDATED = "task.updated"
    TASK_COMPLETED = "task.completed"
    TASK_DELETED = "task.deleted"

    # Reminder events
    REMINDER_SCHEDULED = "reminder.scheduled"
    REMINDER_TRIGGERED = "reminder.triggered"
    REMINDER_CANCELLED = "reminder.cancelled"

    # Notification events
    NOTIFICATION_SEND = "notification.send"
    NOTIFICATION_SENT = "notification.sent"
    NOTIFICATION_FAILED = "notification.failed"

    # Recurring task events
    RECURRING_TASK_DUE = "recurring_task.due"
    RECURRING_TASK_CREATED = "recurring_task.created"


class BaseEvent(BaseModel):
    """Base event schema with common fields."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0"
    source: str = "task-service"
    correlation_id: Optional[str] = None
    user_id: str  # CRITICAL: Always include user_id for isolation

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ============================================================
# Task Events
# ============================================================

class TaskEventPayload(BaseModel):
    """Payload for task events."""
    task_id: int
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None


class TaskCreatedEvent(BaseEvent):
    """Event emitted when a task is created."""
    event_type: EventType = EventType.TASK_CREATED
    payload: TaskEventPayload


class TaskCompletedEvent(BaseEvent):
    """Event emitted when a task is completed."""
    event_type: EventType = EventType.TASK_COMPLETED
    payload: TaskEventPayload
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class TaskDeletedEvent(BaseEvent):
    """Event emitted when a task is deleted."""
    event_type: EventType = EventType.TASK_DELETED
    payload: TaskEventPayload


# ============================================================
# Reminder Events
# ============================================================

class ReminderPayload(BaseModel):
    """Payload for reminder events."""
    reminder_id: str
    task_id: int
    task_title: str
    scheduled_time: datetime
    notification_channel: str = "email"  # email, push, sms


class ReminderScheduledEvent(BaseEvent):
    """Event emitted when a reminder is scheduled."""
    event_type: EventType = EventType.REMINDER_SCHEDULED
    payload: ReminderPayload


class ReminderTriggeredEvent(BaseEvent):
    """Event emitted when a reminder is triggered."""
    event_type: EventType = EventType.REMINDER_TRIGGERED
    payload: ReminderPayload


# ============================================================
# Notification Events
# ============================================================

class NotificationPayload(BaseModel):
    """Payload for notification events."""
    notification_id: str
    channel: str  # email, push, sms
    recipient: str  # email address, device token, phone number
    subject: str
    body: str
    metadata: Optional[dict[str, Any]] = None


class NotificationSendEvent(BaseEvent):
    """Event requesting notification delivery."""
    event_type: EventType = EventType.NOTIFICATION_SEND
    payload: NotificationPayload


class NotificationSentEvent(BaseEvent):
    """Event confirming notification was sent."""
    event_type: EventType = EventType.NOTIFICATION_SENT
    payload: NotificationPayload
    sent_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationFailedEvent(BaseEvent):
    """Event indicating notification delivery failed."""
    event_type: EventType = EventType.NOTIFICATION_FAILED
    payload: NotificationPayload
    error: str
    retry_count: int = 0
    will_retry: bool = False


# ============================================================
# Dead Letter Event (for failed processing)
# ============================================================

class DeadLetterEvent(BaseModel):
    """Wrapper for events that failed processing."""
    original_event: dict
    original_topic: str
    error: str
    failed_at: datetime = Field(default_factory=datetime.utcnow)
    retry_count: int
    consumer_group: str
```

---

## Kafka Producer

```python
# events/producer.py
import os
import json
import logging
from typing import Optional
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError
from pydantic import BaseModel

from .topics import TopicName
from .schemas import BaseEvent

logger = logging.getLogger(__name__)


class KafkaProducer:
    """
    Async Kafka producer singleton.

    Usage:
        producer = KafkaProducer()
        await producer.start()
        await producer.send_event(TopicName.TASK_EVENTS, event)
        await producer.stop()
    """

    _instance: Optional["KafkaProducer"] = None
    _producer: Optional[AIOKafkaProducer] = None

    def __new__(cls) -> "KafkaProducer":
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize producer configuration."""
        self.bootstrap_servers = os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        )
        self.client_id = os.getenv("KAFKA_CLIENT_ID", "task-service-producer")

    async def start(self) -> None:
        """Start the Kafka producer."""
        if self._producer is not None:
            return

        self._producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            client_id=self.client_id,
            # Serialization
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            # Reliability settings
            acks="all",  # Wait for all replicas
            enable_idempotence=True,  # Exactly-once semantics
            retries=3,
            retry_backoff_ms=100,
            # Performance settings
            linger_ms=5,  # Batch messages for 5ms
            compression_type="gzip",
        )

        await self._producer.start()
        logger.info(f"Kafka producer started: {self.bootstrap_servers}")

    async def stop(self) -> None:
        """Stop the Kafka producer."""
        if self._producer is not None:
            await self._producer.stop()
            self._producer = None
            logger.info("Kafka producer stopped")

    async def send_event(
        self,
        topic: TopicName,
        event: BaseEvent,
        key: Optional[str] = None,
    ) -> bool:
        """
        Send an event to a Kafka topic.

        Args:
            topic: Target topic
            event: Event to send (Pydantic model)
            key: Optional partition key (default: user_id)

        Returns:
            True if sent successfully, False otherwise

        CRITICAL: Uses user_id as partition key by default to ensure
        all events for a user go to the same partition (ordering guarantee).
        """
        if self._producer is None:
            logger.error("Producer not started. Call start() first.")
            return False

        try:
            # Use user_id as partition key for ordering guarantee
            partition_key = key or event.user_id

            # Serialize event to dict
            event_data = event.model_dump(mode="json")

            # Send to Kafka
            result = await self._producer.send_and_wait(
                topic=topic.value,
                key=partition_key,
                value=event_data,
            )

            logger.info(
                f"Event sent: topic={topic.value}, "
                f"partition={result.partition}, "
                f"offset={result.offset}, "
                f"event_type={event.event_type}"
            )
            return True

        except KafkaError as e:
            logger.error(f"Failed to send event: {e}")
            return False

    async def send_batch(
        self,
        topic: TopicName,
        events: list[BaseEvent],
    ) -> int:
        """
        Send multiple events to a topic.

        Returns:
            Number of successfully sent events
        """
        if self._producer is None:
            logger.error("Producer not started")
            return 0

        success_count = 0
        for event in events:
            if await self.send_event(topic, event):
                success_count += 1

        return success_count


# Global producer instance
producer = KafkaProducer()


# FastAPI integration helpers
async def get_producer() -> KafkaProducer:
    """FastAPI dependency for producer."""
    return producer


async def startup_producer() -> None:
    """Call in FastAPI lifespan startup."""
    await producer.start()


async def shutdown_producer() -> None:
    """Call in FastAPI lifespan shutdown."""
    await producer.stop()
```

---

## Kafka Consumer

```python
# events/consumer.py
import os
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Optional, Callable, Any
from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

from .topics import TopicName
from .schemas import DeadLetterEvent
from .producer import producer

logger = logging.getLogger(__name__)


class BaseKafkaConsumer(ABC):
    """
    Base class for Kafka consumers with error handling and DLQ support.

    Subclass and implement handle_message() for specific event processing.

    Usage:
        class TaskConsumer(BaseKafkaConsumer):
            async def handle_message(self, message: dict) -> None:
                # Process message
                pass

        consumer = TaskConsumer(
            topics=[TopicName.TASK_EVENTS],
            group_id="notification-service",
        )
        await consumer.start()
    """

    def __init__(
        self,
        topics: list[TopicName],
        group_id: str,
        max_retries: int = 3,
        enable_dlq: bool = True,
    ):
        """
        Initialize consumer.

        Args:
            topics: List of topics to subscribe to
            group_id: Consumer group ID
            max_retries: Max retries before sending to DLQ
            enable_dlq: Whether to send failed messages to DLQ
        """
        self.topics = [t.value for t in topics]
        self.group_id = group_id
        self.max_retries = max_retries
        self.enable_dlq = enable_dlq

        self.bootstrap_servers = os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        )

        self._consumer: Optional[AIOKafkaConsumer] = None
        self._running = False

    async def start(self) -> None:
        """Start the consumer and begin processing messages."""
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            # Deserialization
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            # Consumer settings
            auto_offset_reset="earliest",  # Start from beginning if no offset
            enable_auto_commit=False,  # Manual commit for reliability
            max_poll_records=100,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )

        await self._consumer.start()
        self._running = True

        logger.info(
            f"Consumer started: group={self.group_id}, "
            f"topics={self.topics}"
        )

        # Start consuming in background
        asyncio.create_task(self._consume_loop())

    async def stop(self) -> None:
        """Stop the consumer."""
        self._running = False
        if self._consumer is not None:
            await self._consumer.stop()
            self._consumer = None
            logger.info(f"Consumer stopped: group={self.group_id}")

    async def _consume_loop(self) -> None:
        """Main consumption loop."""
        while self._running:
            try:
                # Fetch messages with timeout
                messages = await self._consumer.getmany(
                    timeout_ms=1000,
                    max_records=100,
                )

                for topic_partition, records in messages.items():
                    for record in records:
                        await self._process_message(record)

                # Commit offsets after successful processing
                if messages:
                    await self._consumer.commit()

            except KafkaError as e:
                logger.error(f"Kafka error in consume loop: {e}")
                await asyncio.sleep(1)  # Backoff on error
            except Exception as e:
                logger.exception(f"Unexpected error in consume loop: {e}")
                await asyncio.sleep(1)

    async def _process_message(self, record) -> None:
        """Process a single message with retry logic."""
        retry_count = 0
        last_error = None

        while retry_count <= self.max_retries:
            try:
                await self.handle_message(record.value)
                logger.debug(
                    f"Message processed: topic={record.topic}, "
                    f"partition={record.partition}, "
                    f"offset={record.offset}"
                )
                return  # Success

            except Exception as e:
                retry_count += 1
                last_error = str(e)
                logger.warning(
                    f"Message processing failed (attempt {retry_count}): {e}"
                )

                if retry_count <= self.max_retries:
                    # Exponential backoff
                    await asyncio.sleep(2 ** retry_count * 0.1)

        # All retries exhausted - send to DLQ
        if self.enable_dlq:
            await self._send_to_dlq(record, last_error, retry_count)

    async def _send_to_dlq(
        self,
        record,
        error: str,
        retry_count: int,
    ) -> None:
        """Send failed message to Dead Letter Queue."""
        dlq_event = DeadLetterEvent(
            original_event=record.value,
            original_topic=record.topic,
            error=error,
            retry_count=retry_count,
            consumer_group=self.group_id,
        )

        try:
            await producer.start()  # Ensure producer is running
            await producer._producer.send_and_wait(
                topic=TopicName.DEAD_LETTER.value,
                value=dlq_event.model_dump(mode="json"),
            )
            logger.error(
                f"Message sent to DLQ: topic={record.topic}, "
                f"error={error}"
            )
        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")

    @abstractmethod
    async def handle_message(self, message: dict) -> None:
        """
        Handle a single message. Implement in subclass.

        Args:
            message: Deserialized message value (dict)

        Raises:
            Exception: If processing fails (will trigger retry)
        """
        pass


class EventRouter:
    """
    Routes events to specific handlers based on event_type.

    Usage:
        router = EventRouter()
        router.register(EventType.TASK_CREATED, handle_task_created)
        router.register(EventType.TASK_COMPLETED, handle_task_completed)

        await router.route(message)
    """

    def __init__(self):
        self._handlers: dict[str, Callable] = {}

    def register(
        self,
        event_type: str,
        handler: Callable[[dict], Any],
    ) -> None:
        """Register a handler for an event type."""
        self._handlers[event_type] = handler

    async def route(self, message: dict) -> None:
        """Route message to appropriate handler."""
        event_type = message.get("event_type")

        if event_type is None:
            raise ValueError("Message missing event_type field")

        handler = self._handlers.get(event_type)

        if handler is None:
            logger.warning(f"No handler registered for event_type: {event_type}")
            return

        # Support both sync and async handlers
        if asyncio.iscoroutinefunction(handler):
            await handler(message)
        else:
            handler(message)
```

---

## Example: Notification Service Consumer

```python
# services/notification/consumer.py
import logging
from events.consumer import BaseKafkaConsumer, EventRouter
from events.topics import TopicName
from events.schemas import EventType

from .handlers import (
    handle_reminder_triggered,
    handle_notification_send,
)

logger = logging.getLogger(__name__)


class NotificationConsumer(BaseKafkaConsumer):
    """
    Consumer for notification service.

    Listens to:
    - reminder-events: Process triggered reminders
    - notification-events: Send notifications
    """

    def __init__(self):
        super().__init__(
            topics=[
                TopicName.REMINDER_EVENTS,
                TopicName.NOTIFICATION_EVENTS,
            ],
            group_id="notification-service",
            max_retries=3,
            enable_dlq=True,
        )

        # Set up event routing
        self.router = EventRouter()
        self.router.register(
            EventType.REMINDER_TRIGGERED.value,
            handle_reminder_triggered,
        )
        self.router.register(
            EventType.NOTIFICATION_SEND.value,
            handle_notification_send,
        )

    async def handle_message(self, message: dict) -> None:
        """Route message to appropriate handler."""
        logger.info(f"Processing event: {message.get('event_type')}")
        await self.router.route(message)
```

```python
# services/notification/handlers.py
import logging
from events.producer import producer
from events.topics import TopicName
from events.schemas import (
    NotificationSendEvent,
    NotificationSentEvent,
    NotificationFailedEvent,
    NotificationPayload,
)

logger = logging.getLogger(__name__)


async def handle_reminder_triggered(message: dict) -> None:
    """
    Handle reminder triggered event.
    Creates a notification send event.
    """
    payload = message.get("payload", {})
    user_id = message.get("user_id")

    # Create notification event
    notification = NotificationSendEvent(
        user_id=user_id,
        correlation_id=message.get("event_id"),
        payload=NotificationPayload(
            notification_id=f"notif-{payload.get('reminder_id')}",
            channel=payload.get("notification_channel", "email"),
            recipient=payload.get("recipient", ""),  # Fetch from user service
            subject=f"Reminder: {payload.get('task_title')}",
            body=f"Don't forget: {payload.get('task_title')}",
            metadata={
                "task_id": payload.get("task_id"),
                "reminder_id": payload.get("reminder_id"),
            },
        ),
    )

    # Send to notification topic
    await producer.send_event(
        TopicName.NOTIFICATION_EVENTS,
        notification,
    )

    logger.info(f"Notification queued for reminder: {payload.get('reminder_id')}")


async def handle_notification_send(message: dict) -> None:
    """
    Handle notification send event.
    Actually delivers the notification.
    """
    payload = message.get("payload", {})
    user_id = message.get("user_id")

    try:
        # TODO: Implement actual notification delivery
        # - Email: SendGrid, SES, etc.
        # - Push: Firebase, OneSignal, etc.
        # - SMS: Twilio, etc.

        channel = payload.get("channel")
        recipient = payload.get("recipient")

        logger.info(f"Sending {channel} notification to {recipient}")

        # Simulate delivery
        # await email_service.send(...)

        # Emit success event
        success_event = NotificationSentEvent(
            user_id=user_id,
            correlation_id=message.get("correlation_id"),
            payload=NotificationPayload(**payload),
        )

        await producer.send_event(
            TopicName.NOTIFICATION_EVENTS,
            success_event,
        )

    except Exception as e:
        # Emit failure event
        failure_event = NotificationFailedEvent(
            user_id=user_id,
            correlation_id=message.get("correlation_id"),
            payload=NotificationPayload(**payload),
            error=str(e),
            retry_count=message.get("retry_count", 0),
            will_retry=message.get("retry_count", 0) < 3,
        )

        await producer.send_event(
            TopicName.NOTIFICATION_EVENTS,
            failure_event,
        )

        raise  # Re-raise for consumer retry logic
```

---

## FastAPI Integration

```python
# main.py - Updated with Kafka
from contextlib import asynccontextmanager
from fastapi import FastAPI

from events.producer import startup_producer, shutdown_producer
from services.notification.consumer import NotificationConsumer


# Consumer instance
notification_consumer = NotificationConsumer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan with Kafka producer and consumer."""
    # Startup
    print("Starting Kafka producer...")
    await startup_producer()

    print("Starting notification consumer...")
    await notification_consumer.start()

    yield

    # Shutdown
    print("Stopping notification consumer...")
    await notification_consumer.stop()

    print("Stopping Kafka producer...")
    await shutdown_producer()


app = FastAPI(lifespan=lifespan)
```

### Emitting Events from Routes

```python
# routes/tasks.py - Updated with event emission
from events.producer import producer, get_producer
from events.topics import TopicName
from events.schemas import TaskCreatedEvent, TaskCompletedEvent, TaskEventPayload


@router.post("/{user_id}/tasks", response_model=TaskResponse)
async def create_task(
    user_id: str,
    task_data: TaskCreate,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """Create task and emit event."""
    verify_user_access(user_id, user)

    # Create task in database
    task = Task(user_id=user_id, **task_data.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)

    # Emit task created event
    event = TaskCreatedEvent(
        user_id=user_id,
        payload=TaskEventPayload(
            task_id=task.id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=task.due_date,
        ),
    )
    await producer.send_event(TopicName.TASK_EVENTS, event)

    return TaskResponse.model_validate(task)


@router.patch("/{user_id}/tasks/{task_id}/complete")
async def complete_task(
    user_id: str,
    task_id: int,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """Complete task and emit event."""
    verify_user_access(user_id, user)

    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = True
    session.add(task)
    session.commit()
    session.refresh(task)

    # Emit task completed event
    event = TaskCompletedEvent(
        user_id=user_id,
        payload=TaskEventPayload(
            task_id=task.id,
            title=task.title,
            completed=True,
            priority=task.priority,
        ),
    )
    await producer.send_event(TopicName.TASK_EVENTS, event)

    return TaskResponse.model_validate(task)
```

---

## Redpanda Cloud Setup

### Environment Variables for Production

```bash
# .env.production

# Redpanda Cloud connection
KAFKA_BOOTSTRAP_SERVERS=seed-xxx.redpanda.cloud:9092
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password

# Client ID for identification
KAFKA_CLIENT_ID=task-service
```

### Production Producer Configuration

```python
# events/producer.py - Production config
import os
from aiokafka import AIOKafkaProducer

def get_producer_config() -> dict:
    """Get producer configuration based on environment."""
    config = {
        "bootstrap_servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        "client_id": os.getenv("KAFKA_CLIENT_ID", "task-service"),
        "acks": "all",
        "enable_idempotence": True,
        "compression_type": "gzip",
    }

    # Add SASL/SSL for production
    security_protocol = os.getenv("KAFKA_SECURITY_PROTOCOL")
    if security_protocol:
        config.update({
            "security_protocol": security_protocol,
            "sasl_mechanism": os.getenv("KAFKA_SASL_MECHANISM", "SCRAM-SHA-256"),
            "sasl_plain_username": os.getenv("KAFKA_SASL_USERNAME"),
            "sasl_plain_password": os.getenv("KAFKA_SASL_PASSWORD"),
        })

    return config
```

---

## Error Handling Best Practices

### 1. Idempotent Consumers

```python
# Use event_id for idempotency
class IdempotentConsumer(BaseKafkaConsumer):
    """Consumer with idempotency check."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._processed_events: set[str] = set()  # Use Redis in production

    async def handle_message(self, message: dict) -> None:
        event_id = message.get("event_id")

        # Check if already processed
        if event_id in self._processed_events:
            logger.info(f"Skipping duplicate event: {event_id}")
            return

        # Process message
        await self._process(message)

        # Mark as processed
        self._processed_events.add(event_id)

    @abstractmethod
    async def _process(self, message: dict) -> None:
        pass
```

### 2. Circuit Breaker Pattern

```python
# events/circuit_breaker.py
import asyncio
from datetime import datetime, timedelta
from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


class CircuitBreaker:
    """Circuit breaker for external service calls."""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: datetime | None = None

    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _should_attempt_reset(self) -> bool:
        if self.last_failure_time is None:
            return True
        return datetime.utcnow() - self.last_failure_time > timedelta(
            seconds=self.recovery_timeout
        )

    def _on_success(self) -> None:
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

---

## Testing

```python
# tests/test_kafka.py
import pytest
from unittest.mock import AsyncMock, patch
from events.producer import KafkaProducer
from events.schemas import TaskCreatedEvent, TaskEventPayload, EventType


@pytest.fixture
def mock_producer():
    """Create mock producer for testing."""
    with patch("events.producer.AIOKafkaProducer") as mock:
        producer = KafkaProducer()
        producer._producer = AsyncMock()
        producer._producer.send_and_wait = AsyncMock()
        yield producer


@pytest.mark.asyncio
async def test_send_event(mock_producer):
    """Test sending an event."""
    event = TaskCreatedEvent(
        user_id="user-123",
        payload=TaskEventPayload(
            task_id=1,
            title="Test Task",
        ),
    )

    mock_producer._producer.send_and_wait.return_value = AsyncMock(
        partition=0,
        offset=100,
    )

    result = await mock_producer.send_event(
        TopicName.TASK_EVENTS,
        event,
    )

    assert result is True
    mock_producer._producer.send_and_wait.assert_called_once()


@pytest.mark.asyncio
async def test_event_serialization():
    """Test event serialization."""
    event = TaskCreatedEvent(
        user_id="user-123",
        payload=TaskEventPayload(
            task_id=1,
            title="Test Task",
            priority="high",
        ),
    )

    data = event.model_dump(mode="json")

    assert data["event_type"] == EventType.TASK_CREATED.value
    assert data["user_id"] == "user-123"
    assert data["payload"]["task_id"] == 1
    assert "event_id" in data
    assert "timestamp" in data
```

---

## Quick Reference

### CLI Commands (rpk)

```bash
# Cluster
rpk cluster health
rpk cluster info

# Topics
rpk topic create <name> --partitions 3
rpk topic list
rpk topic describe <name>
rpk topic delete <name>

# Consumer groups
rpk group list
rpk group describe <group-id>
rpk group seek <group-id> --to start  # Reset to beginning
rpk group seek <group-id> --to end    # Skip to end

# Produce/Consume (testing)
rpk topic produce <topic>
rpk topic consume <topic> --group test-group

# Configuration
rpk topic alter-config <topic> --set retention.ms=86400000
```

### Common Patterns

```python
# Partition key for ordering
key = f"user-{user_id}"  # All user events to same partition

# Correlation ID for tracing
correlation_id = f"req-{uuid4()}"

# Event versioning
version = "1.0"  # Include in all events

# Timestamp handling
timestamp = datetime.utcnow().isoformat()
```

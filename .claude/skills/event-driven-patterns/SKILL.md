# Event-Driven Patterns Skill

## Purpose

Guide for implementing event-driven architecture patterns in the Phase II Todo Chatbot application. Covers pub/sub messaging, event schema design, idempotent processing, saga orchestration, dead letter queues, and CQRS for scalable microservices.

## Technology Stack

- **Redpanda/Kafka** - Event streaming platform
- **aiokafka** - Async Kafka client for Python
- **Pydantic** - Event schema validation
- **PostgreSQL** - Event store and read models
- **Redis** - Idempotency cache
- **FastAPI** - Event handlers

---

## Core Concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVENT-DRIVEN ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

  PRODUCERS                    EVENT BUS                      CONSUMERS
  ─────────                    ─────────                      ─────────

┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ Task Service │──publish──│              │──consume──│  Notification │
└──────────────┘           │              │           │    Service    │
                           │   Redpanda   │           └──────────────┘
┌──────────────┐           │    Kafka     │           ┌──────────────┐
│ Chat Service │──publish──│              │──consume──│   Recurring   │
└──────────────┘           │   Topics:    │           │ Task Service  │
                           │  - tasks     │           └──────────────┘
┌──────────────┐           │  - reminders │           ┌──────────────┐
│ Reminder Svc │──publish──│  - notifs    │──consume──│   Analytics   │
└──────────────┘           └──────────────┘           │    Service    │
                                  │                   └──────────────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │ Dead Letter  │
                           │    Queue     │
                           └──────────────┘
```

---

## Pub/Sub Pattern

### Topic Design

```python
# events/topics.py
from enum import Enum
from dataclasses import dataclass
from typing import Optional


class TopicName(str, Enum):
    """
    Topic naming convention: <domain>.<entity>.<version>

    Examples:
    - tasks.events.v1
    - reminders.events.v1
    - notifications.commands.v1
    """
    # Domain events (facts that happened)
    TASK_EVENTS = "tasks.events.v1"
    REMINDER_EVENTS = "reminders.events.v1"
    USER_EVENTS = "users.events.v1"

    # Commands (requests for action)
    NOTIFICATION_COMMANDS = "notifications.commands.v1"
    RECURRING_COMMANDS = "recurring.commands.v1"

    # System topics
    DEAD_LETTER = "system.dlq.v1"
    AUDIT_LOG = "system.audit.v1"


@dataclass
class TopicConfig:
    """Topic configuration for Kafka/Redpanda."""
    name: TopicName
    partitions: int = 6
    replication_factor: int = 3
    retention_ms: int = 604800000  # 7 days
    cleanup_policy: str = "delete"
    min_insync_replicas: int = 2

    # Partition key strategy
    partition_key: str = "user_id"  # Events for same user go to same partition


# Topic configurations
TOPIC_CONFIGS = {
    TopicName.TASK_EVENTS: TopicConfig(
        name=TopicName.TASK_EVENTS,
        partitions=6,
        retention_ms=604800000,  # 7 days
    ),
    TopicName.REMINDER_EVENTS: TopicConfig(
        name=TopicName.REMINDER_EVENTS,
        partitions=3,
        retention_ms=259200000,  # 3 days
    ),
    TopicName.NOTIFICATION_COMMANDS: TopicConfig(
        name=TopicName.NOTIFICATION_COMMANDS,
        partitions=6,
        retention_ms=86400000,  # 1 day
    ),
    TopicName.DEAD_LETTER: TopicConfig(
        name=TopicName.DEAD_LETTER,
        partitions=1,
        retention_ms=2592000000,  # 30 days
        cleanup_policy="compact",
    ),
}
```

### Publisher Implementation

```python
# events/publisher.py
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError
import asyncio

from .topics import TopicName
from .schemas import BaseEvent

logger = logging.getLogger(__name__)


class EventPublisher:
    """
    Publishes events to Kafka topics.

    Features:
    - Automatic serialization
    - Partition key routing (user_id for ordering)
    - Retry with backoff
    - Delivery confirmation
    """

    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self._producer: Optional[AIOKafkaProducer] = None
        self._started = False

    async def start(self) -> None:
        """Start the producer."""
        if self._started:
            return

        self._producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            # Serialization
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            # Reliability
            acks="all",  # Wait for all replicas
            enable_idempotence=True,  # Exactly-once semantics
            max_in_flight_requests_per_connection=5,
            retries=3,
            retry_backoff_ms=100,
            # Performance
            linger_ms=5,
            batch_size=16384,
            compression_type="lz4",
        )

        await self._producer.start()
        self._started = True
        logger.info("Event publisher started")

    async def stop(self) -> None:
        """Stop the producer."""
        if self._producer:
            await self._producer.stop()
            self._started = False
            logger.info("Event publisher stopped")

    async def publish(
        self,
        topic: TopicName,
        event: BaseEvent,
        partition_key: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> bool:
        """
        Publish an event to a topic.

        Args:
            topic: Target topic
            event: Event to publish (Pydantic model)
            partition_key: Key for partition routing (default: event.user_id)
            headers: Optional message headers

        Returns:
            True if published successfully
        """
        if not self._started:
            raise RuntimeError("Publisher not started")

        try:
            # Use user_id as partition key for ordering guarantee
            key = partition_key or event.user_id

            # Serialize event
            value = event.model_dump(mode="json")

            # Prepare headers
            kafka_headers = []
            if headers:
                kafka_headers = [(k, v.encode()) for k, v in headers.items()]

            # Add standard headers
            kafka_headers.extend([
                ("event_type", event.event_type.encode()),
                ("event_id", event.event_id.encode()),
                ("timestamp", event.timestamp.isoformat().encode()),
            ])

            # Send message
            result = await self._producer.send_and_wait(
                topic=topic.value,
                key=key,
                value=value,
                headers=kafka_headers,
            )

            logger.info(
                f"Event published: topic={topic.value}, "
                f"partition={result.partition}, "
                f"offset={result.offset}, "
                f"event_id={event.event_id}"
            )

            return True

        except KafkaError as e:
            logger.error(f"Failed to publish event: {e}")
            return False

    async def publish_batch(
        self,
        topic: TopicName,
        events: list[BaseEvent],
    ) -> tuple[int, int]:
        """
        Publish multiple events.

        Returns:
            Tuple of (success_count, failure_count)
        """
        success = 0
        failure = 0

        for event in events:
            if await self.publish(topic, event):
                success += 1
            else:
                failure += 1

        return success, failure


# Global publisher instance
publisher = EventPublisher()
```

### Subscriber Implementation

```python
# events/subscriber.py
import json
import logging
from abc import ABC, abstractmethod
from typing import Callable, Dict, List, Optional, Any
from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError
import asyncio

from .topics import TopicName

logger = logging.getLogger(__name__)


class EventSubscriber(ABC):
    """
    Base class for event subscribers.

    Features:
    - Consumer group management
    - Manual offset commit (at-least-once)
    - Error handling with DLQ
    - Graceful shutdown
    """

    def __init__(
        self,
        topics: List[TopicName],
        group_id: str,
        bootstrap_servers: str = "localhost:9092",
    ):
        self.topics = [t.value for t in topics]
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._running = False
        self._handlers: Dict[str, Callable] = {}

    def register_handler(
        self,
        event_type: str,
        handler: Callable[[Dict[str, Any]], Any],
    ) -> None:
        """Register a handler for an event type."""
        self._handlers[event_type] = handler

    async def start(self) -> None:
        """Start consuming events."""
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            # Deserialization
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            # Consumer settings
            auto_offset_reset="earliest",
            enable_auto_commit=False,  # Manual commit
            max_poll_records=100,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
            # Isolation
            isolation_level="read_committed",
        )

        await self._consumer.start()
        self._running = True

        logger.info(f"Subscriber started: group={self.group_id}, topics={self.topics}")

        # Start consumption loop
        asyncio.create_task(self._consume())

    async def stop(self) -> None:
        """Stop consuming events."""
        self._running = False
        if self._consumer:
            await self._consumer.stop()
            logger.info(f"Subscriber stopped: group={self.group_id}")

    async def _consume(self) -> None:
        """Main consumption loop."""
        while self._running:
            try:
                # Fetch messages
                messages = await self._consumer.getmany(
                    timeout_ms=1000,
                    max_records=100,
                )

                for tp, records in messages.items():
                    for record in records:
                        await self._process_message(record)

                # Commit offsets after successful processing
                if messages:
                    await self._consumer.commit()

            except KafkaError as e:
                logger.error(f"Kafka error: {e}")
                await asyncio.sleep(1)
            except Exception as e:
                logger.exception(f"Unexpected error: {e}")
                await asyncio.sleep(1)

    async def _process_message(self, record) -> None:
        """Process a single message."""
        try:
            event = record.value
            event_type = event.get("event_type")

            logger.debug(
                f"Processing: topic={record.topic}, "
                f"partition={record.partition}, "
                f"offset={record.offset}, "
                f"event_type={event_type}"
            )

            # Route to handler
            handler = self._handlers.get(event_type)
            if handler:
                await self._invoke_handler(handler, event)
            else:
                logger.warning(f"No handler for event_type: {event_type}")

        except Exception as e:
            logger.error(f"Failed to process message: {e}")
            await self._handle_error(record, e)

    async def _invoke_handler(
        self,
        handler: Callable,
        event: Dict[str, Any],
    ) -> None:
        """Invoke handler with error handling."""
        if asyncio.iscoroutinefunction(handler):
            await handler(event)
        else:
            handler(event)

    @abstractmethod
    async def _handle_error(self, record, error: Exception) -> None:
        """Handle processing errors. Implement in subclass."""
        pass
```

---

## Event Schema Design

### Base Event Schema

```python
# events/schemas.py
from datetime import datetime
from enum import Enum
from typing import Optional, Any, Dict, Generic, TypeVar
from pydantic import BaseModel, Field, ConfigDict
import uuid


T = TypeVar("T", bound=BaseModel)


class EventType(str, Enum):
    """All event types in the system."""
    # Task domain
    TASK_CREATED = "task.created"
    TASK_UPDATED = "task.updated"
    TASK_COMPLETED = "task.completed"
    TASK_DELETED = "task.deleted"
    TASK_RESTORED = "task.restored"

    # Reminder domain
    REMINDER_SCHEDULED = "reminder.scheduled"
    REMINDER_TRIGGERED = "reminder.triggered"
    REMINDER_CANCELLED = "reminder.cancelled"
    REMINDER_SNOOZED = "reminder.snoozed"

    # Notification domain
    NOTIFICATION_REQUESTED = "notification.requested"
    NOTIFICATION_SENT = "notification.sent"
    NOTIFICATION_FAILED = "notification.failed"
    NOTIFICATION_DELIVERED = "notification.delivered"

    # Recurring task domain
    RECURRING_PATTERN_CREATED = "recurring.pattern.created"
    RECURRING_PATTERN_UPDATED = "recurring.pattern.updated"
    RECURRING_TASK_GENERATED = "recurring.task.generated"

    # Saga events
    SAGA_STARTED = "saga.started"
    SAGA_STEP_COMPLETED = "saga.step.completed"
    SAGA_STEP_FAILED = "saga.step.failed"
    SAGA_COMPLETED = "saga.completed"
    SAGA_COMPENSATING = "saga.compensating"
    SAGA_FAILED = "saga.failed"


class BaseEvent(BaseModel):
    """
    Base event schema following CloudEvents specification.

    All events MUST include:
    - event_id: Unique identifier
    - event_type: Type of event
    - timestamp: When event occurred
    - user_id: Owner of the event (for isolation)
    - version: Schema version for evolution
    """

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
        use_enum_values=True,
    )

    # CloudEvents required fields
    event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique event identifier",
    )
    event_type: str = Field(
        description="Type of event",
    )
    source: str = Field(
        default="todo-chatbot",
        description="Event source system",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Event timestamp in UTC",
    )

    # Application fields
    user_id: str = Field(
        description="User who owns this event (CRITICAL for isolation)",
    )
    version: str = Field(
        default="1.0",
        description="Event schema version",
    )

    # Tracing
    correlation_id: Optional[str] = Field(
        default=None,
        description="Correlation ID for tracing across services",
    )
    causation_id: Optional[str] = Field(
        default=None,
        description="ID of event that caused this event",
    )

    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional metadata",
    )


class EventEnvelope(BaseModel, Generic[T]):
    """
    Event envelope for type-safe event handling.

    Wraps payload with common event fields.
    """

    event_id: str
    event_type: EventType
    timestamp: datetime
    user_id: str
    version: str
    payload: T
    correlation_id: Optional[str] = None


# ============================================================
# Task Events
# ============================================================

class TaskPayload(BaseModel):
    """Common task payload fields."""
    task_id: int
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None


class TaskCreatedEvent(BaseEvent):
    """Emitted when a new task is created."""
    event_type: str = EventType.TASK_CREATED.value
    payload: TaskPayload


class TaskCompletedEvent(BaseEvent):
    """Emitted when a task is marked complete."""
    event_type: str = EventType.TASK_COMPLETED.value
    payload: TaskPayload
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class TaskDeletedEvent(BaseEvent):
    """Emitted when a task is deleted."""
    event_type: str = EventType.TASK_DELETED.value
    payload: TaskPayload
    deleted_at: datetime = Field(default_factory=datetime.utcnow)
    soft_delete: bool = True


# ============================================================
# Reminder Events
# ============================================================

class ReminderPayload(BaseModel):
    """Reminder payload fields."""
    reminder_id: int
    task_id: int
    task_title: str
    scheduled_time: datetime
    channels: list[str] = ["email"]


class ReminderScheduledEvent(BaseEvent):
    """Emitted when a reminder is scheduled."""
    event_type: str = EventType.REMINDER_SCHEDULED.value
    payload: ReminderPayload


class ReminderTriggeredEvent(BaseEvent):
    """Emitted when a reminder time is reached."""
    event_type: str = EventType.REMINDER_TRIGGERED.value
    payload: ReminderPayload
    triggered_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Notification Commands
# ============================================================

class NotificationPayload(BaseModel):
    """Notification command payload."""
    notification_id: str
    channel: str  # email, push, sms
    recipient: str
    subject: str
    body: str
    priority: str = "normal"
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None


class NotificationRequestedEvent(BaseEvent):
    """Command to send a notification."""
    event_type: str = EventType.NOTIFICATION_REQUESTED.value
    payload: NotificationPayload


class NotificationSentEvent(BaseEvent):
    """Emitted when notification is sent."""
    event_type: str = EventType.NOTIFICATION_SENT.value
    payload: NotificationPayload
    provider_message_id: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationFailedEvent(BaseEvent):
    """Emitted when notification delivery fails."""
    event_type: str = EventType.NOTIFICATION_FAILED.value
    payload: NotificationPayload
    error_code: str
    error_message: str
    retry_count: int = 0
    will_retry: bool = False
```

### Schema Evolution

```python
# events/schema_registry.py
"""
Schema registry for event versioning and evolution.

Supports:
- Backward compatibility (new consumers read old events)
- Forward compatibility (old consumers read new events)
- Full compatibility (both directions)
"""

from typing import Dict, Type, Optional
from pydantic import BaseModel
import json


class SchemaRegistry:
    """
    In-memory schema registry for event schema management.

    In production, use Confluent Schema Registry or similar.
    """

    def __init__(self):
        self._schemas: Dict[str, Dict[str, Type[BaseModel]]] = {}

    def register(
        self,
        event_type: str,
        version: str,
        schema: Type[BaseModel],
    ) -> None:
        """Register a schema version."""
        if event_type not in self._schemas:
            self._schemas[event_type] = {}
        self._schemas[event_type][version] = schema

    def get_schema(
        self,
        event_type: str,
        version: str,
    ) -> Optional[Type[BaseModel]]:
        """Get schema for event type and version."""
        return self._schemas.get(event_type, {}).get(version)

    def get_latest_version(self, event_type: str) -> Optional[str]:
        """Get latest version for event type."""
        versions = self._schemas.get(event_type, {})
        if not versions:
            return None
        return max(versions.keys())

    def validate(
        self,
        event_type: str,
        version: str,
        data: dict,
    ) -> BaseModel:
        """Validate event data against schema."""
        schema = self.get_schema(event_type, version)
        if not schema:
            raise ValueError(f"Unknown schema: {event_type} v{version}")
        return schema.model_validate(data)


# Global registry
schema_registry = SchemaRegistry()

# Register schemas
schema_registry.register("task.created", "1.0", TaskCreatedEvent)
schema_registry.register("task.completed", "1.0", TaskCompletedEvent)
schema_registry.register("reminder.triggered", "1.0", ReminderTriggeredEvent)


# Schema evolution example
class TaskCreatedEventV2(TaskCreatedEvent):
    """
    V2 adds optional category field.
    Backward compatible: old events work (category defaults to None)
    """
    version: str = "2.0"

    class TaskPayloadV2(TaskPayload):
        category_id: Optional[int] = None  # New optional field

    payload: TaskPayloadV2


schema_registry.register("task.created", "2.0", TaskCreatedEventV2)
```

---

## Idempotency

### Idempotent Consumer

```python
# events/idempotency.py
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Any, Callable
from functools import wraps
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class IdempotencyStore:
    """
    Store for tracking processed events.

    Uses Redis for fast lookups with automatic expiration.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        prefix: str = "idempotency",
        ttl_hours: int = 24,
    ):
        self.redis_url = redis_url
        self.prefix = prefix
        self.ttl = timedelta(hours=ttl_hours)
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        self._client = redis.from_url(self.redis_url)

    async def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()

    def _make_key(self, event_id: str, consumer_group: str) -> str:
        """Generate unique key for event + consumer."""
        return f"{self.prefix}:{consumer_group}:{event_id}"

    async def is_processed(
        self,
        event_id: str,
        consumer_group: str,
    ) -> bool:
        """Check if event was already processed."""
        key = self._make_key(event_id, consumer_group)
        return await self._client.exists(key) > 0

    async def mark_processed(
        self,
        event_id: str,
        consumer_group: str,
        result: Optional[dict] = None,
    ) -> None:
        """Mark event as processed."""
        key = self._make_key(event_id, consumer_group)
        value = json.dumps({
            "processed_at": datetime.utcnow().isoformat(),
            "result": result,
        })
        await self._client.setex(key, self.ttl, value)

    async def get_result(
        self,
        event_id: str,
        consumer_group: str,
    ) -> Optional[dict]:
        """Get cached result for processed event."""
        key = self._make_key(event_id, consumer_group)
        data = await self._client.get(key)
        if data:
            return json.loads(data).get("result")
        return None


class IdempotentProcessor:
    """
    Wraps event handlers with idempotency checks.

    Ensures events are processed exactly once per consumer group.
    """

    def __init__(
        self,
        store: IdempotencyStore,
        consumer_group: str,
    ):
        self.store = store
        self.consumer_group = consumer_group

    async def process(
        self,
        event: dict,
        handler: Callable,
    ) -> Any:
        """
        Process event with idempotency check.

        Args:
            event: Event dict with event_id
            handler: Async handler function

        Returns:
            Handler result (cached if already processed)
        """
        event_id = event.get("event_id")

        if not event_id:
            logger.warning("Event missing event_id, processing without idempotency")
            return await handler(event)

        # Check if already processed
        if await self.store.is_processed(event_id, self.consumer_group):
            logger.info(f"Event already processed: {event_id}")
            return await self.store.get_result(event_id, self.consumer_group)

        # Process event
        try:
            result = await handler(event)

            # Mark as processed
            await self.store.mark_processed(
                event_id,
                self.consumer_group,
                result if isinstance(result, dict) else None,
            )

            return result

        except Exception as e:
            # Don't mark as processed on failure
            logger.error(f"Event processing failed: {event_id}, error: {e}")
            raise


def idempotent(consumer_group: str, store: IdempotencyStore):
    """
    Decorator for idempotent event handlers.

    Usage:
        @idempotent("notification-service", idempotency_store)
        async def handle_reminder_triggered(event: dict):
            ...
    """
    processor = IdempotentProcessor(store, consumer_group)

    def decorator(handler: Callable):
        @wraps(handler)
        async def wrapper(event: dict, *args, **kwargs):
            return await processor.process(
                event,
                lambda e: handler(e, *args, **kwargs),
            )
        return wrapper

    return decorator


# ============================================================
# Database-based Idempotency (Alternative)
# ============================================================

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, func, Index


class ProcessedEvent(SQLModel, table=True):
    """
    Database table for idempotency tracking.

    Use when Redis is not available or for audit requirements.
    """

    __tablename__ = "processed_events"
    __table_args__ = (
        Index("ix_processed_events_lookup", "event_id", "consumer_group"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(index=True)
    consumer_group: str
    event_type: str
    processed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    result_hash: Optional[str] = None


class DatabaseIdempotencyStore:
    """Database-based idempotency store."""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def is_processed(
        self,
        event_id: str,
        consumer_group: str,
    ) -> bool:
        async with self.session_factory() as session:
            result = await session.exec(
                select(ProcessedEvent)
                .where(ProcessedEvent.event_id == event_id)
                .where(ProcessedEvent.consumer_group == consumer_group)
            )
            return result.first() is not None

    async def mark_processed(
        self,
        event_id: str,
        consumer_group: str,
        event_type: str,
        result: Optional[dict] = None,
    ) -> None:
        async with self.session_factory() as session:
            processed = ProcessedEvent(
                event_id=event_id,
                consumer_group=consumer_group,
                event_type=event_type,
                result_hash=hashlib.sha256(
                    json.dumps(result or {}).encode()
                ).hexdigest() if result else None,
            )
            session.add(processed)
            await session.commit()
```

---

## SAGA Pattern

### Saga Orchestrator

```python
# sagas/orchestrator.py
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid
import asyncio

logger = logging.getLogger(__name__)


class SagaState(str, Enum):
    """Saga execution states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"
    FAILED = "failed"


class StepState(str, Enum):
    """Individual step states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"
    SKIPPED = "skipped"


@dataclass
class SagaStep:
    """Definition of a saga step."""
    name: str
    action: Callable[["SagaContext"], Any]
    compensation: Optional[Callable[["SagaContext"], Any]] = None
    timeout_seconds: int = 30
    retries: int = 3


@dataclass
class StepResult:
    """Result of a step execution."""
    step_name: str
    state: StepState
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class SagaContext:
    """
    Context passed through saga steps.

    Contains data needed by steps and results from previous steps.
    """
    saga_id: str
    user_id: str
    data: Dict[str, Any] = field(default_factory=dict)
    results: Dict[str, Any] = field(default_factory=dict)

    def set(self, key: str, value: Any) -> None:
        """Store value in context."""
        self.data[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Get value from context."""
        return self.data.get(key, default)

    def set_result(self, step_name: str, result: Any) -> None:
        """Store step result."""
        self.results[step_name] = result

    def get_result(self, step_name: str) -> Any:
        """Get step result."""
        return self.results.get(step_name)


class Saga(ABC):
    """
    Base class for saga definitions.

    Implement by defining steps and their compensations.
    """

    def __init__(self):
        self.steps: List[SagaStep] = []
        self._define_steps()

    @abstractmethod
    def _define_steps(self) -> None:
        """Define saga steps. Override in subclass."""
        pass

    def add_step(
        self,
        name: str,
        action: Callable[[SagaContext], Any],
        compensation: Optional[Callable[[SagaContext], Any]] = None,
        timeout_seconds: int = 30,
        retries: int = 3,
    ) -> "Saga":
        """Add a step to the saga."""
        self.steps.append(SagaStep(
            name=name,
            action=action,
            compensation=compensation,
            timeout_seconds=timeout_seconds,
            retries=retries,
        ))
        return self


@dataclass
class SagaExecution:
    """Tracks saga execution state."""
    saga_id: str
    saga_name: str
    state: SagaState = SagaState.PENDING
    current_step: int = 0
    step_results: List[StepResult] = field(default_factory=list)
    context: Optional[SagaContext] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class SagaOrchestrator:
    """
    Executes sagas with automatic compensation on failure.

    Features:
    - Sequential step execution
    - Automatic rollback on failure
    - Retry support for transient failures
    - Timeout handling
    - Execution persistence
    """

    def __init__(self, store: "SagaStore"):
        self.store = store

    async def execute(
        self,
        saga: Saga,
        context: SagaContext,
    ) -> SagaExecution:
        """
        Execute a saga.

        Args:
            saga: Saga definition
            context: Execution context

        Returns:
            SagaExecution with final state
        """
        execution = SagaExecution(
            saga_id=context.saga_id,
            saga_name=saga.__class__.__name__,
            context=context,
            started_at=datetime.utcnow(),
        )

        await self.store.save(execution)

        try:
            execution.state = SagaState.RUNNING
            await self.store.save(execution)

            # Execute steps
            for i, step in enumerate(saga.steps):
                execution.current_step = i
                step_result = await self._execute_step(step, context)
                execution.step_results.append(step_result)
                await self.store.save(execution)

                if step_result.state == StepState.FAILED:
                    # Start compensation
                    execution.state = SagaState.COMPENSATING
                    execution.error = step_result.error
                    await self.store.save(execution)
                    await self._compensate(saga, execution, i - 1)
                    execution.state = SagaState.FAILED
                    break
            else:
                # All steps completed
                execution.state = SagaState.COMPLETED

        except Exception as e:
            logger.exception(f"Saga execution failed: {e}")
            execution.state = SagaState.FAILED
            execution.error = str(e)

        execution.completed_at = datetime.utcnow()
        await self.store.save(execution)

        return execution

    async def _execute_step(
        self,
        step: SagaStep,
        context: SagaContext,
    ) -> StepResult:
        """Execute a single step with retries."""
        result = StepResult(
            step_name=step.name,
            state=StepState.RUNNING,
            started_at=datetime.utcnow(),
        )

        for attempt in range(step.retries):
            try:
                # Execute with timeout
                step_result = await asyncio.wait_for(
                    self._invoke_action(step.action, context),
                    timeout=step.timeout_seconds,
                )

                result.state = StepState.COMPLETED
                result.result = step_result
                context.set_result(step.name, step_result)

                logger.info(f"Step completed: {step.name}")
                break

            except asyncio.TimeoutError:
                result.error = f"Step timed out after {step.timeout_seconds}s"
                logger.warning(f"Step timeout: {step.name}, attempt {attempt + 1}")

            except Exception as e:
                result.error = str(e)
                logger.warning(
                    f"Step failed: {step.name}, attempt {attempt + 1}, error: {e}"
                )

            if attempt < step.retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        else:
            result.state = StepState.FAILED

        result.completed_at = datetime.utcnow()
        return result

    async def _compensate(
        self,
        saga: Saga,
        execution: SagaExecution,
        from_step: int,
    ) -> None:
        """Execute compensations in reverse order."""
        logger.info(f"Starting compensation from step {from_step}")

        for i in range(from_step, -1, -1):
            step = saga.steps[i]
            step_result = execution.step_results[i]

            if step_result.state != StepState.COMPLETED:
                continue  # Only compensate completed steps

            if step.compensation is None:
                logger.debug(f"No compensation for step: {step.name}")
                continue

            try:
                compensation_result = StepResult(
                    step_name=f"{step.name}_compensation",
                    state=StepState.RUNNING,
                    started_at=datetime.utcnow(),
                )

                await self._invoke_action(step.compensation, execution.context)

                compensation_result.state = StepState.COMPENSATED
                logger.info(f"Compensation completed: {step.name}")

            except Exception as e:
                logger.error(f"Compensation failed: {step.name}, error: {e}")
                # Continue with other compensations

            compensation_result.completed_at = datetime.utcnow()
            execution.step_results.append(compensation_result)

        execution.state = SagaState.COMPENSATED

    async def _invoke_action(
        self,
        action: Callable,
        context: SagaContext,
    ) -> Any:
        """Invoke action (sync or async)."""
        if asyncio.iscoroutinefunction(action):
            return await action(context)
        return action(context)


class SagaStore(ABC):
    """Abstract store for saga persistence."""

    @abstractmethod
    async def save(self, execution: SagaExecution) -> None:
        pass

    @abstractmethod
    async def get(self, saga_id: str) -> Optional[SagaExecution]:
        pass

    @abstractmethod
    async def get_pending(self) -> List[SagaExecution]:
        pass
```

### Example Saga: Task Completion

```python
# sagas/task_completion_saga.py
from sagas.orchestrator import Saga, SagaContext, SagaOrchestrator
from events.publisher import publisher
from events.topics import TopicName
from events.schemas import TaskCompletedEvent, TaskPayload
import logging

logger = logging.getLogger(__name__)


class TaskCompletionSaga(Saga):
    """
    Saga for completing a task.

    Steps:
    1. Mark task as completed in database
    2. Cancel active reminders
    3. Check for recurring pattern and create next task
    4. Send completion notification

    Compensations:
    1. Mark task as incomplete
    2. Restore cancelled reminders
    3. Delete created recurring task (if any)
    4. (No compensation for notification)
    """

    def __init__(
        self,
        task_service,
        reminder_service,
        recurring_service,
        notification_service,
    ):
        self.task_service = task_service
        self.reminder_service = reminder_service
        self.recurring_service = recurring_service
        self.notification_service = notification_service
        super().__init__()

    def _define_steps(self) -> None:
        self.add_step(
            name="complete_task",
            action=self._complete_task,
            compensation=self._uncomplete_task,
            timeout_seconds=10,
        )

        self.add_step(
            name="cancel_reminders",
            action=self._cancel_reminders,
            compensation=self._restore_reminders,
            timeout_seconds=10,
        )

        self.add_step(
            name="handle_recurring",
            action=self._handle_recurring,
            compensation=self._delete_recurring_task,
            timeout_seconds=15,
        )

        self.add_step(
            name="send_notification",
            action=self._send_notification,
            compensation=None,  # Notification cannot be "unsent"
            timeout_seconds=30,
        )

    async def _complete_task(self, ctx: SagaContext) -> dict:
        """Mark task as completed."""
        task_id = ctx.get("task_id")
        user_id = ctx.user_id

        task = await self.task_service.complete_task(task_id, user_id)

        # Store for potential compensation
        ctx.set("original_task_state", {"completed": False})

        return {"task_id": task.id, "completed_at": task.completed_at}

    async def _uncomplete_task(self, ctx: SagaContext) -> None:
        """Compensation: Revert task to incomplete."""
        task_id = ctx.get("task_id")
        user_id = ctx.user_id

        await self.task_service.uncomplete_task(task_id, user_id)
        logger.info(f"Compensation: Task {task_id} reverted to incomplete")

    async def _cancel_reminders(self, ctx: SagaContext) -> dict:
        """Cancel active reminders for the task."""
        task_id = ctx.get("task_id")
        user_id = ctx.user_id

        cancelled = await self.reminder_service.cancel_task_reminders(
            task_id, user_id
        )

        # Store cancelled reminder IDs for potential restoration
        ctx.set("cancelled_reminder_ids", cancelled)

        return {"cancelled_count": len(cancelled)}

    async def _restore_reminders(self, ctx: SagaContext) -> None:
        """Compensation: Restore cancelled reminders."""
        reminder_ids = ctx.get("cancelled_reminder_ids", [])
        user_id = ctx.user_id

        for reminder_id in reminder_ids:
            await self.reminder_service.restore_reminder(reminder_id, user_id)

        logger.info(f"Compensation: Restored {len(reminder_ids)} reminders")

    async def _handle_recurring(self, ctx: SagaContext) -> dict:
        """Check if task is recurring and create next instance."""
        task_id = ctx.get("task_id")
        user_id = ctx.user_id

        result = await self.recurring_service.handle_task_completion(
            task_id, user_id
        )

        if result and result.get("new_task_id"):
            ctx.set("created_recurring_task_id", result["new_task_id"])

        return result or {"recurring": False}

    async def _delete_recurring_task(self, ctx: SagaContext) -> None:
        """Compensation: Delete created recurring task."""
        new_task_id = ctx.get("created_recurring_task_id")
        user_id = ctx.user_id

        if new_task_id:
            await self.task_service.delete_task(new_task_id, user_id)
            logger.info(f"Compensation: Deleted recurring task {new_task_id}")

    async def _send_notification(self, ctx: SagaContext) -> dict:
        """Send task completion notification."""
        task_id = ctx.get("task_id")
        user_id = ctx.user_id

        await self.notification_service.send_completion_notification(
            task_id, user_id
        )

        return {"notification_sent": True}


# Usage
async def complete_task_with_saga(
    task_id: int,
    user_id: str,
    services: dict,
    saga_store: SagaStore,
) -> SagaExecution:
    """Execute task completion saga."""
    saga = TaskCompletionSaga(
        task_service=services["task"],
        reminder_service=services["reminder"],
        recurring_service=services["recurring"],
        notification_service=services["notification"],
    )

    context = SagaContext(
        saga_id=str(uuid.uuid4()),
        user_id=user_id,
        data={"task_id": task_id},
    )

    orchestrator = SagaOrchestrator(saga_store)
    return await orchestrator.execute(saga, context)
```

---

## Dead Letter Queue

### DLQ Implementation

```python
# events/dlq.py
import json
import logging
from datetime import datetime
from typing import Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum

from .publisher import EventPublisher
from .topics import TopicName

logger = logging.getLogger(__name__)


class DLQReason(str, Enum):
    """Reasons for sending to DLQ."""
    DESERIALIZATION_ERROR = "deserialization_error"
    VALIDATION_ERROR = "validation_error"
    PROCESSING_ERROR = "processing_error"
    MAX_RETRIES_EXCEEDED = "max_retries_exceeded"
    POISON_MESSAGE = "poison_message"
    UNKNOWN_EVENT_TYPE = "unknown_event_type"


@dataclass
class DeadLetter:
    """Dead letter message wrapper."""
    id: str
    original_topic: str
    original_partition: int
    original_offset: int
    original_key: Optional[str]
    original_value: Any
    original_headers: dict

    reason: DLQReason
    error_message: str
    error_stack: Optional[str] = None

    consumer_group: str
    retry_count: int = 0
    first_failed_at: datetime = field(default_factory=datetime.utcnow)
    last_failed_at: datetime = field(default_factory=datetime.utcnow)

    # Resolution
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_action: Optional[str] = None  # retry, skip, manual


class DeadLetterQueue:
    """
    Manages dead letter queue operations.

    Features:
    - Capture failed messages with context
    - Retry failed messages
    - Monitor DLQ depth
    - Alert on threshold
    """

    def __init__(
        self,
        publisher: EventPublisher,
        topic: TopicName = TopicName.DEAD_LETTER,
        max_retries: int = 3,
    ):
        self.publisher = publisher
        self.topic = topic
        self.max_retries = max_retries

    async def send_to_dlq(
        self,
        record,
        reason: DLQReason,
        error: Exception,
        consumer_group: str,
        retry_count: int = 0,
    ) -> None:
        """
        Send a failed message to the DLQ.

        Args:
            record: Original Kafka record
            reason: Reason for failure
            error: Exception that occurred
            consumer_group: Consumer group that failed
            retry_count: Number of retry attempts
        """
        import traceback
        import uuid

        dead_letter = DeadLetter(
            id=str(uuid.uuid4()),
            original_topic=record.topic,
            original_partition=record.partition,
            original_offset=record.offset,
            original_key=record.key,
            original_value=record.value,
            original_headers={
                k: v.decode() if isinstance(v, bytes) else v
                for k, v in (record.headers or [])
            },
            reason=reason,
            error_message=str(error),
            error_stack=traceback.format_exc(),
            consumer_group=consumer_group,
            retry_count=retry_count,
        )

        # Publish to DLQ topic
        await self.publisher._producer.send_and_wait(
            topic=self.topic.value,
            key=dead_letter.id,
            value=self._serialize(dead_letter),
            headers=[
                ("reason", reason.value.encode()),
                ("consumer_group", consumer_group.encode()),
                ("original_topic", record.topic.encode()),
            ],
        )

        logger.warning(
            f"Message sent to DLQ: id={dead_letter.id}, "
            f"topic={record.topic}, reason={reason.value}"
        )

    def _serialize(self, dead_letter: DeadLetter) -> bytes:
        """Serialize dead letter to JSON."""
        return json.dumps({
            "id": dead_letter.id,
            "original_topic": dead_letter.original_topic,
            "original_partition": dead_letter.original_partition,
            "original_offset": dead_letter.original_offset,
            "original_key": dead_letter.original_key,
            "original_value": dead_letter.original_value,
            "original_headers": dead_letter.original_headers,
            "reason": dead_letter.reason.value,
            "error_message": dead_letter.error_message,
            "error_stack": dead_letter.error_stack,
            "consumer_group": dead_letter.consumer_group,
            "retry_count": dead_letter.retry_count,
            "first_failed_at": dead_letter.first_failed_at.isoformat(),
            "last_failed_at": dead_letter.last_failed_at.isoformat(),
        }, default=str).encode("utf-8")


class DLQProcessor:
    """
    Processes messages from the DLQ.

    Strategies:
    - Automatic retry with backoff
    - Route to specific handler
    - Alert for manual intervention
    - Archive old messages
    """

    def __init__(
        self,
        dlq: DeadLetterQueue,
        publisher: EventPublisher,
        alert_threshold: int = 100,
        alert_callback: Optional[Callable] = None,
    ):
        self.dlq = dlq
        self.publisher = publisher
        self.alert_threshold = alert_threshold
        self.alert_callback = alert_callback

    async def retry_message(
        self,
        dead_letter: DeadLetter,
    ) -> bool:
        """
        Retry a dead letter message.

        Returns:
            True if retry was successful
        """
        if dead_letter.retry_count >= self.dlq.max_retries:
            logger.warning(
                f"Max retries exceeded for DLQ message: {dead_letter.id}"
            )
            return False

        try:
            # Republish to original topic
            await self.publisher._producer.send_and_wait(
                topic=dead_letter.original_topic,
                key=dead_letter.original_key,
                value=json.dumps(dead_letter.original_value).encode()
                if isinstance(dead_letter.original_value, dict)
                else dead_letter.original_value,
                headers=[
                    ("dlq_retry_count", str(dead_letter.retry_count + 1).encode()),
                    ("dlq_id", dead_letter.id.encode()),
                ],
            )

            logger.info(f"DLQ message retried: {dead_letter.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to retry DLQ message: {dead_letter.id}, error: {e}")
            return False

    async def process_dlq(
        self,
        handler: Callable[[DeadLetter], bool],
        batch_size: int = 100,
    ) -> dict:
        """
        Process DLQ messages with custom handler.

        Args:
            handler: Function to handle each dead letter
            batch_size: Number of messages to process

        Returns:
            Processing statistics
        """
        stats = {
            "processed": 0,
            "retried": 0,
            "skipped": 0,
            "failed": 0,
        }

        # Implementation would consume from DLQ topic
        # and apply handler to each message

        return stats

    async def check_depth_and_alert(self) -> int:
        """Check DLQ depth and send alert if threshold exceeded."""
        # Get current DLQ message count
        depth = await self._get_dlq_depth()

        if depth >= self.alert_threshold and self.alert_callback:
            await self.alert_callback(
                f"DLQ depth alert: {depth} messages (threshold: {self.alert_threshold})"
            )

        return depth

    async def _get_dlq_depth(self) -> int:
        """Get current number of messages in DLQ."""
        # Implementation would query Kafka for consumer lag
        return 0
```

### Consumer with DLQ Support

```python
# events/consumer_with_dlq.py
from events.subscriber import EventSubscriber
from events.dlq import DeadLetterQueue, DLQReason


class ResilientEventSubscriber(EventSubscriber):
    """
    Event subscriber with DLQ support.

    Extends base subscriber with:
    - Automatic DLQ routing on failure
    - Retry before DLQ
    - Error classification
    """

    def __init__(
        self,
        topics,
        group_id,
        dlq: DeadLetterQueue,
        max_retries: int = 3,
        **kwargs,
    ):
        super().__init__(topics, group_id, **kwargs)
        self.dlq = dlq
        self.max_retries = max_retries

    async def _handle_error(self, record, error: Exception) -> None:
        """Handle processing errors with DLQ routing."""
        # Classify error
        reason = self._classify_error(error)

        # Get retry count from headers
        retry_count = self._get_retry_count(record)

        if reason == DLQReason.POISON_MESSAGE:
            # Immediately send to DLQ, don't retry
            await self.dlq.send_to_dlq(
                record, reason, error, self.group_id, retry_count
            )
        elif retry_count >= self.max_retries:
            # Max retries exceeded
            await self.dlq.send_to_dlq(
                record,
                DLQReason.MAX_RETRIES_EXCEEDED,
                error,
                self.group_id,
                retry_count,
            )
        else:
            # Will be retried by Kafka consumer (don't commit offset)
            raise error

    def _classify_error(self, error: Exception) -> DLQReason:
        """Classify error to determine handling strategy."""
        error_type = type(error).__name__

        if "Validation" in error_type or "Pydantic" in error_type:
            return DLQReason.VALIDATION_ERROR

        if "JSON" in error_type or "Decode" in error_type:
            return DLQReason.DESERIALIZATION_ERROR

        if "Poison" in error_type or "Malformed" in error_type:
            return DLQReason.POISON_MESSAGE

        return DLQReason.PROCESSING_ERROR

    def _get_retry_count(self, record) -> int:
        """Get retry count from message headers."""
        for key, value in (record.headers or []):
            if key == "dlq_retry_count":
                return int(value.decode())
        return 0
```

---

## CQRS Pattern

### Command and Query Separation

```python
# cqrs/commands.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class Command(BaseModel, ABC):
    """
    Base command class.

    Commands represent intentions to change state.
    They are named in imperative form: CreateTask, CompleteTask, etc.
    """
    command_id: str
    user_id: str
    timestamp: datetime = None

    def __init__(self, **data):
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow()
        super().__init__(**data)


class CommandResult(BaseModel, Generic[T]):
    """Result of command execution."""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    events: list = []  # Events generated by command


class CommandHandler(ABC, Generic[T]):
    """Base command handler."""

    @abstractmethod
    async def handle(self, command: Command) -> CommandResult[T]:
        """Handle the command and return result."""
        pass


# ============================================================
# Task Commands
# ============================================================

class CreateTaskCommand(Command):
    """Command to create a new task."""
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None


class CompleteTaskCommand(Command):
    """Command to mark a task as complete."""
    task_id: int


class UpdateTaskCommand(Command):
    """Command to update task fields."""
    task_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


class DeleteTaskCommand(Command):
    """Command to delete a task."""
    task_id: int
    soft_delete: bool = True
```

```python
# cqrs/queries.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class Query(BaseModel, ABC):
    """
    Base query class.

    Queries represent requests for data.
    They do not modify state.
    """
    user_id: str


class QueryResult(BaseModel, Generic[T]):
    """Result of query execution."""
    data: Optional[T] = None
    total: Optional[int] = None
    error: Optional[str] = None


class QueryHandler(ABC, Generic[T]):
    """Base query handler."""

    @abstractmethod
    async def handle(self, query: Query) -> QueryResult[T]:
        """Handle the query and return result."""
        pass


# ============================================================
# Task Queries
# ============================================================

class GetTaskQuery(Query):
    """Query to get a single task."""
    task_id: int


class ListTasksQuery(Query):
    """Query to list tasks with filters."""
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    search: Optional[str] = None
    limit: int = 50
    offset: int = 0
    sort_by: str = "created_at"
    sort_order: str = "desc"


class GetTaskStatsQuery(Query):
    """Query to get task statistics."""
    pass


class SearchTasksQuery(Query):
    """Full-text search for tasks."""
    query: str
    limit: int = 20
```

### Write Model (Commands)

```python
# cqrs/write_model.py
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Session, select
from sqlalchemy import Column, DateTime, func

from .commands import (
    CreateTaskCommand,
    CompleteTaskCommand,
    UpdateTaskCommand,
    DeleteTaskCommand,
    CommandHandler,
    CommandResult,
)
from events.publisher import publisher
from events.topics import TopicName
from events.schemas import TaskCreatedEvent, TaskCompletedEvent, TaskPayload


class TaskWriteModel(SQLModel, table=True):
    """
    Write model for tasks.

    Optimized for writes and data integrity.
    Normalized structure.
    """

    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(max_length=255)
    description: Optional[str] = None
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    priority: str = Field(default="medium")
    due_date: Optional[datetime] = None
    deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    version: int = Field(default=1)  # Optimistic locking
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), onupdate=func.now())
    )


class CreateTaskHandler(CommandHandler[TaskWriteModel]):
    """Handler for CreateTaskCommand."""

    def __init__(self, session: Session):
        self.session = session

    async def handle(self, command: CreateTaskCommand) -> CommandResult[TaskWriteModel]:
        try:
            # Create task
            task = TaskWriteModel(
                user_id=command.user_id,
                title=command.title,
                description=command.description,
                priority=command.priority,
                due_date=command.due_date,
            )

            self.session.add(task)
            await self.session.commit()
            await self.session.refresh(task)

            # Emit event
            event = TaskCreatedEvent(
                user_id=command.user_id,
                correlation_id=command.command_id,
                payload=TaskPayload(
                    task_id=task.id,
                    title=task.title,
                    description=task.description,
                    priority=task.priority,
                    due_date=task.due_date,
                ),
            )
            await publisher.publish(TopicName.TASK_EVENTS, event)

            return CommandResult(
                success=True,
                data=task,
                events=[event],
            )

        except Exception as e:
            return CommandResult(
                success=False,
                error=str(e),
            )


class CompleteTaskHandler(CommandHandler[TaskWriteModel]):
    """Handler for CompleteTaskCommand."""

    def __init__(self, session: Session):
        self.session = session

    async def handle(self, command: CompleteTaskCommand) -> CommandResult[TaskWriteModel]:
        try:
            # Get task with user isolation
            task = await self.session.exec(
                select(TaskWriteModel)
                .where(TaskWriteModel.id == command.task_id)
                .where(TaskWriteModel.user_id == command.user_id)
                .where(TaskWriteModel.deleted == False)
            ).first()

            if not task:
                return CommandResult(
                    success=False,
                    error="Task not found",
                )

            if task.completed:
                return CommandResult(
                    success=False,
                    error="Task already completed",
                )

            # Update task
            task.completed = True
            task.completed_at = datetime.utcnow()
            task.version += 1

            self.session.add(task)
            await self.session.commit()
            await self.session.refresh(task)

            # Emit event
            event = TaskCompletedEvent(
                user_id=command.user_id,
                correlation_id=command.command_id,
                payload=TaskPayload(
                    task_id=task.id,
                    title=task.title,
                    completed=True,
                ),
            )
            await publisher.publish(TopicName.TASK_EVENTS, event)

            return CommandResult(
                success=True,
                data=task,
                events=[event],
            )

        except Exception as e:
            return CommandResult(
                success=False,
                error=str(e),
            )
```

### Read Model (Queries)

```python
# cqrs/read_model.py
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Session, select
from sqlalchemy import Column, DateTime, Text, func

from .queries import (
    GetTaskQuery,
    ListTasksQuery,
    GetTaskStatsQuery,
    QueryHandler,
    QueryResult,
)


class TaskReadModel(SQLModel, table=True):
    """
    Read model for tasks.

    Optimized for queries:
    - Denormalized data
    - Computed fields
    - Full-text search support
    """

    __tablename__ = "tasks_read"

    id: int = Field(primary_key=True)
    user_id: str = Field(index=True)
    title: str
    description: Optional[str] = None
    completed: bool = Field(default=False, index=True)
    completed_at: Optional[datetime] = None
    priority: str = Field(index=True)
    due_date: Optional[datetime] = Field(index=True)

    # Denormalized fields
    category_name: Optional[str] = None
    tag_names: Optional[str] = None  # Comma-separated

    # Computed fields
    is_overdue: bool = Field(default=False, index=True)
    days_until_due: Optional[int] = None

    # Search field (combined for full-text search)
    search_text: Optional[str] = Field(
        sa_column=Column(Text),
        default=None,
    )

    created_at: datetime
    updated_at: datetime


class TaskStatsReadModel(SQLModel):
    """Statistics read model."""
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float
    tasks_by_priority: dict


class GetTaskQueryHandler(QueryHandler[TaskReadModel]):
    """Handler for GetTaskQuery."""

    def __init__(self, session: Session):
        self.session = session

    async def handle(self, query: GetTaskQuery) -> QueryResult[TaskReadModel]:
        task = await self.session.exec(
            select(TaskReadModel)
            .where(TaskReadModel.id == query.task_id)
            .where(TaskReadModel.user_id == query.user_id)
        ).first()

        if not task:
            return QueryResult(error="Task not found")

        return QueryResult(data=task)


class ListTasksQueryHandler(QueryHandler[List[TaskReadModel]]):
    """Handler for ListTasksQuery."""

    def __init__(self, session: Session):
        self.session = session

    async def handle(self, query: ListTasksQuery) -> QueryResult[List[TaskReadModel]]:
        # Build query
        stmt = select(TaskReadModel).where(
            TaskReadModel.user_id == query.user_id
        )

        # Apply filters
        if query.completed is not None:
            stmt = stmt.where(TaskReadModel.completed == query.completed)

        if query.priority:
            stmt = stmt.where(TaskReadModel.priority == query.priority)

        if query.due_before:
            stmt = stmt.where(TaskReadModel.due_date <= query.due_before)

        if query.due_after:
            stmt = stmt.where(TaskReadModel.due_date >= query.due_after)

        if query.search:
            stmt = stmt.where(
                TaskReadModel.search_text.ilike(f"%{query.search}%")
            )

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self.session.scalar(count_stmt)

        # Apply sorting
        sort_column = getattr(TaskReadModel, query.sort_by, TaskReadModel.created_at)
        if query.sort_order == "desc":
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # Apply pagination
        stmt = stmt.offset(query.offset).limit(query.limit)

        tasks = await self.session.exec(stmt)

        return QueryResult(
            data=tasks.all(),
            total=total,
        )


class GetTaskStatsQueryHandler(QueryHandler[TaskStatsReadModel]):
    """Handler for GetTaskStatsQuery."""

    def __init__(self, session: Session):
        self.session = session

    async def handle(self, query: GetTaskStatsQuery) -> QueryResult[TaskStatsReadModel]:
        user_id = query.user_id

        # Get counts
        total = await self.session.scalar(
            select(func.count())
            .where(TaskReadModel.user_id == user_id)
        )

        completed = await self.session.scalar(
            select(func.count())
            .where(TaskReadModel.user_id == user_id)
            .where(TaskReadModel.completed == True)
        )

        overdue = await self.session.scalar(
            select(func.count())
            .where(TaskReadModel.user_id == user_id)
            .where(TaskReadModel.is_overdue == True)
        )

        # Tasks by priority
        priority_counts = await self.session.exec(
            select(TaskReadModel.priority, func.count())
            .where(TaskReadModel.user_id == user_id)
            .group_by(TaskReadModel.priority)
        )

        stats = TaskStatsReadModel(
            total_tasks=total or 0,
            completed_tasks=completed or 0,
            pending_tasks=(total or 0) - (completed or 0),
            overdue_tasks=overdue or 0,
            completion_rate=(completed or 0) / (total or 1) * 100,
            tasks_by_priority=dict(priority_counts.all()),
        )

        return QueryResult(data=stats)
```

### Event Projection (Sync Read Model)

```python
# cqrs/projections.py
from datetime import datetime
from typing import Dict, Callable
import logging

from events.subscriber import EventSubscriber
from events.topics import TopicName
from .read_model import TaskReadModel

logger = logging.getLogger(__name__)


class TaskProjection(EventSubscriber):
    """
    Projects task events to read model.

    Listens to task events and updates the denormalized read model.
    """

    def __init__(self, session_factory, **kwargs):
        super().__init__(
            topics=[TopicName.TASK_EVENTS],
            group_id="task-projection",
            **kwargs,
        )
        self.session_factory = session_factory

        # Register handlers
        self.register_handler("task.created", self._handle_created)
        self.register_handler("task.updated", self._handle_updated)
        self.register_handler("task.completed", self._handle_completed)
        self.register_handler("task.deleted", self._handle_deleted)

    async def _handle_created(self, event: dict) -> None:
        """Project TaskCreated event."""
        payload = event["payload"]

        async with self.session_factory() as session:
            read_model = TaskReadModel(
                id=payload["task_id"],
                user_id=event["user_id"],
                title=payload["title"],
                description=payload.get("description"),
                completed=False,
                priority=payload.get("priority", "medium"),
                due_date=payload.get("due_date"),
                is_overdue=self._is_overdue(payload.get("due_date")),
                days_until_due=self._days_until_due(payload.get("due_date")),
                search_text=self._build_search_text(payload),
                created_at=datetime.fromisoformat(event["timestamp"]),
                updated_at=datetime.fromisoformat(event["timestamp"]),
            )

            session.add(read_model)
            await session.commit()

        logger.debug(f"Projected task.created: {payload['task_id']}")

    async def _handle_updated(self, event: dict) -> None:
        """Project TaskUpdated event."""
        payload = event["payload"]

        async with self.session_factory() as session:
            read_model = await session.get(TaskReadModel, payload["task_id"])

            if read_model and read_model.user_id == event["user_id"]:
                # Update fields
                for field in ["title", "description", "priority", "due_date"]:
                    if field in payload:
                        setattr(read_model, field, payload[field])

                # Update computed fields
                read_model.is_overdue = self._is_overdue(read_model.due_date)
                read_model.days_until_due = self._days_until_due(read_model.due_date)
                read_model.search_text = self._build_search_text(payload)
                read_model.updated_at = datetime.fromisoformat(event["timestamp"])

                session.add(read_model)
                await session.commit()

        logger.debug(f"Projected task.updated: {payload['task_id']}")

    async def _handle_completed(self, event: dict) -> None:
        """Project TaskCompleted event."""
        payload = event["payload"]

        async with self.session_factory() as session:
            read_model = await session.get(TaskReadModel, payload["task_id"])

            if read_model and read_model.user_id == event["user_id"]:
                read_model.completed = True
                read_model.completed_at = datetime.fromisoformat(
                    event.get("completed_at", event["timestamp"])
                )
                read_model.is_overdue = False
                read_model.updated_at = datetime.fromisoformat(event["timestamp"])

                session.add(read_model)
                await session.commit()

        logger.debug(f"Projected task.completed: {payload['task_id']}")

    async def _handle_deleted(self, event: dict) -> None:
        """Project TaskDeleted event."""
        payload = event["payload"]

        async with self.session_factory() as session:
            read_model = await session.get(TaskReadModel, payload["task_id"])

            if read_model and read_model.user_id == event["user_id"]:
                await session.delete(read_model)
                await session.commit()

        logger.debug(f"Projected task.deleted: {payload['task_id']}")

    def _is_overdue(self, due_date) -> bool:
        """Check if task is overdue."""
        if not due_date:
            return False
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)
        return due_date < datetime.utcnow()

    def _days_until_due(self, due_date) -> Optional[int]:
        """Calculate days until due."""
        if not due_date:
            return None
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)
        return (due_date - datetime.utcnow()).days

    def _build_search_text(self, payload: dict) -> str:
        """Build combined search text."""
        parts = [
            payload.get("title", ""),
            payload.get("description", ""),
        ]
        return " ".join(filter(None, parts)).lower()

    async def _handle_error(self, record, error: Exception) -> None:
        """Log projection errors."""
        logger.error(f"Projection error: {error}")
        # Could send to DLQ for investigation
```

---

## Quick Reference

### Event-Driven Patterns Summary

| Pattern | Use Case | Pros | Cons |
|---------|----------|------|------|
| **Pub/Sub** | Broadcast events to multiple consumers | Loose coupling, scalability | Message ordering complexity |
| **Event Sourcing** | Audit trail, time travel | Complete history, debugging | Storage, complexity |
| **SAGA** | Distributed transactions | Data consistency | Compensation complexity |
| **CQRS** | Read/write optimization | Performance, scalability | Eventual consistency |
| **DLQ** | Error handling | Reliability, debugging | Manual intervention needed |
| **Idempotency** | At-least-once delivery | Reliability | Storage overhead |

### Event Schema Checklist

- [ ] Unique event_id (UUID)
- [ ] Event type (domain.entity.action)
- [ ] Timestamp (UTC ISO 8601)
- [ ] User ID (for isolation)
- [ ] Schema version
- [ ] Correlation ID (for tracing)
- [ ] Payload with domain data

### Consumer Group Naming

```
Format: <service>-<purpose>-<version>

Examples:
- notification-service-handlers-v1
- analytics-task-events-v1
- recurring-task-processor-v1
```

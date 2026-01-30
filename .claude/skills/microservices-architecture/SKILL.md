# Microservices Architecture Skill

## Purpose

Guide for designing and implementing microservices architecture patterns for the Phase II hackathon Todo Chatbot application. Covers event-driven communication, service boundaries, error handling strategies, deployment patterns, and database design for distributed systems.

## Technology Stack

- **FastAPI** - Async Python microservices
- **Dapr** - Distributed application runtime
- **Redpanda/Kafka** - Event streaming
- **PostgreSQL (Neon)** - Primary database
- **Redis** - Caching and state store
- **Kubernetes** - Container orchestration
- **Docker** - Containerization

---

## Service Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Gateway / Ingress                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ Task Service │   │ Chat Service │   │ User Service │
            │   (FastAPI)  │   │   (FastAPI)  │   │   (FastAPI)  │
            └──────┬───────┘   └──────┬───────┘   └──────────────┘
                   │                  │
                   ▼                  ▼
            ┌─────────────────────────────────────┐
            │         Event Bus (Redpanda)        │
            │  Topics: task-events, reminders,    │
            │          notifications, recurring   │
            └─────────────────────────────────────┘
                   │                  │
         ┌─────────┴────────┐        │
         ▼                  ▼        ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Notification   │  │ Recurring Task  │  │    Reminder     │
│    Service      │  │    Service      │  │    Service      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Service Boundaries

### Domain-Driven Design Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    Bounded Context: Tasks                       │
├─────────────────────────────────────────────────────────────────┤
│  Entities:        Task, Category, Tag                           │
│  Value Objects:   Priority, DueDate, RecurrencePattern          │
│  Aggregates:      Task (root), TaskList                         │
│  Domain Events:   TaskCreated, TaskCompleted, TaskDeleted       │
│  Repository:      TaskRepository                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Bounded Context: Reminders                    │
├─────────────────────────────────────────────────────────────────┤
│  Entities:        Reminder                                       │
│  Value Objects:   ReminderTime, Channel                          │
│  Domain Events:   ReminderScheduled, ReminderTriggered          │
│  Repository:      ReminderRepository                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Bounded Context: Notifications                 │
├─────────────────────────────────────────────────────────────────┤
│  Entities:        Notification, DeliveryAttempt                  │
│  Value Objects:   Channel, Recipient, Content                    │
│  Domain Events:   NotificationSent, NotificationFailed          │
│  Repository:      NotificationRepository                         │
└─────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility | Data Owned |
|---------|---------------|------------|
| **Task Service** | CRUD operations, task state management | Tasks, Categories, Tags |
| **Chat Service** | AI conversation, intent mapping, tool execution | Conversations, Messages |
| **Reminder Service** | Schedule reminders, check due reminders | Reminders |
| **Notification Service** | Deliver notifications (email, push, SMS) | Notification logs |
| **Recurring Task Service** | Create next task instance on completion | Recurrence patterns |
| **User Service** | User profile, preferences (optional) | User preferences |

---

## Event-Driven Patterns

### 1. Event Sourcing (Optional)

```python
# events/event_store.py
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class DomainEvent(BaseModel):
    """Base class for all domain events."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    aggregate_id: str
    aggregate_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: int
    user_id: str
    data: dict

    class Config:
        frozen = True  # Events are immutable


class EventStore(ABC):
    """Abstract event store interface."""

    @abstractmethod
    async def append(self, event: DomainEvent) -> None:
        """Append event to store."""
        pass

    @abstractmethod
    async def get_events(
        self,
        aggregate_id: str,
        after_version: int = 0,
    ) -> List[DomainEvent]:
        """Get events for aggregate after version."""
        pass

    @abstractmethod
    async def get_all_events(
        self,
        after_position: int = 0,
        limit: int = 100,
    ) -> List[DomainEvent]:
        """Get all events for projections."""
        pass


class PostgresEventStore(EventStore):
    """PostgreSQL-based event store."""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def append(self, event: DomainEvent) -> None:
        async with self.session_factory() as session:
            # Insert event with optimistic concurrency check
            await session.execute(
                """
                INSERT INTO events (
                    event_id, event_type, aggregate_id, aggregate_type,
                    timestamp, version, user_id, data
                ) VALUES (
                    :event_id, :event_type, :aggregate_id, :aggregate_type,
                    :timestamp, :version, :user_id, :data
                )
                """,
                event.model_dump(),
            )
            await session.commit()

    async def get_events(
        self,
        aggregate_id: str,
        after_version: int = 0,
    ) -> List[DomainEvent]:
        async with self.session_factory() as session:
            result = await session.execute(
                """
                SELECT * FROM events
                WHERE aggregate_id = :aggregate_id
                AND version > :after_version
                ORDER BY version ASC
                """,
                {"aggregate_id": aggregate_id, "after_version": after_version},
            )
            return [DomainEvent(**row) for row in result.fetchall()]
```

### 2. Event-Driven Saga Pattern

```python
# sagas/task_completion_saga.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class SagaState(str, Enum):
    STARTED = "started"
    TASK_COMPLETED = "task_completed"
    REMINDER_CANCELLED = "reminder_cancelled"
    RECURRING_CHECKED = "recurring_checked"
    NOTIFICATION_SENT = "notification_sent"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


class TaskCompletionSaga(BaseModel):
    """
    Saga for task completion workflow.

    Steps:
    1. Mark task as completed
    2. Cancel any active reminders
    3. Check if recurring - create next instance
    4. Send completion notification

    Compensations:
    - Revert task to incomplete
    - Re-schedule cancelled reminders
    """

    saga_id: str
    task_id: int
    user_id: str
    state: SagaState = SagaState.STARTED
    completed_steps: list[str] = []
    error: Optional[str] = None


class TaskCompletionSagaOrchestrator:
    """Orchestrates the task completion saga."""

    def __init__(
        self,
        task_service,
        reminder_service,
        recurring_service,
        notification_service,
        saga_store,
    ):
        self.task_service = task_service
        self.reminder_service = reminder_service
        self.recurring_service = recurring_service
        self.notification_service = notification_service
        self.saga_store = saga_store

    async def execute(self, saga: TaskCompletionSaga) -> TaskCompletionSaga:
        """Execute saga steps."""
        try:
            # Step 1: Complete task
            if saga.state == SagaState.STARTED:
                await self.task_service.complete_task(saga.task_id, saga.user_id)
                saga.state = SagaState.TASK_COMPLETED
                saga.completed_steps.append("task_completed")
                await self.saga_store.save(saga)

            # Step 2: Cancel reminders
            if saga.state == SagaState.TASK_COMPLETED:
                await self.reminder_service.cancel_task_reminders(
                    saga.task_id, saga.user_id
                )
                saga.state = SagaState.REMINDER_CANCELLED
                saga.completed_steps.append("reminders_cancelled")
                await self.saga_store.save(saga)

            # Step 3: Check recurring
            if saga.state == SagaState.REMINDER_CANCELLED:
                await self.recurring_service.check_and_create_next(
                    saga.task_id, saga.user_id
                )
                saga.state = SagaState.RECURRING_CHECKED
                saga.completed_steps.append("recurring_checked")
                await self.saga_store.save(saga)

            # Step 4: Send notification
            if saga.state == SagaState.RECURRING_CHECKED:
                await self.notification_service.send_completion_notification(
                    saga.task_id, saga.user_id
                )
                saga.state = SagaState.COMPLETED
                saga.completed_steps.append("notification_sent")
                await self.saga_store.save(saga)

            return saga

        except Exception as e:
            logger.error(f"Saga failed: {e}")
            saga.error = str(e)
            saga.state = SagaState.COMPENSATING
            await self.compensate(saga)
            return saga

    async def compensate(self, saga: TaskCompletionSaga) -> None:
        """Execute compensating transactions in reverse order."""
        logger.info(f"Compensating saga {saga.saga_id}")

        try:
            # Reverse completed steps
            for step in reversed(saga.completed_steps):
                if step == "task_completed":
                    await self.task_service.uncomplete_task(
                        saga.task_id, saga.user_id
                    )
                elif step == "reminders_cancelled":
                    await self.reminder_service.restore_task_reminders(
                        saga.task_id, saga.user_id
                    )
                # Note: recurring and notification don't need compensation

            saga.state = SagaState.FAILED
            await self.saga_store.save(saga)

        except Exception as e:
            logger.error(f"Compensation failed: {e}")
            # Alert for manual intervention
            raise
```

### 3. Choreography Pattern (Event-Based)

```python
# events/choreography.py
"""
Choreography: Services react to events independently.
No central orchestrator - each service knows what to do.
"""

from events.schemas import EventType
from events.consumer import BaseKafkaConsumer, EventRouter


class TaskServiceEventHandler:
    """Task service publishes events, doesn't orchestrate."""

    async def on_task_completed(self, task, user_id: str):
        """Publish event - let other services react."""
        event = TaskCompletedEvent(
            user_id=user_id,
            payload=TaskEventPayload(
                task_id=task.id,
                title=task.title,
                completed=True,
            ),
        )
        await producer.send_event(TopicName.TASK_EVENTS, event)
        # That's it! No coordination with other services.


class ReminderServiceConsumer(BaseKafkaConsumer):
    """Reminder service listens and reacts to task events."""

    def __init__(self):
        super().__init__(
            topics=[TopicName.TASK_EVENTS],
            group_id="reminder-service",
        )
        self.router = EventRouter()
        self.router.register(
            EventType.TASK_COMPLETED.value,
            self.handle_task_completed,
        )
        self.router.register(
            EventType.TASK_DELETED.value,
            self.handle_task_deleted,
        )

    async def handle_message(self, message: dict):
        await self.router.route(message)

    async def handle_task_completed(self, event: dict):
        """Cancel reminders when task is completed."""
        task_id = event["payload"]["task_id"]
        user_id = event["user_id"]

        await reminder_repository.cancel_by_task(task_id, user_id)

        # Publish our own event
        await producer.send_event(
            TopicName.REMINDER_EVENTS,
            RemindersCancelledEvent(
                user_id=user_id,
                payload={"task_id": task_id, "reason": "task_completed"},
            ),
        )

    async def handle_task_deleted(self, event: dict):
        """Cancel reminders when task is deleted."""
        task_id = event["payload"]["task_id"]
        user_id = event["user_id"]

        await reminder_repository.cancel_by_task(task_id, user_id)


class RecurringTaskConsumer(BaseKafkaConsumer):
    """Recurring task service listens for task completions."""

    def __init__(self):
        super().__init__(
            topics=[TopicName.TASK_EVENTS],
            group_id="recurring-task-service",
        )

    async def handle_message(self, message: dict):
        if message.get("event_type") == EventType.TASK_COMPLETED.value:
            await self.handle_task_completed(message)

    async def handle_task_completed(self, event: dict):
        """Check if task is recurring and create next instance."""
        task_id = event["payload"]["task_id"]
        user_id = event["user_id"]

        # Check if recurring
        recurrence = await recurrence_repository.get_by_task(task_id, user_id)

        if recurrence and recurrence.is_active:
            # Calculate next due date
            next_due = calculate_next_occurrence(
                recurrence.pattern,
                recurrence.last_occurrence,
            )

            # Create next task instance
            new_task = await task_repository.create(
                user_id=user_id,
                title=event["payload"]["title"],
                due_date=next_due,
                recurrence_id=recurrence.id,
            )

            # Update recurrence
            recurrence.last_occurrence = next_due
            await recurrence_repository.save(recurrence)

            # Publish event
            await producer.send_event(
                TopicName.RECURRING_TASK_EVENTS,
                RecurringTaskCreatedEvent(
                    user_id=user_id,
                    payload={
                        "original_task_id": task_id,
                        "new_task_id": new_task.id,
                        "next_due": next_due.isoformat(),
                    },
                ),
            )
```

### 4. Outbox Pattern (Transactional Messaging)

```python
# events/outbox.py
"""
Outbox Pattern: Ensure events are published exactly once.

1. Save event to outbox table in same transaction as business data
2. Background process reads outbox and publishes to Kafka
3. Mark event as published after successful send
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, func, Index


class OutboxEvent(SQLModel, table=True):
    """Outbox table for transactional messaging."""

    __tablename__ = "outbox"
    __table_args__ = (
        Index("ix_outbox_published", "published"),
        Index("ix_outbox_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    aggregate_type: str  # e.g., "Task", "Reminder"
    aggregate_id: str
    event_type: str
    payload: str  # JSON serialized event
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    published: bool = Field(default=False)
    published_at: Optional[datetime] = None
    error: Optional[str] = None


class OutboxProcessor:
    """
    Processes outbox events and publishes to Kafka.

    Run as background task or separate worker.
    """

    def __init__(self, session_factory, producer, batch_size: int = 100):
        self.session_factory = session_factory
        self.producer = producer
        self.batch_size = batch_size

    async def process_batch(self) -> int:
        """Process a batch of unpublished events."""
        async with self.session_factory() as session:
            # Get unpublished events
            events = await session.exec(
                select(OutboxEvent)
                .where(OutboxEvent.published == False)
                .order_by(OutboxEvent.created_at)
                .limit(self.batch_size)
            )

            published_count = 0

            for event in events:
                try:
                    # Parse payload
                    payload = json.loads(event.payload)

                    # Determine topic from event type
                    topic = self._get_topic(event.event_type)

                    # Publish to Kafka
                    success = await self.producer.send_event(
                        topic=topic,
                        event=payload,
                        key=event.aggregate_id,
                    )

                    if success:
                        event.published = True
                        event.published_at = datetime.utcnow()
                        published_count += 1
                    else:
                        event.error = "Failed to publish"

                except Exception as e:
                    event.error = str(e)

                session.add(event)

            await session.commit()

            return published_count

    def _get_topic(self, event_type: str) -> TopicName:
        """Map event type to topic."""
        if event_type.startswith("task."):
            return TopicName.TASK_EVENTS
        elif event_type.startswith("reminder."):
            return TopicName.REMINDER_EVENTS
        elif event_type.startswith("notification."):
            return TopicName.NOTIFICATION_EVENTS
        else:
            return TopicName.TASK_EVENTS

    async def run_forever(self, interval_seconds: int = 5):
        """Run processor continuously."""
        while True:
            try:
                count = await self.process_batch()
                if count > 0:
                    logger.info(f"Published {count} outbox events")
            except Exception as e:
                logger.error(f"Outbox processor error: {e}")

            await asyncio.sleep(interval_seconds)


# Usage in service
class TaskService:
    """Task service using outbox pattern."""

    async def complete_task(
        self,
        task_id: int,
        user_id: str,
        session: Session,
    ) -> Task:
        # Get task
        task = await self._get_task(task_id, user_id, session)
        task.completed = True

        # Create outbox event in same transaction
        outbox_event = OutboxEvent(
            aggregate_type="Task",
            aggregate_id=str(task_id),
            event_type="task.completed",
            payload=json.dumps({
                "event_type": "task.completed",
                "user_id": user_id,
                "payload": {
                    "task_id": task_id,
                    "title": task.title,
                    "completed": True,
                },
                "timestamp": datetime.utcnow().isoformat(),
            }),
        )

        session.add(task)
        session.add(outbox_event)
        # Both saved in same transaction - atomic!

        return task
```

---

## Service Communication Patterns

### 1. Synchronous Communication (HTTP/gRPC)

```python
# clients/service_client.py
import httpx
from typing import Optional, Any
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class ServiceClientConfig(BaseModel):
    """Service client configuration."""
    base_url: str
    timeout: float = 30.0
    retries: int = 3
    retry_delay: float = 1.0


class ServiceClient:
    """
    Base HTTP client for service-to-service communication.

    Features:
    - Automatic retries with backoff
    - Circuit breaker integration
    - Request/response logging
    - Error handling
    """

    def __init__(self, config: ServiceClientConfig):
        self.config = config
        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout,
        )

    async def close(self):
        await self._client.aclose()

    async def request(
        self,
        method: str,
        path: str,
        data: Optional[dict] = None,
        params: Optional[dict] = None,
        headers: Optional[dict] = None,
    ) -> dict:
        """Make HTTP request with retries."""
        last_error = None

        for attempt in range(self.config.retries):
            try:
                response = await self._client.request(
                    method=method,
                    url=path,
                    json=data,
                    params=params,
                    headers=headers,
                )

                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                if e.response.status_code < 500:
                    # Client error - don't retry
                    raise ServiceError(
                        service=self.config.base_url,
                        status_code=e.response.status_code,
                        message=str(e),
                    )
                last_error = e

            except httpx.RequestError as e:
                last_error = e

            # Exponential backoff
            if attempt < self.config.retries - 1:
                delay = self.config.retry_delay * (2 ** attempt)
                await asyncio.sleep(delay)

        raise ServiceError(
            service=self.config.base_url,
            message=f"All retries failed: {last_error}",
        )


class ServiceError(Exception):
    """Service communication error."""

    def __init__(
        self,
        service: str,
        message: str,
        status_code: Optional[int] = None,
    ):
        self.service = service
        self.status_code = status_code
        super().__init__(f"Service {service} error: {message}")


# Specific service clients
class UserServiceClient(ServiceClient):
    """Client for User Service."""

    def __init__(self):
        super().__init__(ServiceClientConfig(
            base_url="http://user-service:8000",
        ))

    async def get_user(self, user_id: str) -> dict:
        return await self.request("GET", f"/api/users/{user_id}")

    async def get_user_preferences(self, user_id: str) -> dict:
        return await self.request("GET", f"/api/users/{user_id}/preferences")


class TaskServiceClient(ServiceClient):
    """Client for Task Service."""

    def __init__(self):
        super().__init__(ServiceClientConfig(
            base_url="http://task-service:8000",
        ))

    async def get_task(self, user_id: str, task_id: int) -> dict:
        return await self.request("GET", f"/api/{user_id}/tasks/{task_id}")

    async def complete_task(self, user_id: str, task_id: int) -> dict:
        return await self.request(
            "PATCH",
            f"/api/{user_id}/tasks/{task_id}/complete",
        )
```

### 2. Asynchronous Communication (Events)

```python
# communication/async_patterns.py
"""
Asynchronous communication patterns using events.
"""

from abc import ABC, abstractmethod
from typing import Callable, Dict, List
import asyncio


class EventBus(ABC):
    """Abstract event bus interface."""

    @abstractmethod
    async def publish(self, topic: str, event: dict) -> None:
        pass

    @abstractmethod
    async def subscribe(
        self,
        topic: str,
        handler: Callable[[dict], None],
    ) -> None:
        pass


class KafkaEventBus(EventBus):
    """Kafka-based event bus implementation."""

    def __init__(self, producer, consumer_factory):
        self.producer = producer
        self.consumer_factory = consumer_factory
        self.handlers: Dict[str, List[Callable]] = {}

    async def publish(self, topic: str, event: dict) -> None:
        await self.producer.send_event(topic, event)

    async def subscribe(
        self,
        topic: str,
        handler: Callable[[dict], None],
    ) -> None:
        if topic not in self.handlers:
            self.handlers[topic] = []
            # Start consumer for this topic
            consumer = self.consumer_factory(topic)
            asyncio.create_task(self._consume(topic, consumer))

        self.handlers[topic].append(handler)

    async def _consume(self, topic: str, consumer) -> None:
        async for message in consumer:
            handlers = self.handlers.get(topic, [])
            for handler in handlers:
                try:
                    await handler(message)
                except Exception as e:
                    logger.error(f"Handler error: {e}")


# Request-Reply Pattern over Events
class RequestReplyClient:
    """
    Request-reply pattern over async messaging.

    Useful for queries that need to go through event bus.
    """

    def __init__(self, event_bus: EventBus, service_id: str):
        self.event_bus = event_bus
        self.service_id = service_id
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.reply_topic = f"replies.{service_id}"

    async def start(self):
        """Start listening for replies."""
        await self.event_bus.subscribe(
            self.reply_topic,
            self._handle_reply,
        )

    async def request(
        self,
        topic: str,
        request: dict,
        timeout: float = 30.0,
    ) -> dict:
        """Send request and wait for reply."""
        correlation_id = str(uuid.uuid4())

        # Create future for response
        future = asyncio.Future()
        self.pending_requests[correlation_id] = future

        # Send request with reply topic
        await self.event_bus.publish(topic, {
            **request,
            "correlation_id": correlation_id,
            "reply_to": self.reply_topic,
        })

        try:
            # Wait for response
            return await asyncio.wait_for(future, timeout)
        except asyncio.TimeoutError:
            raise ServiceError(
                service=topic,
                message="Request timeout",
            )
        finally:
            self.pending_requests.pop(correlation_id, None)

    async def _handle_reply(self, message: dict):
        """Handle incoming reply."""
        correlation_id = message.get("correlation_id")
        if correlation_id in self.pending_requests:
            future = self.pending_requests[correlation_id]
            if not future.done():
                future.set_result(message)
```

### 3. API Gateway Pattern

```python
# gateway/main.py
"""
API Gateway - Single entry point for all microservices.

Responsibilities:
- Request routing
- Authentication
- Rate limiting
- Request/response transformation
- Aggregation
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
import httpx

app = FastAPI(title="API Gateway")


# Service registry
SERVICES = {
    "tasks": "http://task-service:8000",
    "chat": "http://chat-service:8000",
    "users": "http://user-service:8000",
    "notifications": "http://notification-service:8000",
}


# Proxy handler
@app.api_route(
    "/{service}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy(
    service: str,
    path: str,
    request: Request,
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Proxy requests to backend services."""
    if service not in SERVICES:
        raise HTTPException(status_code=404, detail="Service not found")

    base_url = SERVICES[service]
    url = f"{base_url}/{path}"

    # Forward request
    async with httpx.AsyncClient() as client:
        try:
            # Get request body if present
            body = await request.body()

            # Forward with user context
            headers = dict(request.headers)
            headers["X-User-ID"] = user.user_id

            response = await client.request(
                method=request.method,
                url=url,
                content=body,
                headers=headers,
                params=request.query_params,
            )

            return JSONResponse(
                content=response.json() if response.content else None,
                status_code=response.status_code,
            )

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Service unavailable: {service}",
            )


# Aggregation endpoint example
@app.get("/dashboard/{user_id}")
async def get_dashboard(
    user_id: str,
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """
    Aggregate data from multiple services for dashboard.

    Parallel requests to multiple services.
    """
    verify_user_access(user_id, user)

    async with httpx.AsyncClient() as client:
        # Parallel requests
        tasks_future = client.get(
            f"{SERVICES['tasks']}/api/{user_id}/tasks",
            params={"limit": 10, "completed": False},
        )
        stats_future = client.get(
            f"{SERVICES['tasks']}/api/{user_id}/stats",
        )

        tasks_response, stats_response = await asyncio.gather(
            tasks_future,
            stats_future,
            return_exceptions=True,
        )

        return {
            "tasks": tasks_response.json() if not isinstance(tasks_response, Exception) else [],
            "stats": stats_response.json() if not isinstance(stats_response, Exception) else {},
        }
```

---

## Error Handling Strategies

### 1. Error Classification

```python
# errors/exceptions.py
from enum import Enum
from typing import Optional
from fastapi import HTTPException, status


class ErrorCategory(str, Enum):
    """Error categories for handling strategy."""
    TRANSIENT = "transient"      # Retry is appropriate
    BUSINESS = "business"        # Business rule violation
    VALIDATION = "validation"    # Input validation error
    NOT_FOUND = "not_found"      # Resource not found
    CONFLICT = "conflict"        # State conflict
    AUTHORIZATION = "authorization"  # Permission denied
    SYSTEM = "system"            # Internal system error


class ServiceException(Exception):
    """Base exception for all service errors."""

    def __init__(
        self,
        message: str,
        category: ErrorCategory,
        code: str,
        details: Optional[dict] = None,
        cause: Optional[Exception] = None,
    ):
        self.message = message
        self.category = category
        self.code = code
        self.details = details or {}
        self.cause = cause
        super().__init__(message)

    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        status_map = {
            ErrorCategory.TRANSIENT: status.HTTP_503_SERVICE_UNAVAILABLE,
            ErrorCategory.BUSINESS: status.HTTP_422_UNPROCESSABLE_ENTITY,
            ErrorCategory.VALIDATION: status.HTTP_400_BAD_REQUEST,
            ErrorCategory.NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ErrorCategory.CONFLICT: status.HTTP_409_CONFLICT,
            ErrorCategory.AUTHORIZATION: status.HTTP_403_FORBIDDEN,
            ErrorCategory.SYSTEM: status.HTTP_500_INTERNAL_SERVER_ERROR,
        }

        return HTTPException(
            status_code=status_map.get(
                self.category,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            ),
            detail={
                "code": self.code,
                "message": self.message,
                "details": self.details,
            },
        )


# Specific exceptions
class TaskNotFoundError(ServiceException):
    def __init__(self, task_id: int, user_id: str):
        super().__init__(
            message=f"Task {task_id} not found",
            category=ErrorCategory.NOT_FOUND,
            code="TASK_NOT_FOUND",
            details={"task_id": task_id, "user_id": user_id},
        )


class TaskAlreadyCompletedError(ServiceException):
    def __init__(self, task_id: int):
        super().__init__(
            message=f"Task {task_id} is already completed",
            category=ErrorCategory.CONFLICT,
            code="TASK_ALREADY_COMPLETED",
            details={"task_id": task_id},
        )


class ExternalServiceError(ServiceException):
    def __init__(self, service: str, cause: Exception):
        super().__init__(
            message=f"External service {service} failed",
            category=ErrorCategory.TRANSIENT,
            code="EXTERNAL_SERVICE_ERROR",
            details={"service": service},
            cause=cause,
        )
```

### 2. Retry Strategies

```python
# errors/retry.py
import asyncio
from typing import Callable, TypeVar, Optional
from functools import wraps
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryConfig:
    """Retry configuration."""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        retryable_exceptions: tuple = (Exception,),
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.retryable_exceptions = retryable_exceptions


def with_retry(config: Optional[RetryConfig] = None):
    """
    Decorator for retry logic with exponential backoff.

    Usage:
        @with_retry(RetryConfig(max_attempts=5))
        async def call_external_service():
            ...
    """
    if config is None:
        config = RetryConfig()

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(config.max_attempts):
                try:
                    return await func(*args, **kwargs)

                except config.retryable_exceptions as e:
                    last_exception = e

                    if attempt < config.max_attempts - 1:
                        # Calculate delay with exponential backoff
                        delay = min(
                            config.base_delay * (config.exponential_base ** attempt),
                            config.max_delay,
                        )

                        logger.warning(
                            f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}"
                        )

                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All {config.max_attempts} attempts failed: {e}"
                        )

            raise last_exception

        return wrapper
    return decorator


# Circuit Breaker Pattern
class CircuitBreaker:
    """
    Circuit breaker for failing services.

    States:
    - CLOSED: Normal operation
    - OPEN: Failing fast, not calling service
    - HALF_OPEN: Testing if service recovered
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self._failure_count = 0
        self._last_failure_time: Optional[float] = None
        self._state = "closed"
        self._half_open_calls = 0

    @property
    def state(self) -> str:
        if self._state == "open":
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                self._state = "half_open"
                self._half_open_calls = 0
        return self._state

    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with circuit breaker protection."""
        state = self.state

        if state == "open":
            raise CircuitOpenError("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result

        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful call."""
        if self._state == "half_open":
            self._half_open_calls += 1
            if self._half_open_calls >= self.half_open_max_calls:
                self._state = "closed"
                self._failure_count = 0

    def _on_failure(self):
        """Handle failed call."""
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._failure_count >= self.failure_threshold:
            self._state = "open"


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass
```

### 3. Dead Letter Queue Handling

```python
# errors/dlq.py
"""
Dead Letter Queue (DLQ) handling for failed messages.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DeadLetter(BaseModel):
    """Dead letter record."""
    id: str
    original_topic: str
    original_message: dict
    error: str
    failed_at: datetime
    retry_count: int
    consumer_group: str
    last_retry_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None


class DLQProcessor:
    """
    Processes dead letter queue messages.

    Strategies:
    1. Retry with backoff
    2. Alert for manual intervention
    3. Route to different handler
    4. Mark as resolved/ignored
    """

    def __init__(
        self,
        dlq_consumer,
        producer,
        max_retries: int = 3,
        alert_service = None,
    ):
        self.dlq_consumer = dlq_consumer
        self.producer = producer
        self.max_retries = max_retries
        self.alert_service = alert_service

    async def process(self, dead_letter: DeadLetter) -> None:
        """Process a dead letter message."""
        if dead_letter.retry_count < self.max_retries:
            # Attempt retry
            await self._retry(dead_letter)
        else:
            # Max retries exceeded - alert for manual intervention
            await self._alert(dead_letter)

    async def _retry(self, dead_letter: DeadLetter) -> None:
        """Retry the failed message."""
        try:
            # Republish to original topic
            await self.producer.send_event(
                topic=dead_letter.original_topic,
                event={
                    **dead_letter.original_message,
                    "_dlq_retry_count": dead_letter.retry_count + 1,
                },
            )

            logger.info(
                f"Retried DLQ message: {dead_letter.id}, "
                f"attempt {dead_letter.retry_count + 1}"
            )

        except Exception as e:
            logger.error(f"DLQ retry failed: {e}")

    async def _alert(self, dead_letter: DeadLetter) -> None:
        """Alert for manual intervention."""
        if self.alert_service:
            await self.alert_service.send_alert(
                title="DLQ Message Requires Attention",
                message=f"Message {dead_letter.id} failed {dead_letter.retry_count} times",
                details={
                    "topic": dead_letter.original_topic,
                    "error": dead_letter.error,
                    "message": dead_letter.original_message,
                },
                severity="high",
            )

    async def resolve(
        self,
        dead_letter_id: str,
        resolution: str,
    ) -> None:
        """Mark dead letter as resolved."""
        # Update in database
        await self._update_resolution(dead_letter_id, resolution)
```

---

## Database Strategies

### 1. Database Per Service Pattern

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Task Service   │     │  Chat Service   │     │  User Service   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Tasks DB      │     │   Chat DB       │     │   Users DB      │
│  (PostgreSQL)   │     │  (PostgreSQL)   │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
│ - tasks         │     │ - conversations │     │ - users         │
│ - categories    │     │ - messages      │     │ - sessions      │
│ - tags          │     │                 │     │ - preferences   │
│ - reminders     │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2. Shared Database with Schema Isolation

```python
# db/multi_tenant.py
"""
Schema-per-service isolation in shared database.
"""

from sqlmodel import SQLModel
from sqlalchemy import text


# Service-specific schemas
SCHEMAS = {
    "task-service": "tasks",
    "chat-service": "chat",
    "notification-service": "notifications",
}


async def create_schema(engine, schema_name: str):
    """Create schema if not exists."""
    async with engine.begin() as conn:
        await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))


def get_table_name(service: str, table: str) -> str:
    """Get fully qualified table name."""
    schema = SCHEMAS.get(service, "public")
    return f"{schema}.{table}"


# Model with schema
class Task(SQLModel, table=True):
    __tablename__ = "task"
    __table_args__ = {"schema": "tasks"}  # Schema isolation

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    title: str
    # ...
```

### 3. CQRS (Command Query Responsibility Segregation)

```python
# cqrs/models.py
"""
CQRS: Separate models for writes (commands) and reads (queries).
"""

from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


# ============================================================
# Write Model (Normalized, Optimized for Updates)
# ============================================================

class TaskWriteModel(SQLModel, table=True):
    """Write model - normalized for data integrity."""
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category_id: Optional[int] = Field(foreign_key="categories.id")
    created_at: datetime
    updated_at: datetime


class CategoryWriteModel(SQLModel, table=True):
    """Category write model."""
    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    color: str


# ============================================================
# Read Model (Denormalized, Optimized for Queries)
# ============================================================

class TaskReadModel(SQLModel, table=True):
    """
    Read model - denormalized for fast queries.

    Updated via event handlers when write model changes.
    """
    __tablename__ = "tasks_view"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None

    # Denormalized category data
    category_name: Optional[str] = None
    category_color: Optional[str] = None

    # Computed fields
    is_overdue: bool = False
    days_until_due: Optional[int] = None

    # Aggregated data
    tag_names: Optional[str] = None  # Comma-separated

    created_at: datetime
    updated_at: datetime


# ============================================================
# Projection Handler
# ============================================================

class TaskProjectionHandler:
    """Updates read models based on events."""

    def __init__(self, read_session_factory):
        self.read_session_factory = read_session_factory

    async def handle_task_created(self, event: dict):
        """Project TaskCreated event to read model."""
        async with self.read_session_factory() as session:
            read_model = TaskReadModel(
                id=event["payload"]["task_id"],
                user_id=event["user_id"],
                title=event["payload"]["title"],
                description=event["payload"].get("description"),
                completed=False,
                priority=event["payload"].get("priority", "medium"),
                due_date=event["payload"].get("due_date"),
                created_at=datetime.fromisoformat(event["timestamp"]),
                updated_at=datetime.fromisoformat(event["timestamp"]),
            )

            # Enrich with category data if present
            if event["payload"].get("category_id"):
                category = await self._get_category(
                    event["payload"]["category_id"],
                    session,
                )
                if category:
                    read_model.category_name = category.name
                    read_model.category_color = category.color

            # Calculate computed fields
            if read_model.due_date:
                read_model.is_overdue = read_model.due_date < datetime.utcnow()
                read_model.days_until_due = (
                    read_model.due_date - datetime.utcnow()
                ).days

            session.add(read_model)
            await session.commit()

    async def handle_task_completed(self, event: dict):
        """Update read model when task completed."""
        async with self.read_session_factory() as session:
            read_model = await session.get(
                TaskReadModel,
                event["payload"]["task_id"],
            )

            if read_model:
                read_model.completed = True
                read_model.is_overdue = False
                read_model.updated_at = datetime.fromisoformat(event["timestamp"])
                session.add(read_model)
                await session.commit()
```

### 4. Event Sourcing with Snapshots

```python
# event_sourcing/aggregate.py
"""
Event sourcing with snapshot optimization.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime


class Aggregate(ABC):
    """Base aggregate with event sourcing."""

    def __init__(self):
        self._changes: List[DomainEvent] = []
        self._version: int = 0

    @property
    def changes(self) -> List[DomainEvent]:
        return self._changes.copy()

    def clear_changes(self) -> None:
        self._changes.clear()

    def apply(self, event: DomainEvent) -> None:
        """Apply event and update state."""
        self._apply_event(event)
        self._version = event.version

    def raise_event(self, event: DomainEvent) -> None:
        """Raise new event."""
        event.version = self._version + 1
        self._apply_event(event)
        self._changes.append(event)
        self._version = event.version

    @abstractmethod
    def _apply_event(self, event: DomainEvent) -> None:
        """Apply event to aggregate state. Implement in subclass."""
        pass


class TaskAggregate(Aggregate):
    """Task aggregate with event sourcing."""

    def __init__(self, task_id: str):
        super().__init__()
        self.task_id = task_id
        self.title: Optional[str] = None
        self.description: Optional[str] = None
        self.completed: bool = False
        self.created_at: Optional[datetime] = None

    def _apply_event(self, event: DomainEvent) -> None:
        if event.event_type == "task.created":
            self.title = event.data["title"]
            self.description = event.data.get("description")
            self.created_at = event.timestamp

        elif event.event_type == "task.updated":
            if "title" in event.data:
                self.title = event.data["title"]
            if "description" in event.data:
                self.description = event.data["description"]

        elif event.event_type == "task.completed":
            self.completed = True

    # Command methods
    def create(self, user_id: str, title: str, description: str = None):
        self.raise_event(DomainEvent(
            event_type="task.created",
            aggregate_id=self.task_id,
            aggregate_type="Task",
            user_id=user_id,
            version=0,
            data={"title": title, "description": description},
        ))

    def complete(self, user_id: str):
        if self.completed:
            raise TaskAlreadyCompletedError(self.task_id)

        self.raise_event(DomainEvent(
            event_type="task.completed",
            aggregate_id=self.task_id,
            aggregate_type="Task",
            user_id=user_id,
            version=0,
            data={},
        ))


# Snapshot for performance
class Snapshot(SQLModel, table=True):
    """Aggregate snapshot for performance."""
    __tablename__ = "snapshots"

    aggregate_id: str = Field(primary_key=True)
    aggregate_type: str
    version: int
    state: str  # JSON serialized state
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SnapshotRepository:
    """Repository with snapshot support."""

    SNAPSHOT_FREQUENCY = 100  # Create snapshot every N events

    async def load(self, aggregate_id: str) -> TaskAggregate:
        """Load aggregate from snapshot + subsequent events."""
        aggregate = TaskAggregate(aggregate_id)

        # Try to load snapshot
        snapshot = await self._get_snapshot(aggregate_id)
        start_version = 0

        if snapshot:
            # Restore from snapshot
            state = json.loads(snapshot.state)
            aggregate.title = state.get("title")
            aggregate.description = state.get("description")
            aggregate.completed = state.get("completed", False)
            aggregate._version = snapshot.version
            start_version = snapshot.version

        # Load events after snapshot
        events = await self.event_store.get_events(
            aggregate_id,
            after_version=start_version,
        )

        for event in events:
            aggregate.apply(event)

        return aggregate

    async def save(self, aggregate: TaskAggregate) -> None:
        """Save aggregate events and potentially snapshot."""
        for event in aggregate.changes:
            await self.event_store.append(event)

        # Create snapshot if threshold reached
        if aggregate._version % self.SNAPSHOT_FREQUENCY == 0:
            await self._save_snapshot(aggregate)

        aggregate.clear_changes()
```

---

## Deployment Patterns

### 1. Blue-Green Deployment

```yaml
# kubernetes/blue-green/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-blue
  labels:
    app: task-service
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
      version: blue
  template:
    metadata:
      labels:
        app: task-service
        version: blue
    spec:
      containers:
        - name: task-service
          image: task-service:v1.0.0
          ports:
            - containerPort: 8000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-green
  labels:
    app: task-service
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
      version: green
  template:
    metadata:
      labels:
        app: task-service
        version: green
    spec:
      containers:
        - name: task-service
          image: task-service:v1.1.0  # New version
          ports:
            - containerPort: 8000
---
# Service points to active deployment
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
    version: blue  # Switch to green for cutover
  ports:
    - port: 80
      targetPort: 8000
```

### 2. Canary Deployment

```yaml
# kubernetes/canary/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-stable
spec:
  replicas: 9  # 90% traffic
  selector:
    matchLabels:
      app: task-service
      track: stable
  template:
    metadata:
      labels:
        app: task-service
        track: stable
    spec:
      containers:
        - name: task-service
          image: task-service:v1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-canary
spec:
  replicas: 1  # 10% traffic
  selector:
    matchLabels:
      app: task-service
      track: canary
  template:
    metadata:
      labels:
        app: task-service
        track: canary
    spec:
      containers:
        - name: task-service
          image: task-service:v1.1.0  # New version
---
# Service routes to both
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
    # No track selector - routes to both
  ports:
    - port: 80
      targetPort: 8000
```

### 3. Service Mesh (Istio) Traffic Splitting

```yaml
# istio/virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: task-service
spec:
  hosts:
    - task-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: task-service
            subset: canary
    - route:
        - destination:
            host: task-service
            subset: stable
          weight: 90
        - destination:
            host: task-service
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: task-service
spec:
  host: task-service
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

---

## Quick Reference

### Microservices Checklist

- [ ] Clear service boundaries (single responsibility)
- [ ] Database per service or schema isolation
- [ ] Async communication for cross-service operations
- [ ] Idempotent event handlers
- [ ] Circuit breakers for external calls
- [ ] Health checks and readiness probes
- [ ] Centralized logging with correlation IDs
- [ ] Distributed tracing
- [ ] API versioning strategy
- [ ] Graceful degradation

### Event Design Checklist

- [ ] Events are immutable
- [ ] Events have unique IDs
- [ ] Events include timestamp
- [ ] Events include user_id for isolation
- [ ] Events have schema version
- [ ] Events are self-describing (type field)
- [ ] Correlation ID for tracing

### Error Handling Checklist

- [ ] Classify errors (transient vs permanent)
- [ ] Retry transient failures with backoff
- [ ] Circuit breakers for failing services
- [ ] Dead letter queue for failed events
- [ ] Alerting for DLQ messages
- [ ] Idempotency for retries
- [ ] Graceful degradation

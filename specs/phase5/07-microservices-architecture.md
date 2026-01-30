# Feature Specification: Microservices Architecture

**Feature Branch**: `phase5-microservices-architecture`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Event-driven microservices design with Chat API, Notification Service, and Recurring Task Service

## User Scenarios & Testing *(mandatory)*

### User Story 1 - End-to-End Task Creation Flow (Priority: P1)

As a user, when I create a task via chat, I want the entire system to react appropriately (events published, services notified).

**Why this priority**: Validates the complete architecture - proves services communicate correctly.

**Independent Test**: Create task via chat, verify task.created event published and received by all relevant services.

**Acceptance Scenarios**:

1. **Given** I send "Add task: Buy groceries", **When** Chat API processes it, **Then** task is created AND task.created event is published.
2. **Given** task.created event is published, **When** other services are subscribed, **Then** they receive and acknowledge the event.
3. **Given** Kafka is temporarily slow, **When** event publishing delays, **Then** user still sees immediate success response.
4. **Given** a downstream service is down, **When** Chat API publishes event, **Then** user operation succeeds (eventual consistency).

---

### User Story 2 - Task Completion with Recurring Instance (Priority: P1)

As a user, when I complete a recurring task, I want the next instance created automatically by the Recurring Task Service.

**Why this priority**: Validates service-to-service event flow - core microservices use case.

**Independent Test**: Complete recurring task, verify Recurring Task Service creates next instance.

**Acceptance Scenarios**:

1. **Given** I complete a daily recurring task, **When** task.completed event is published, **Then** Recurring Task Service receives it.
2. **Given** Recurring Task Service receives the event, **When** processing, **Then** it creates a new task for tomorrow.
3. **Given** new task is created, **When** Recurring Task Service finishes, **Then** recurring.task.created event is published.
4. **Given** Chat API receives recurring.task.created, **When** I list tasks, **Then** I see the new instance.

---

### User Story 3 - Reminder Notification Flow (Priority: P1)

As a user, when my reminder time arrives, I want to receive a notification from the Notification Service.

**Why this priority**: Validates scheduled event flow - critical reminder functionality.

**Independent Test**: Set reminder, wait for time, verify email notification received.

**Acceptance Scenarios**:

1. **Given** I set a reminder for 5 minutes from now, **When** I complete the action, **Then** reminder.scheduled event is published.
2. **Given** reminder time arrives, **When** scheduled job runs, **Then** reminder.triggered event is published.
3. **Given** Notification Service receives triggered event, **When** processing, **Then** email notification is sent.
4. **Given** notification is sent, **When** complete, **Then** reminder.sent event is published.

---

### User Story 4 - Handle Service Failures Gracefully (Priority: P2)

As a system, I need to handle individual service failures without affecting other services or losing data.

**Why this priority**: Resilience requirement - ensures system reliability.

**Independent Test**: Simulate Notification Service crash, verify events are retained and processed on recovery.

**Acceptance Scenarios**:

1. **Given** Notification Service is down, **When** reminder events are published, **Then** events are retained in Kafka.
2. **Given** Notification Service recovers, **When** it reconnects, **Then** it processes all pending events.
3. **Given** Chat API loses database connection, **When** attempting task creation, **Then** user receives clear error (no partial state).
4. **Given** one service has high latency, **When** other services operate, **Then** they are not blocked or slowed.

---

### User Story 5 - Independent Service Deployment (Priority: P2)

As an operator, I want to deploy each microservice independently without coordinated releases.

**Why this priority**: Operational requirement - enables faster, safer deployments.

**Independent Test**: Deploy new version of Notification Service while Chat API runs, verify no disruption.

**Acceptance Scenarios**:

1. **Given** Chat API is running, **When** I deploy new Notification Service version, **Then** Chat API continues operating.
2. **Given** event schema adds new optional field, **When** old consumer receives it, **Then** it processes successfully (ignores new field).
3. **Given** I need to rollback Recurring Task Service, **When** I deploy previous version, **Then** it resumes processing without data loss.
4. **Given** services use different database schemas, **When** one migrates, **Then** others are unaffected.

---

### Edge Cases

- What if event is processed but acknowledgment fails? (Idempotency prevents duplicate processing)
- What if two services try to update same task? (Optimistic locking via version field)
- What if Kafka retention expires before consumer catches up? (Alert on lag, extend retention if needed)
- What if service scales to zero replicas? (Events retained, processed when scaled up)
- What if event schema version is incompatible? (Route to DLQ, alert operators)

## Requirements *(mandatory)*

### Functional Requirements

**Service Definitions**:
- **FR-001**: Chat API service MUST handle user chat requests and execute MCP tools
- **FR-002**: Chat API MUST publish events for all task state changes
- **FR-003**: Notification Service MUST consume reminder events and send notifications
- **FR-004**: Notification Service MUST run scheduled job to check for due reminders
- **FR-005**: Recurring Task Service MUST consume task.completed events and create next instances
- **FR-006**: Each service MUST expose a /health endpoint for liveness/readiness probes

**Communication Patterns**:
- **FR-007**: All inter-service communication MUST use Dapr pub/sub (no direct HTTP/gRPC calls)
- **FR-008**: Services MUST NOT share in-memory state or caches
- **FR-009**: Services MAY share database (Neon PostgreSQL) with clear table ownership
- **FR-010**: Event contracts MUST be documented and versioned

**Event Flow**:
- **FR-011**: Chat API publishes: task.created, task.updated, task.completed, task.deleted, reminder.scheduled
- **FR-012**: Recurring Task Service subscribes: task.completed (filtered for recurrence)
- **FR-013**: Recurring Task Service publishes: recurring.task.created
- **FR-014**: Notification Service subscribes: reminder.triggered
- **FR-015**: Notification Service publishes: reminder.sent, reminder.cancelled

**Idempotency**:
- **FR-016**: ALL event handlers MUST be idempotent
- **FR-017**: Services MUST track processed event_ids to detect duplicates
- **FR-018**: Duplicate events MUST be acknowledged without reprocessing

**Error Handling**:
- **FR-019**: Failed events MUST be retried with exponential backoff
- **FR-020**: Events exceeding retry limit MUST be routed to dead letter queue
- **FR-021**: Services MUST log errors with event context for debugging
- **FR-022**: Service failures MUST NOT cascade to other services

**Independence**:
- **FR-023**: Each service MUST be independently deployable
- **FR-024**: Each service MUST have its own Dockerfile and deployment configuration
- **FR-025**: Services MUST tolerate temporary unavailability of other services
- **FR-026**: Database migrations MUST be backward compatible or coordinated

### Key Entities

- **Chat API Service**: Port 8000, handles chat, publishes task events
- **Notification Service**: Port 8001, sends notifications, scheduled checks
- **Recurring Task Service**: Port 8002, creates recurring instances
- **Event Bus**: Kafka/Redpanda via Dapr pub/sub
- **Shared Database**: Neon PostgreSQL with service-specific tables

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: End-to-end task creation flow completes in under 3 seconds (user perspective)
- **SC-002**: Recurring task instance created within 30 seconds of parent completion
- **SC-003**: 95% of reminders sent within 2 minutes of scheduled time
- **SC-004**: Individual service deployment causes zero downtime for other services
- **SC-005**: System handles 100 concurrent users without degradation
- **SC-006**: Service recovery after failure processes backlog within 5 minutes
- **SC-007**: Zero data loss during individual service failures (events retained in Kafka)

## Assumptions

- All services can reach Kafka/Redpanda broker
- Dapr sidecars are deployed alongside each service
- Kubernetes provides service discovery and load balancing
- Network policies allow inter-service communication via Dapr
- Sufficient Kafka retention for expected processing time

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                        (Next.js Frontend)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Chat API                               │
│                         (Port 8000)                             │
│  - Chat endpoint                                                │
│  - MCP tool execution                                           │
│  - Event publishing                                             │
└─────────────────────────────────────────────────────────────────┘
        │                                      │
        │ task.completed                       │ reminder.scheduled
        │ (has_recurrence=true)                │
        ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│  Redpanda/Kafka     │              │  Redpanda/Kafka     │
│  (task-events)      │              │  (reminder-events)  │
└─────────────────────┘              └─────────────────────┘
        │                                      │
        ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│ Recurring Task Svc  │              │ Notification Svc    │
│    (Port 8002)      │              │    (Port 8001)      │
│ - Calculate next    │              │ - Send emails       │
│ - Create new task   │              │ - Scheduled checks  │
└─────────────────────┘              └─────────────────────┘
        │                                      │
        │ recurring.task.created               │ reminder.sent
        ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Neon PostgreSQL                             │
│  (tasks, reminders, tags, processed_events)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow Sequences

### Task Completion with Recurrence
```
1. User → Chat API: "Mark task 42 as done"
2. Chat API → Database: Update task.completed = true
3. Chat API → Kafka: Publish task.completed (had_recurrence=true)
4. Recurring Task Service ← Kafka: Receive task.completed
5. Recurring Task Service → Database: Create new task (due tomorrow)
6. Recurring Task Service → Kafka: Publish recurring.task.created
7. User sees new task in their list
```

### Reminder Notification
```
1. User → Chat API: "Remind me about task 42 in 1 hour"
2. Chat API → Database: Create reminder record
3. Chat API → Kafka: Publish reminder.scheduled
4. [Time passes - scheduled job runs]
5. Notification Service → Database: Query due reminders
6. Notification Service → Kafka: Publish reminder.triggered
7. Notification Service → SMTP: Send email
8. Notification Service → Kafka: Publish reminder.sent
9. User receives email notification
```

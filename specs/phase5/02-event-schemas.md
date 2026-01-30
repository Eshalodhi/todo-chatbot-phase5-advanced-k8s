# Feature Specification: Event Schemas

**Feature Branch**: `phase5-event-schemas`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Event schema definitions for task events, reminder events, and inter-service communication

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish Task Events (Priority: P1)

As a system, I need to publish events when task state changes so other services can react to those changes.

**Why this priority**: Foundation for all event-driven communication - required for microservices to function.

**Independent Test**: Create a task via chat, verify task.created event is published with correct schema.

**Acceptance Scenarios**:

1. **Given** a user creates a task, **When** the task is saved, **Then** a `task.created` event is published with task_id, user_id, and task data.
2. **Given** a user completes a task, **When** the completion is saved, **Then** a `task.completed` event is published.
3. **Given** a user updates a task, **When** the update is saved, **Then** a `task.updated` event is published with changed fields.
4. **Given** a user deletes a task, **When** the deletion is processed, **Then** a `task.deleted` event is published.

---

### User Story 2 - Publish Reminder Events (Priority: P1)

As a system, I need to publish reminder events so the notification service can deliver them to users.

**Why this priority**: Enables reminder notifications - core Phase V feature.

**Independent Test**: Schedule a reminder, verify reminder.scheduled event is published.

**Acceptance Scenarios**:

1. **Given** a user sets a reminder, **When** the reminder is created, **Then** a `reminder.scheduled` event is published.
2. **Given** a reminder's time arrives, **When** the scheduler triggers, **Then** a `reminder.triggered` event is published.
3. **Given** a notification is sent, **When** delivery succeeds, **Then** a `reminder.sent` event is published.
4. **Given** a task is completed before reminder time, **When** the reminder is cancelled, **Then** a `reminder.cancelled` event is published.

---

### User Story 3 - Consume Events Idempotently (Priority: P1)

As a consuming service, I need to process events exactly once even if delivered multiple times.

**Why this priority**: Prevents duplicate processing - essential for data integrity.

**Independent Test**: Send same event twice with same event_id, verify only processed once.

**Acceptance Scenarios**:

1. **Given** an event with a unique event_id is received, **When** processed successfully, **Then** the event_id is recorded.
2. **Given** the same event is received again, **When** the event_id is checked, **Then** the event is skipped (not reprocessed).
3. **Given** an event fails processing, **When** retried, **Then** the event is reprocessed until successful or max retries reached.

---

### User Story 4 - Version Event Schemas (Priority: P2)

As a system, I need versioned event schemas so services can evolve independently.

**Why this priority**: Enables backward compatibility during updates - important for maintenance.

**Independent Test**: Publish event with version 1.0, update consumer to version 1.1, verify backward compatibility.

**Acceptance Scenarios**:

1. **Given** an event is published with version "1.0", **When** a consumer expects version "1.0", **Then** the event is processed normally.
2. **Given** a new field is added in version "1.1", **When** a "1.0" consumer receives it, **Then** the event is processed (extra fields ignored).
3. **Given** a breaking change creates version "2.0", **When** a "1.x" consumer receives it, **Then** the consumer logs a warning and routes to dead letter queue.

---

### Edge Cases

- What if event_id is missing? (Reject event, do not process)
- What if timestamp is in the future? (Accept but log warning)
- What if user_id doesn't exist? (Log error, route to dead letter queue)
- What if payload exceeds size limit? (Reject, limit is 1MB)
- What if version format is invalid? (Treat as version "1.0")

## Requirements *(mandatory)*

### Functional Requirements

**Event Structure**:
- **FR-001**: All events MUST include: event_id (UUID), event_type (string), timestamp (ISO-8601 UTC), version (semver string)
- **FR-002**: All events MUST include user_id for user isolation
- **FR-003**: All events MUST include a source field identifying the publishing service
- **FR-004**: Event payload MUST NOT contain sensitive data (passwords, tokens, PII)
- **FR-005**: Events MUST be serialized as JSON with UTF-8 encoding

**Task Events**:
- **FR-006**: `task.created` MUST include: task_id, title, description, priority, due_date, tags, recurrence_pattern
- **FR-007**: `task.updated` MUST include: task_id, changed_fields (object with before/after values)
- **FR-008**: `task.completed` MUST include: task_id, title, completed_at, had_recurrence (boolean)
- **FR-009**: `task.deleted` MUST include: task_id, title

**Reminder Events**:
- **FR-010**: `reminder.scheduled` MUST include: reminder_id, task_id, remind_at, user_id
- **FR-011**: `reminder.triggered` MUST include: reminder_id, task_id, task_title, due_at
- **FR-012**: `reminder.sent` MUST include: reminder_id, channel (email/push), sent_at
- **FR-013**: `reminder.cancelled` MUST include: reminder_id, reason (task_completed/user_deleted/system)

**Recurring Task Events**:
- **FR-014**: `recurring.task.created` MUST include: original_task_id, new_task_id, recurrence_pattern, next_due_date

**Idempotency**:
- **FR-015**: Consumers MUST track processed event_ids to prevent duplicate processing
- **FR-016**: Processed event records MUST be retained for 30 days minimum
- **FR-017**: Duplicate events MUST be silently acknowledged (no error returned)

**Versioning**:
- **FR-018**: Version MUST follow semantic versioning (MAJOR.MINOR format)
- **FR-019**: Minor version changes MUST be backward compatible (additive only)
- **FR-020**: Major version changes MAY break backward compatibility

### Key Entities

- **Event Envelope**: Standard wrapper containing event_id, event_type, timestamp, version, source, user_id
- **Task Event Payload**: Task-specific data (task_id, title, etc.)
- **Reminder Event Payload**: Reminder-specific data (reminder_id, remind_at, etc.)
- **Processed Event Record**: Tracks event_id, event_type, processed_at, service_name for idempotency

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of events conform to the defined schema (validated at publish time)
- **SC-002**: Event publishing adds less than 50ms latency to user operations
- **SC-003**: 99.9% of events are successfully delivered to consumers within 5 seconds
- **SC-004**: Zero duplicate event processing occurs under normal operation
- **SC-005**: Services can be updated independently without breaking event consumption
- **SC-006**: Event schemas pass automated validation in CI pipeline

## Assumptions

- All services share a common event schema library/documentation
- Event validation occurs at publish time, not consume time
- Clock synchronization is within 1 second across services (NTP)
- Events are immutable once published

## Event Schema Reference

### Base Event Envelope

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "task.completed",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "version": "1.0",
  "source": "chat-api",
  "user_id": "user-123-uuid",
  "payload": { }
}
```

### Task Created Payload

```json
{
  "task_id": 42,
  "title": "Complete quarterly report",
  "description": "Include all department metrics",
  "priority": "high",
  "due_date": "2026-02-01T17:00:00.000Z",
  "tags": ["work", "reports"],
  "recurrence_pattern": null
}
```

### Task Completed Payload

```json
{
  "task_id": 42,
  "title": "Complete quarterly report",
  "completed_at": "2026-01-28T12:00:00.000Z",
  "had_recurrence": true
}
```

### Reminder Triggered Payload

```json
{
  "reminder_id": 15,
  "task_id": 42,
  "task_title": "Complete quarterly report",
  "due_at": "2026-02-01T17:00:00.000Z",
  "user_email": "user@example.com"
}
```

# Feature Specification: Recurring Task Service

**Feature Branch**: `phase5-recurring-task-service`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Microservice for automatically creating next task instances when recurring tasks are completed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Daily Recurring Task Instance (Priority: P1)

As a user with a daily recurring task, I want the next instance to be automatically created when I complete the current one.

**Why this priority**: Most common recurrence pattern - validates core functionality.

**Independent Test**: Complete a daily recurring task, verify new task is created for tomorrow.

**Acceptance Scenarios**:

1. **Given** I complete a task with daily recurrence, **When** the completion is processed, **Then** a new task is created due tomorrow.
2. **Given** a new task is created, **When** I view my tasks, **Then** the new task has the same title, description, priority, and tags.
3. **Given** the recurring.task.created event is published, **When** consumed, **Then** it contains original_task_id and new_task_id.
4. **Given** a daily task is completed multiple times in one day, **When** processed, **Then** only one new task is created (idempotency).

---

### User Story 2 - Create Weekly Recurring Task Instance (Priority: P1)

As a user with a weekly recurring task, I want the next instance created for the same day next week.

**Why this priority**: Second most common pattern - validates week calculation logic.

**Independent Test**: Complete a weekly task on Wednesday, verify new task is due next Wednesday.

**Acceptance Scenarios**:

1. **Given** I complete a task with weekly recurrence on Wednesday, **When** processed, **Then** a new task is created due next Wednesday.
2. **Given** the task has a specific day set (e.g., every Monday), **When** completed, **Then** the new task is due the following Monday.
3. **Given** the new week's date is in a different month, **When** created, **Then** the date is correctly in the next month.

---

### User Story 3 - Create Monthly Recurring Task Instance (Priority: P1)

As a user with a monthly recurring task, I want the next instance created for the same day next month.

**Why this priority**: Validates complex date logic - month-end edge cases.

**Independent Test**: Complete a monthly task on the 15th, verify new task is due the 15th of next month.

**Acceptance Scenarios**:

1. **Given** I complete a task on the 15th with monthly recurrence, **When** processed, **Then** a new task is created due the 15th of next month.
2. **Given** the task was due on the 31st and next month has 30 days, **When** processed, **Then** the new task is due the 30th (last day of month).
3. **Given** the task was due on the 31st of January, **When** completed in January, **Then** the new task is due February 28th/29th (last day).
4. **Given** the task was due on the 29th of February (leap year), **When** completed, **Then** March task is due on the 29th.

---

### User Story 4 - Respect Recurrence End Date (Priority: P2)

As a user, I want recurring tasks to stop creating new instances after my specified end date.

**Why this priority**: Allows finite recurring tasks - important for project-based work.

**Independent Test**: Set recurrence end date, complete task after that date, verify no new task is created.

**Acceptance Scenarios**:

1. **Given** a recurring task has an end date of 2026-03-01, **When** completed on 2026-02-28, **Then** a new task is created (end date not reached).
2. **Given** a recurring task has an end date of 2026-03-01, **When** completed on 2026-03-02, **Then** no new task is created.
3. **Given** the next occurrence would be after the end date, **When** completed, **Then** no new task is created and user is informed.

---

### User Story 5 - Handle Concurrent Completions (Priority: P2)

As a system, I need to handle multiple completion events for the same task without creating duplicate instances.

**Why this priority**: Ensures data integrity - prevents duplicate tasks from race conditions.

**Independent Test**: Send two completion events for same task, verify only one new task is created.

**Acceptance Scenarios**:

1. **Given** two completion events arrive for the same task_id, **When** both are processed, **Then** only one new task is created.
2. **Given** the first event creates a new task, **When** the duplicate arrives, **Then** it is acknowledged without action.
3. **Given** the service tracks processed events, **When** a duplicate is detected, **Then** it logs the duplicate and skips processing.

---

### Edge Cases

- What if task completion is received but task doesn't exist? (Log error, acknowledge event, skip processing)
- What if the original task has no recurrence pattern? (Should not trigger this service - log warning if received)
- What if database insert fails? (Retry with backoff, route to DLQ after max retries)
- What if next occurrence calculation results in invalid date? (Use last valid day of month)
- What if task was deleted after completion but before event processing? (Skip, log as cancelled)

## Requirements *(mandatory)*

### Functional Requirements

**Event Consumption**:
- **FR-001**: Service MUST consume `task.completed` events from `task-events` topic
- **FR-002**: Service MUST filter for events where `had_recurrence = true`
- **FR-003**: Service MUST implement idempotent processing using event_id
- **FR-004**: Service MUST acknowledge events only after successful processing or DLQ routing

**Date Calculation**:
- **FR-005**: For daily recurrence: next_due_date = completed_date + 1 day
- **FR-006**: For weekly recurrence: next_due_date = completed_date + 7 days
- **FR-007**: For monthly recurrence: next_due_date = same day next month (with month-end handling)
- **FR-008**: Month-end handling MUST use last valid day if original day doesn't exist in next month
- **FR-009**: All date calculations MUST respect UTC storage and user timezone

**Task Creation**:
- **FR-010**: New task MUST copy: title, description, priority, tags from original
- **FR-011**: New task MUST have: new due_date (calculated), completed=false, same recurrence_pattern
- **FR-012**: New task MUST have same user_id as original task
- **FR-013**: Service MUST NOT create new task if recurrence_end_date has passed
- **FR-014**: Service MUST NOT create new task if original task was deleted

**Event Publishing**:
- **FR-015**: Service MUST publish `recurring.task.created` event after successful creation
- **FR-016**: Event MUST include: original_task_id, new_task_id, recurrence_pattern, next_due_date

**Idempotency**:
- **FR-017**: Service MUST track processed task completions to prevent duplicate task creation
- **FR-018**: Duplicate events MUST be silently acknowledged (no error, no duplicate task)
- **FR-019**: Processed event tracking MUST be stored in database (not in-memory)

### Key Entities

- **Completed Task Event**: Input event with task_id, user_id, had_recurrence, completed_at
- **New Task Instance**: Output task created with calculated next_due_date
- **Processed Completion Record**: Tracks which task completions have been processed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New recurring task is created within 30 seconds of completion event
- **SC-002**: 100% of month-end edge cases calculate correctly (validated by test suite)
- **SC-003**: Zero duplicate tasks created under normal operation
- **SC-004**: Service processes up to 50 completion events per second
- **SC-005**: 99.9% of events are processed successfully (excluding permanently invalid events)
- **SC-006**: Service starts and is ready to process events within 30 seconds
- **SC-007**: Users see the new task in their list within 1 minute of completion

## Assumptions

- Completed task data is available in database or event payload
- User timezone is stored and accessible for date calculations
- Database supports transactional inserts for idempotency tracking
- Network connectivity allows Kafka consumption and database writes

## Date Calculation Reference

### Daily Recurrence
```
completed_date: 2026-01-28
next_due_date: 2026-01-29 (+ 1 day)
```

### Weekly Recurrence
```
completed_date: 2026-01-28 (Wednesday)
next_due_date: 2026-02-04 (Next Wednesday, + 7 days)
```

### Monthly Recurrence - Normal
```
completed_date: 2026-01-15
next_due_date: 2026-02-15 (same day next month)
```

### Monthly Recurrence - Month-End Edge Case
```
completed_date: 2026-01-31
next_month_has: 28 days (February 2026)
next_due_date: 2026-02-28 (last day of February)

completed_date: 2026-03-31
next_month_has: 30 days (April)
next_due_date: 2026-04-30 (last day of April)
```

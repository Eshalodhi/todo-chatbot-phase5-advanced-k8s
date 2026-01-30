# Feature Specification: Notification Service

**Feature Branch**: `phase5-notification-service`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Microservice for processing reminders and sending notifications via email/push

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Reminder Events (Priority: P1)

As the Notification Service, I need to consume reminder events from Kafka so I can send notifications at the right time.

**Why this priority**: Core functionality - receiving events is prerequisite for all notification features.

**Independent Test**: Publish reminder.triggered event, verify service receives and logs it.

**Acceptance Scenarios**:

1. **Given** the service is running, **When** a reminder.triggered event is published, **Then** the service receives it within 5 seconds.
2. **Given** multiple reminder events arrive, **When** processing, **Then** each event is handled independently.
3. **Given** the service restarts, **When** reconnecting to Kafka, **Then** any unprocessed events are consumed.
4. **Given** an event has already been processed (duplicate), **When** received again, **Then** it is acknowledged without reprocessing.

---

### User Story 2 - Send Email Notifications (Priority: P1)

As a user, I want to receive email notifications for my task reminders so I don't miss important deadlines.

**Why this priority**: Primary notification channel - most users expect email notifications.

**Independent Test**: Trigger a reminder, verify email is delivered to user's address.

**Acceptance Scenarios**:

1. **Given** a reminder.triggered event is received, **When** the user has an email address, **Then** an email notification is sent.
2. **Given** an email is sent, **When** delivery succeeds, **Then** a reminder.sent event is published with channel="email".
3. **Given** the email includes task details, **When** user views it, **Then** they see task title, due date, and a link to the app.
4. **Given** the user's timezone is set, **When** email is composed, **Then** times are displayed in their local timezone.

---

### User Story 3 - Check Pending Reminders (Priority: P1)

As a system, I need to periodically check for pending reminders so reminders are triggered at the correct time.

**Why this priority**: Ensures reminders are triggered even if not event-driven - backup mechanism.

**Independent Test**: Create reminder due in past, run scheduled check, verify reminder.triggered event is published.

**Acceptance Scenarios**:

1. **Given** reminders exist with remind_at in the past, **When** the scheduled job runs (every minute), **Then** reminder.triggered events are published for each.
2. **Given** a reminder is already marked as sent, **When** the job runs, **Then** it is not triggered again.
3. **Given** multiple reminders are due, **When** the job runs, **Then** all due reminders are processed.
4. **Given** a reminder's task was deleted, **When** the job runs, **Then** the orphaned reminder is cleaned up (not triggered).

---

### User Story 4 - Retry Failed Notifications (Priority: P2)

As a user, I want failed notifications to be retried so I eventually receive them.

**Why this priority**: Reliability enhancement - handles transient failures.

**Independent Test**: Simulate email delivery failure, verify retry occurs with backoff.

**Acceptance Scenarios**:

1. **Given** email delivery fails, **When** the service retries, **Then** the retry uses exponential backoff (1min, 5min, 15min).
2. **Given** a notification fails 3 times, **When** the final retry fails, **Then** the event is routed to the dead letter queue.
3. **Given** a retry succeeds, **When** the notification is sent, **Then** the reminder is marked as sent and no further retries occur.
4. **Given** multiple notifications are failing, **When** retries are scheduled, **Then** each notification retries independently.

---

### User Story 5 - Handle Timezone Differences (Priority: P2)

As a user in a specific timezone, I want reminders to respect my timezone so notifications arrive at appropriate local times.

**Why this priority**: User experience - prevents middle-of-night notifications.

**Independent Test**: Create reminder for 9 AM user time, verify it triggers at correct UTC time.

**Acceptance Scenarios**:

1. **Given** a user's timezone is stored, **When** a reminder time is calculated, **Then** UTC storage accounts for their timezone.
2. **Given** a reminder email is sent, **When** displaying times, **Then** all times show in the user's local timezone.
3. **Given** daylight saving time changes, **When** reminders span the change, **Then** timing remains accurate.

---

### Edge Cases

- What if user has no email address? (Log warning, skip notification, mark reminder as failed)
- What if email service is completely down? (Keep retrying with DLQ after max attempts)
- What if task was completed before reminder triggered? (Skip notification, publish reminder.cancelled)
- What if user timezone is not set? (Default to UTC, include note in email)
- What if same reminder triggers twice? (Idempotency check prevents duplicate sends)

## Requirements *(mandatory)*

### Functional Requirements

**Event Consumption**:
- **FR-001**: Service MUST consume events from `reminder-events` topic
- **FR-002**: Service MUST implement idempotent processing using event_id
- **FR-003**: Service MUST acknowledge events only after successful processing or DLQ routing
- **FR-004**: Service MUST handle consumer rebalances without message loss

**Scheduled Checks**:
- **FR-005**: Service MUST run a scheduled job every minute to check for due reminders
- **FR-006**: Scheduled job MUST query reminders where remind_at <= now AND sent = false
- **FR-007**: Scheduled job MUST publish reminder.triggered events for due reminders
- **FR-008**: Scheduled job MUST clean up orphaned reminders (task deleted)

**Email Notifications**:
- **FR-009**: System MUST send HTML and plain-text email versions
- **FR-010**: Email MUST include: task title, due date (user's timezone), link to app
- **FR-011**: Email MUST have clear subject line: "Reminder: {task_title}"
- **FR-012**: System MUST use configured SMTP server for email delivery
- **FR-013**: System MUST handle SMTP authentication securely (credentials from secrets)

**Retry Logic**:
- **FR-014**: Failed notifications MUST be retried up to 3 times
- **FR-015**: Retry intervals MUST use exponential backoff: 1 minute, 5 minutes, 15 minutes
- **FR-016**: After final failure, event MUST be routed to dead letter queue
- **FR-017**: Each retry attempt MUST be logged with failure reason

**Timezone Handling**:
- **FR-018**: All times MUST be stored in UTC in the database
- **FR-019**: All displayed times MUST be converted to user's timezone
- **FR-020**: Service MUST handle daylight saving time transitions correctly

**Event Publishing**:
- **FR-021**: Service MUST publish `reminder.sent` event after successful delivery
- **FR-022**: Service MUST publish `reminder.cancelled` event when task no longer exists

### Key Entities

- **Reminder**: Task reminder with remind_at, sent status, retry_count
- **Notification Delivery**: Record of notification attempt with status, channel, timestamp
- **User Preferences**: Notification settings including timezone, channels enabled

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of reminders are delivered within 2 minutes of scheduled time
- **SC-002**: Service processes up to 100 reminder events per second
- **SC-003**: Email delivery success rate is above 99% (excluding invalid addresses)
- **SC-004**: Retry mechanism recovers 90% of transient failures
- **SC-005**: Scheduled job completes in under 10 seconds for up to 10,000 pending reminders
- **SC-006**: Zero duplicate notifications sent under normal operation
- **SC-007**: Service starts and is ready to process events within 30 seconds

## Assumptions

- SMTP server credentials are provided via environment variables or secrets
- User email addresses are validated at registration time
- Users have opted in to receive email notifications
- Network connectivity allows outbound SMTP connections
- Scheduler runs reliably (APScheduler with persistence for crash recovery)

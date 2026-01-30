# Feature Specification: Kafka/Redpanda Integration

**Feature Branch**: `phase5-kafka-integration`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Kafka-compatible message streaming with Redpanda for local development and cloud production

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Development with Redpanda (Priority: P1)

As a developer, I want to run a Kafka-compatible message broker locally so I can develop and test event-driven features.

**Why this priority**: Enables local development of all event-driven features - foundational infrastructure.

**Independent Test**: Start Redpanda container, publish test event, consume and verify receipt.

**Acceptance Scenarios**:

1. **Given** Docker is installed, **When** I run docker-compose up, **Then** Redpanda starts and is accessible on port 9092.
2. **Given** Redpanda is running, **When** I publish a test event, **Then** the event appears in the topic.
3. **Given** Redpanda is running, **When** I start a consumer, **Then** it connects and receives published events.
4. **Given** Redpanda restarts, **When** I check topic data, **Then** previously published events are still available.

---

### User Story 2 - Publish Events from Chat API (Priority: P1)

As the Chat API service, I need to publish events when tasks change so other services are notified.

**Why this priority**: Core producer functionality - enables all downstream services.

**Independent Test**: Create task via chat, verify event published to task-events topic.

**Acceptance Scenarios**:

1. **Given** a user creates a task, **When** the operation succeeds, **Then** a task.created event is published to the task-events topic.
2. **Given** Kafka is temporarily unavailable, **When** publishing fails, **Then** the operation is retried with exponential backoff.
3. **Given** publishing repeatedly fails, **When** max retries are exhausted, **Then** the event is logged for manual recovery and user operation still succeeds.
4. **Given** multiple tasks are created quickly, **When** events are published, **Then** ordering is preserved per user.

---

### User Story 3 - Consume Events in Microservices (Priority: P1)

As a microservice, I need to consume events from Kafka topics so I can react to task changes.

**Why this priority**: Core consumer functionality - enables notification and recurring task services.

**Independent Test**: Publish task.completed event, verify Recurring Task Service creates next instance.

**Acceptance Scenarios**:

1. **Given** a consumer is running, **When** an event is published, **Then** the consumer receives it within 5 seconds.
2. **Given** multiple consumers in a consumer group, **When** events arrive, **Then** each event is processed by exactly one consumer.
3. **Given** a consumer crashes during processing, **When** it restarts, **Then** unacknowledged events are redelivered.
4. **Given** an event fails processing, **When** retries are exhausted, **Then** the event is sent to the dead letter queue.

---

### User Story 4 - Handle Failed Events (Priority: P2)

As an operator, I need failed events to be captured in a dead letter queue so they can be investigated and reprocessed.

**Why this priority**: Operational necessity - prevents data loss from processing failures.

**Independent Test**: Publish malformed event, verify it lands in DLQ topic.

**Acceptance Scenarios**:

1. **Given** an event fails processing 3 times, **When** the final retry fails, **Then** the event is published to dlq.{topic-name}.
2. **Given** events are in the DLQ, **When** I query the DLQ topic, **Then** I can see failed events with error details.
3. **Given** a DLQ event is fixed, **When** I republish it to the original topic, **Then** it is processed normally.

---

### User Story 5 - Production Kafka Cluster (Priority: P2)

As a system, I need to connect to a managed Kafka service in production so events are durable and scalable.

**Why this priority**: Required for production deployment - depends on local development working first.

**Independent Test**: Deploy to staging with cloud Kafka, verify end-to-end event flow.

**Acceptance Scenarios**:

1. **Given** production configuration is set, **When** services start, **Then** they connect to the cloud Kafka cluster.
2. **Given** TLS is configured, **When** connecting, **Then** all traffic is encrypted.
3. **Given** authentication is required, **When** services connect, **Then** they authenticate with provided credentials.
4. **Given** a broker fails, **When** the cluster rebalances, **Then** services continue operating without data loss.

---

### Edge Cases

- What if Kafka is unavailable at startup? (Service waits with backoff, logs warnings)
- What if a topic doesn't exist? (Auto-create with default config in dev; fail in prod)
- What if consumer processing takes too long? (Configure session timeout, handle rebalance)
- What if event payload is too large? (Reject at producer, max 1MB)
- What if messages arrive out of order? (Accept - each service handles idempotently)

## Requirements *(mandatory)*

### Functional Requirements

**Infrastructure**:
- **FR-001**: System MUST use Redpanda for local development (Kafka-compatible)
- **FR-002**: System MUST support managed Kafka services for production (Redpanda Cloud, Confluent, or equivalent)
- **FR-003**: System MUST support TLS encryption for production connections
- **FR-004**: System MUST support SASL authentication for production

**Topics**:
- **FR-005**: System MUST create topic `task-events` for task lifecycle events (3 partitions, 7-day retention)
- **FR-006**: System MUST create topic `reminder-events` for reminder events (3 partitions, 7-day retention)
- **FR-007**: System MUST create topic `notification-events` for notification delivery (3 partitions, 7-day retention)
- **FR-008**: System MUST create dead letter queue topics `dlq.{topic-name}` (1 partition, 30-day retention)

**Producers**:
- **FR-009**: Producers MUST use idempotent mode to prevent duplicate messages
- **FR-010**: Producers MUST retry transient failures with exponential backoff (max 3 retries)
- **FR-011**: Producers MUST use asynchronous publishing to avoid blocking user operations
- **FR-012**: Producers MUST partition by user_id to maintain per-user ordering

**Consumers**:
- **FR-013**: Consumers MUST use consumer groups for horizontal scaling
- **FR-014**: Consumers MUST manually commit offsets after successful processing
- **FR-015**: Consumers MUST handle rebalances gracefully (pause processing, resume after)
- **FR-016**: Consumers MUST implement dead letter queue routing for failed messages

**Monitoring**:
- **FR-017**: System MUST expose consumer lag metrics
- **FR-018**: System MUST log all publish failures with event details
- **FR-019**: System MUST alert when consumer lag exceeds threshold (configurable, default 1000 messages)

### Key Entities

- **Topic**: Named channel for events with partition count and retention settings
- **Consumer Group**: Named group of consumers that share topic consumption
- **Dead Letter Queue**: Topic for events that failed processing
- **Producer Config**: Connection settings, serializer, partitioner
- **Consumer Config**: Connection settings, deserializer, group membership

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Local Redpanda starts in under 30 seconds
- **SC-002**: Event publishing adds less than 50ms latency to user operations
- **SC-003**: 99.9% of events are delivered to consumers within 5 seconds
- **SC-004**: Consumer lag remains under 100 messages during normal operation
- **SC-005**: Zero data loss during broker failover (production)
- **SC-006**: System handles 1000 events per second without degradation
- **SC-007**: Failed events appear in DLQ within 1 minute of final retry failure

## Assumptions

- Docker and Docker Compose are available for local development
- Production Kafka credentials are provided via environment variables or secrets
- Network connectivity allows producer-broker and consumer-broker communication
- Sufficient disk space for retention periods (estimated 1GB for 7 days at expected volume)

## Topic Configuration Reference

| Topic | Partitions | Retention | Replication | Purpose |
|-------|------------|-----------|-------------|---------|
| task-events | 3 | 7 days | 1 (dev) / 3 (prod) | Task lifecycle events |
| reminder-events | 3 | 7 days | 1 (dev) / 3 (prod) | Reminder scheduling |
| notification-events | 3 | 7 days | 1 (dev) / 3 (prod) | Notification delivery |
| dlq.task-events | 1 | 30 days | 1 (dev) / 3 (prod) | Failed task events |
| dlq.reminder-events | 1 | 30 days | 1 (dev) / 3 (prod) | Failed reminder events |

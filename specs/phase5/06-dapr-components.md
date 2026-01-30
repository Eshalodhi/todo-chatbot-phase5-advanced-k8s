# Feature Specification: Dapr Components

**Feature Branch**: `phase5-dapr-components`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Dapr distributed runtime configuration including pub/sub, state store, bindings, and secrets

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish Events via Dapr Pub/Sub (Priority: P1)

As a microservice, I want to publish events through Dapr so I don't need to manage Kafka connections directly.

**Why this priority**: Core abstraction layer - simplifies all event publishing across services.

**Independent Test**: Publish event via Dapr SDK, verify event appears in Kafka topic.

**Acceptance Scenarios**:

1. **Given** a service with Dapr sidecar, **When** I call the Dapr publish API, **Then** the event is published to the configured Kafka topic.
2. **Given** Dapr pub/sub is configured for Kafka, **When** I publish to topic "task-events", **Then** Kafka receives the event on "task-events" topic.
3. **Given** I use the Dapr SDK, **When** publishing an event, **Then** serialization and connection management are handled automatically.
4. **Given** Kafka is temporarily unavailable, **When** publishing fails, **Then** Dapr retries according to its resilience policy.

---

### User Story 2 - Subscribe to Events via Dapr (Priority: P1)

As a microservice, I want to receive events through Dapr subscriptions so Dapr manages consumer group membership.

**Why this priority**: Enables event consumption - required for notification and recurring task services.

**Independent Test**: Configure Dapr subscription, publish event, verify service receives HTTP callback.

**Acceptance Scenarios**:

1. **Given** a subscription is configured for "task-events", **When** an event is published, **Then** my service receives an HTTP POST to the configured endpoint.
2. **Given** multiple service replicas are running, **When** events arrive, **Then** each event is delivered to exactly one replica.
3. **Given** my handler returns success (200 OK), **When** Dapr processes it, **Then** the event is acknowledged.
4. **Given** my handler returns failure (500), **When** Dapr processes it, **Then** the event is retried or routed to dead letter.

---

### User Story 3 - Store State with Dapr State Store (Priority: P2)

As a microservice, I want to use Dapr state management so I can store idempotency records without direct database access.

**Why this priority**: Optional abstraction - useful for simple key-value storage needs.

**Independent Test**: Save state via Dapr, retrieve it, verify correct value returned.

**Acceptance Scenarios**:

1. **Given** a state store is configured, **When** I save a key-value pair, **Then** it is persisted to the underlying store.
2. **Given** I saved state previously, **When** I retrieve by key, **Then** the correct value is returned.
3. **Given** I want to update state conditionally, **When** I use ETags, **Then** concurrent updates are handled safely.
4. **Given** the state store backend changes, **When** I use Dapr SDK calls, **Then** my code doesn't need to change.

---

### User Story 4 - Manage Secrets with Dapr Secrets (Priority: P1)

As a microservice, I want to retrieve secrets through Dapr so sensitive data isn't hardcoded or in environment variables.

**Why this priority**: Security requirement - all services need secrets access.

**Independent Test**: Configure Kubernetes secrets, retrieve via Dapr API, verify correct value.

**Acceptance Scenarios**:

1. **Given** secrets are stored in Kubernetes Secrets, **When** I query Dapr secrets API, **Then** I receive the secret value.
2. **Given** I reference a secret in component YAML, **When** Dapr initializes the component, **Then** the secret is injected.
3. **Given** a secret doesn't exist, **When** I request it, **Then** a clear error is returned (not a crash).
4. **Given** secrets are rotated, **When** I request the secret, **Then** I receive the updated value.

---

### User Story 5 - Schedule Tasks with Dapr Bindings (Priority: P2)

As the Notification Service, I want to use Dapr cron bindings so scheduled jobs are managed declaratively.

**Why this priority**: Alternative to APScheduler - provides consistency with Dapr ecosystem.

**Independent Test**: Configure cron binding for every minute, verify HTTP callback received.

**Acceptance Scenarios**:

1. **Given** a cron binding is configured for "* * * * *", **When** a minute passes, **Then** my service receives an HTTP callback.
2. **Given** the cron triggers, **When** my handler runs, **Then** it can check for due reminders.
3. **Given** my service is scaled to multiple replicas, **When** cron triggers, **Then** only one replica receives the callback (leader election).

---

### Edge Cases

- What if Dapr sidecar isn't ready at startup? (Service waits with health check)
- What if pub/sub component fails to initialize? (Service fails fast with clear error)
- What if state store is unavailable? (Operations fail with retryable error)
- What if secret doesn't exist? (Error returned, service logs and continues if optional)
- What if cron binding triggers during deployment? (Handled gracefully, no duplicate processing)

## Requirements *(mandatory)*

### Functional Requirements

**Pub/Sub Component**:
- **FR-001**: System MUST configure a Dapr pub/sub component named `pubsub-kafka`
- **FR-002**: Component MUST connect to Kafka-compatible broker (Redpanda or Kafka)
- **FR-003**: Component MUST support configurable broker addresses via metadata
- **FR-004**: Component MUST support authentication (SASL) for production
- **FR-005**: Services MUST publish events using Dapr SDK or HTTP API

**Subscriptions**:
- **FR-006**: Services MUST declare subscriptions via subscription YAML or programmatic registration
- **FR-007**: Subscriptions MUST specify topic, route (HTTP endpoint), and pub/sub component name
- **FR-008**: Failed message handling MUST route to dead letter topic after retries
- **FR-009**: Subscription MUST use consumer groups for load balancing across replicas

**State Store Component**:
- **FR-010**: System MUST configure a Dapr state store component named `statestore`
- **FR-011**: State store MUST use PostgreSQL backend (Neon)
- **FR-012**: State store MUST support transactional operations
- **FR-013**: Connection string MUST be retrieved from secrets component

**Secrets Component**:
- **FR-014**: Local development MUST use `secretstores.local.env` for environment variables
- **FR-015**: Kubernetes deployment MUST use `secretstores.kubernetes` for K8s Secrets
- **FR-016**: All sensitive configuration MUST be retrieved via secrets (DATABASE_URL, API keys)

**Cron Binding (Optional)**:
- **FR-017**: Notification service MAY use cron binding for scheduled checks
- **FR-018**: Cron binding MUST trigger endpoint at configured schedule (e.g., every minute)

**Sidecar Configuration**:
- **FR-019**: All microservices MUST run with Dapr sidecar enabled
- **FR-020**: Kubernetes deployments MUST include sidecar annotations (`dapr.io/enabled: "true"`)
- **FR-021**: App port annotation MUST match service's HTTP port
- **FR-022**: Health probes MUST wait for sidecar readiness

### Key Entities

- **Pub/Sub Component**: Dapr component configuration for Kafka messaging
- **State Store Component**: Dapr component configuration for PostgreSQL state
- **Secrets Component**: Dapr component configuration for secret retrieval
- **Binding Component**: Dapr component configuration for cron triggers
- **Subscription**: Declaration of topic-to-endpoint routing

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Services can publish events without direct Kafka client code
- **SC-002**: Event delivery latency via Dapr is less than 100ms overhead vs direct Kafka
- **SC-003**: State operations complete in under 50ms for simple key-value access
- **SC-004**: Secrets are never logged or exposed in configuration files
- **SC-005**: Service startup with Dapr sidecar completes in under 60 seconds
- **SC-006**: Switching between local and Kubernetes secrets requires only component file change
- **SC-007**: 100% of inter-service communication uses Dapr abstractions (no direct connections)

## Assumptions

- Dapr is installed in the Kubernetes cluster (`dapr init -k`)
- Dapr version 1.12 or later is used
- PostgreSQL (Neon) is accessible for state store
- Kubernetes Secrets are created before deployment
- Network allows sidecar-to-sidecar and sidecar-to-broker communication

## Component YAML Reference

### Pub/Sub Component (pubsub-kafka.yaml)
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-kafka
  namespace: todo-app
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "redpanda:9092"  # Local: redpanda:9092, Prod: from secret
    - name: consumerGroup
      value: "todo-app"
    - name: authType
      value: "none"  # Local: none, Prod: sasl
```

### State Store Component (statestore.yaml)
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: todo-app
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: db-secrets
        key: DATABASE_URL
```

### Secrets Component - Local (secrets-local.yaml)
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.env
  version: v1
```

### Secrets Component - Kubernetes (secrets-k8s.yaml)
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
  namespace: todo-app
spec:
  type: secretstores.kubernetes
  version: v1
```

### Cron Binding (reminder-cron.yaml)
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: reminder-cron
  namespace: todo-app
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "* * * * *"  # Every minute
```

### Subscription (task-events-subscription.yaml)
```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: task-events-subscription
  namespace: todo-app
spec:
  pubsubname: pubsub-kafka
  topic: task-events
  routes:
    default: /events/task
  deadLetterTopic: dlq.task-events
```

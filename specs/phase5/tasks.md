# Tasks: Phase V Advanced Cloud Deployment

**Input**: Design documents from `/specs/phase5/`
**Prerequisites**: plan.md, 01-advanced-features.md (spec), research.md, data-model.md, contracts/

**Organization**: Tasks are organized by implementation stage and user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend API**: `backend/app/`
- **Frontend**: `frontend/`
- **Microservices**: `services/notification/`, `services/recurring/`
- **Infrastructure**: `dapr/`, `helm/`, `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and infrastructure setup

- [x] T001 Create directory structure for new services per plan.md in services/notification/ and services/recurring/
- [x] T002 Create directory structure for Dapr components in dapr/
- [x] T003 [P] Create docker-compose.redpanda.yml for local Kafka development at repository root
- [x] T004 [P] Add aiokafka, dapr-client, APScheduler, aiosmtplib, python-dateutil to backend/requirements.txt
- [x] T005 [P] Create services/notification/requirements.txt with FastAPI, aiokafka, dapr-client, APScheduler, aiosmtplib dependencies
- [x] T006 [P] Create services/recurring/requirements.txt with FastAPI, aiokafka, dapr-client, python-dateutil dependencies
- [x] T007 [P] Create services/notification/Dockerfile with multi-stage build
- [x] T008 [P] Create services/recurring/Dockerfile with multi-stage build

**Checkpoint**: Infrastructure directories and dependencies ready

---

## Phase 2: Foundational (Database Schema & Event Infrastructure)

**Purpose**: Database migrations and event schemas that MUST be complete before user stories

**⚠️ CRITICAL**: No feature work can begin until this phase is complete

### Database Schema Extension

- [x] T009 Create Priority and RecurrencePattern enum classes in backend/app/models/enums.py
- [x] T010 Extend Task model with due_date, priority, recurrence_pattern, recurrence_end_date fields in backend/app/models/task.py
- [x] T011 [P] Create Reminder model in backend/app/models/reminder.py per data-model.md
- [x] T012 [P] Create Tag model in backend/app/models/tag.py per data-model.md
- [x] T013 [P] Create TaskTag join table model in backend/app/models/task_tag.py per data-model.md
- [x] T014 [P] Create ProcessedEvent model for idempotency in backend/app/models/processed_event.py
- [x] T015 Create database migration SQL script in backend/migrations/phase5_migration.sql per data-model.md
- [x] T016 Add new model imports to backend/app/models/__init__.py

### Event Schema Classes

- [x] T017 Create event envelope base class in backend/app/events/schemas.py per contracts/task-events.json
- [x] T018 [P] Create TaskEvent schema classes (TaskCreatedEvent, TaskUpdatedEvent, TaskCompletedEvent, TaskDeletedEvent) in backend/app/events/task_events.py
- [x] T019 [P] Create ReminderEvent schema classes (ReminderScheduledEvent, ReminderTriggeredEvent, ReminderSentEvent, ReminderCancelledEvent) in backend/app/events/reminder_events.py
- [x] T020 [P] Create RecurringTaskCreatedEvent schema class in backend/app/events/recurring_events.py

### Kafka Producer Setup

- [x] T021 Create Kafka producer wrapper using aiokafka in backend/app/events/producer.py per research.md
- [x] T022 Add producer initialization to FastAPI lifespan in backend/app/main.py
- [x] T023 Create event publishing helper functions in backend/app/events/publisher.py

**Checkpoint**: Database schema extended, event schemas defined, Kafka producer ready

---

## Phase 3: User Story 1 - Set Task Priority (Priority: P1) 🎯 MVP

**Goal**: Users can assign priority levels (low/medium/high) to tasks and filter by priority

**Independent Test**: Create task with high priority, verify it displays with priority indicator and can be filtered

### Implementation for User Story 1

- [x] T024 [US1] Update TaskCreate Pydantic schema to include optional priority field in backend/app/schemas/task.py
- [x] T025 [US1] Update TaskResponse schema to include priority field in backend/app/schemas/task.py
- [x] T026 [US1] Update add_task MCP tool to accept priority parameter in backend/app/tools/add_task.py
- [x] T027 [US1] Update list_tasks MCP tool to support priority filter parameter in backend/app/tools/list_tasks.py
- [x] T028 [US1] Update list_tasks to support sorting by priority in backend/app/tools/list_tasks.py
- [x] T029 [US1] Add priority to tool function definitions for OpenAI in backend/app/tools/definitions.py
- [x] T030 [US1] Publish task.created event with priority in add_task tool in backend/app/tools/add_task.py

**Checkpoint**: Priority feature complete - users can create tasks with priority and filter/sort by priority

---

## Phase 4: User Story 2 - Set Due Date (Priority: P1)

**Goal**: Users can set due dates on tasks, view in local timezone, filter by date range

**Independent Test**: Create task with due date, verify it displays correctly and can be sorted/filtered by date

### Implementation for User Story 2

- [x] T031 [US2] Update TaskCreate schema to include optional due_date field in backend/app/schemas/task.py
- [x] T032 [US2] Update TaskResponse schema to include due_date field in backend/app/schemas/task.py
- [x] T033 [US2] Update add_task tool to accept due_date parameter in backend/app/tools/add_task.py
- [x] T034 [US2] Update list_tasks tool to support due_before and due_after filter parameters in backend/app/tools/list_tasks.py
- [x] T035 [US2] Update list_tasks to support sorting by due_date in backend/app/tools/list_tasks.py
- [x] T036 [US2] Add due_date to tool function definitions in backend/app/tools/definitions.py
- [x] T037 [US2] Include due_date in task.created event payload in backend/app/tools/add_task.py

**Checkpoint**: Due date feature complete - users can create tasks with due dates and filter/sort by date

---

## Phase 5: User Story 3 - Create Recurring Task (Priority: P2)

**Goal**: Users can create recurring tasks (daily/weekly/monthly) that auto-generate next instance on completion

**Independent Test**: Create daily recurring task, complete it, verify new instance created for tomorrow

### Implementation for User Story 3

- [x] T038 [US3] Update TaskCreate schema to include recurrence_pattern and recurrence_end_date in backend/app/schemas/task.py
- [x] T039 [US3] Create add_recurring_task MCP tool in backend/app/tools/add_recurring_task.py (merged into add_task tool)
- [x] T040 [US3] Add add_recurring_task to tool definitions in backend/app/tools/definitions.py (merged into add_task definition)
- [x] T041 [US3] Update complete_task tool to publish task.completed event with had_recurrence flag in backend/app/tools/complete_task.py
- [x] T042 [US3] Include recurrence_pattern in task.completed event payload in backend/app/tools/complete_task.py

**Checkpoint**: Recurring task creation complete - tasks can be marked as recurring (processing handled by Stage 2 service)

---

## Phase 6: User Story 4 - Set Task Reminder (Priority: P2)

**Goal**: Users can set reminders for tasks and receive notifications at scheduled time

**Independent Test**: Set reminder for task, verify reminder record created and reminder.scheduled event published

### Implementation for User Story 4

- [x] T043 [US4] Create ReminderCreate and ReminderResponse schemas in backend/app/schemas/reminder.py (inline in tools)
- [x] T044 [US4] Create set_reminder MCP tool in backend/app/tools/set_reminder.py
- [x] T045 [US4] Add set_reminder to tool definitions in backend/app/tools/definitions.py
- [x] T046 [US4] Publish reminder.scheduled event in set_reminder tool in backend/app/tools/set_reminder.py
- [x] T047 [US4] Create list_reminders helper in backend/app/tools/list_reminders.py
- [x] T048 [US4] Update complete_task to cancel pending reminders and publish reminder.cancelled event in backend/app/tools/complete_task.py

**Checkpoint**: Reminder feature complete - users can set reminders (notification delivery handled by Stage 2 service)

---

## Phase 7: User Story 5 - Organize Tasks with Tags (Priority: P3)

**Goal**: Users can create tags, assign to tasks, and filter tasks by tag

**Independent Test**: Create tags, assign to tasks, filter tasks by tag

### Implementation for User Story 5

- [x] T049 [US5] Create TagCreate and TagResponse schemas in backend/app/schemas/tag.py (added to schemas.py)
- [x] T050 [US5] Create tag CRUD operations in backend/app/services/tag_service.py (inline in router)
- [x] T051 [US5] Create /tags GET and POST endpoints in backend/app/routers/tags.py
- [x] T052 [US5] Create /tags/{tag_id} DELETE endpoint in backend/app/routers/tags.py
- [x] T053 [US5] Update TaskCreate schema to include optional tag_ids array in backend/app/schemas/task.py
- [x] T054 [US5] Update add_task tool to handle tag assignment in backend/app/tools/add_task.py
- [x] T055 [US5] Create /tasks/{task_id}/tags POST and DELETE endpoints in backend/app/routers/tasks.py (in tags router)
- [x] T056 [US5] Update list_tasks tool to support filtering by tags parameter in backend/app/tools/list_tasks.py
- [x] T057 [US5] Include tags in task.created event payload in backend/app/tools/add_task.py

**Checkpoint**: Tags feature complete - users can create tags and organize tasks

---

## Phase 8: User Story 6 - Search and Filter Tasks (Priority: P3)

**Goal**: Users can search tasks by text and apply combined filters

**Independent Test**: Create multiple tasks, search by keyword, verify matching tasks returned

### Implementation for User Story 6

- [x] T058 [US6] Add search parameter to list_tasks tool for title/description search in backend/app/tools/list_tasks.py
- [x] T059 [US6] Implement combined filtering logic (priority + status + due_date + tags + search) in backend/app/tools/list_tasks.py
- [x] T060 [US6] Update /tasks GET endpoint to support all filter query parameters per contracts/api-extensions.yaml in backend/app/routers/tasks.py
- [x] T061 [US6] Add order parameter (asc/desc) to list_tasks tool in backend/app/tools/list_tasks.py

**Checkpoint**: Search and filter complete - users can find tasks with any combination of criteria

---

## Phase 9: Stage 2 - Kafka Infrastructure (Redpanda + Consumers)

**Purpose**: Event-driven infrastructure with Kafka producers and consumer microservices

### Redpanda Local Setup

- [x] T062 Configure Redpanda container in docker-compose.redpanda.yml with ports 9092, 8081, 8082
- [x] T063 Add topic auto-creation configuration for task-events, reminder-events, notification-events
- [x] T064 Add dead letter queue topics dlq.task-events, dlq.reminder-events

### Notification Service Skeleton

- [x] T065 Create FastAPI app skeleton in services/notification/app/main.py with /health endpoint
- [x] T066 [P] Create Kafka consumer for reminder-events topic in services/notification/app/consumer.py
- [x] T067 [P] Create idempotency checker using ProcessedEvent model in services/notification/app/idempotency.py
- [x] T068 Create APScheduler setup for minute-by-minute reminder checks in services/notification/app/scheduler.py
- [x] T069 Create pending reminders query in services/notification/app/queries.py per data-model.md
- [x] T070 Implement reminder.triggered event publishing in scheduled job in services/notification/app/scheduler.py
- [x] T071 Create email notification sender using aiosmtplib in services/notification/app/notifier.py per research.md
- [x] T072 Implement retry logic with exponential backoff (1min, 5min, 15min) in services/notification/app/notifier.py
- [x] T073 Implement reminder.sent event publishing after successful delivery in services/notification/app/notifier.py
- [x] T074 Implement DLQ routing after 3 failed attempts in services/notification/app/consumer.py

### Recurring Task Service Skeleton

- [x] T075 Create FastAPI app skeleton in services/recurring/app/main.py with /health endpoint
- [x] T076 [P] Create Kafka consumer for task-events topic in services/recurring/app/consumer.py
- [x] T077 [P] Create idempotency checker in services/recurring/app/idempotency.py
- [x] T078 Create date calculator for next occurrence in services/recurring/app/calculator.py per research.md
- [x] T079 Implement month-end edge case handling in calculator (31st → last day of month) in services/recurring/app/calculator.py
- [x] T080 Create new task creation logic copying title, description, priority, tags in services/recurring/app/task_creator.py
- [x] T081 Implement recurrence_end_date check before creating new task in services/recurring/app/task_creator.py
- [x] T082 Implement recurring.task.created event publishing in services/recurring/app/task_creator.py
- [x] T083 Implement DLQ routing for failed processing in services/recurring/app/consumer.py

**Checkpoint**: Stage 2 complete - events flow through Kafka, microservices process events

---

## Phase 10: Stage 3 - Dapr Integration

**Purpose**: Abstract infrastructure with Dapr components for Kubernetes deployment

### Dapr Component Configuration

- [x] T084 Create pubsub-kafka.yaml Dapr component for Redpanda in dapr/pubsub-kafka.yaml per 06-dapr-components.md
- [x] T085 [P] Create pubsub-kafka-local.yaml for local development in dapr/pubsub-kafka-local.yaml
- [x] T086 [P] Create statestore.yaml Dapr component for PostgreSQL in dapr/statestore.yaml
- [x] T087 [P] Create secrets-local.yaml for local environment variables in dapr/secrets-local.yaml
- [x] T088 [P] Create secrets-k8s.yaml for Kubernetes secrets in dapr/secrets-k8s.yaml

### Dapr Subscriptions

- [x] T089 [P] Create task-events subscription YAML in dapr/subscriptions/task-events.yaml
- [x] T090 [P] Create reminder-events subscription YAML in dapr/subscriptions/reminder-events.yaml

### Service Dapr Integration

- [x] T091 Update backend/app/events/publisher.py to use Dapr SDK for publishing instead of direct Kafka
- [x] T092 Add HTTP event handler endpoint /events/task in services/recurring/app/main.py for Dapr subscription callback
- [x] T093 Add HTTP event handler endpoint /events/reminder in services/notification/app/main.py for Dapr subscription callback
- [x] T094 Update services to retrieve secrets via Dapr secrets API

### Helm Chart Updates

- [x] T095 Create notification-deployment.yaml Helm template in helm/todo-chatbot/templates/notification-deployment.yaml
- [x] T096 [P] Create notification-service.yaml Helm template in helm/todo-chatbot/templates/notification-service.yaml
- [x] T097 [P] Create recurring-deployment.yaml Helm template in helm/todo-chatbot/templates/recurring-deployment.yaml
- [x] T098 [P] Create recurring-service.yaml Helm template in helm/todo-chatbot/templates/recurring-service.yaml
- [x] T099 Create dapr-components.yaml Helm template in helm/todo-chatbot/templates/dapr-components.yaml
- [x] T100 Add Dapr annotations to all deployment templates (dapr.io/enabled, dapr.io/app-id, dapr.io/app-port)
- [x] T101 Update values.yaml with notification and recurring service configurations in helm/todo-chatbot/values.yaml
- [x] T102 [P] Create values-dev.yaml with local development settings in helm/todo-chatbot/values-dev.yaml
- [x] T103 [P] Update values-staging.yaml with staging settings in helm/todo-chatbot/values-staging.yaml
- [x] T104 [P] Update values-prod.yaml with production settings in helm/todo-chatbot/values-prod.yaml

**Checkpoint**: Stage 3 complete - Dapr abstracts infrastructure, Helm charts ready for deployment

---

## Phase 11: Stage 4 - CI/CD Pipelines

**Purpose**: Automated testing, building, and deployment via GitHub Actions

### CI Pipeline

- [x] T105 Create .github/workflows/ci.yml with backend-test job (pytest, ruff) per 09-cicd-pipeline.md
- [x] T106 Add frontend-test job to ci.yml (npm test, ESLint, tsc)
- [x] T107 Configure CI to run on push and pull_request events

### Build Pipeline

- [x] T108 Create .github/workflows/build-push.yml for Docker image builds per 09-cicd-pipeline.md
- [x] T109 Configure matrix build for frontend, backend, notification, recurring services
- [x] T110 Configure Docker layer caching with GitHub Actions cache
- [x] T111 Add image tagging with commit SHA and latest

### Deployment Pipelines

- [x] T112 Create .github/workflows/deploy-staging.yml triggered by build-push success per 09-cicd-pipeline.md
- [x] T113 Configure kubectl and Helm in deploy-staging workflow
- [x] T114 [P] Create .github/workflows/deploy-prod.yml with manual trigger (workflow_dispatch) per 09-cicd-pipeline.md
- [x] T115 Configure production environment approval in deploy-prod workflow

**Checkpoint**: Stage 4 complete - CI/CD pipelines automate testing and deployment

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and hardening

- [x] T116 [P] Validate all tools register correctly in MCP tool executor in backend/app/tools/__init__.py
- [x] T117 [P] Add input validation for all new tool parameters
- [x] T118 Update quickstart.md with any discovered setup issues in specs/phase5/quickstart.md
- [x] T119 [P] Add logging for all event publishing operations
- [x] T120 [P] Add logging for all event consumption operations
- [x] T121 Add error handling for Kafka connection failures with graceful degradation
- [x] T122 Validate all Helm templates with `helm lint`
- [x] T123 Run end-to-end test: create recurring task → complete → verify new task created
- [x] T124 Run end-to-end test: set reminder → wait for time → verify email sent
- [x] T125 Verify idempotency: send duplicate event → verify only processed once

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all feature phases)
    ↓
┌───────────────────────────────────────────────────────────────┐
│  Phases 3-8: User Stories (can run in parallel after Phase 2) │
│  US1 (Priority) → US2 (Due Date) → US3 (Recurring)            │
│  US4 (Reminder) → US5 (Tags) → US6 (Search)                   │
└───────────────────────────────────────────────────────────────┘
    ↓
Phase 9: Stage 2 - Kafka Infrastructure (requires US3, US4 for events)
    ↓
Phase 10: Stage 3 - Dapr Integration (requires Phase 9)
    ↓
Phase 11: Stage 4 - CI/CD Pipelines (can run in parallel with Phase 10)
    ↓
Phase 12: Polish (after all phases)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Priority) | Phase 2 | Phase 2 complete |
| US2 (Due Date) | Phase 2 | Phase 2 complete |
| US3 (Recurring) | Phase 2 | Phase 2 complete |
| US4 (Reminder) | Phase 2, US3 (event schema) | Phase 2 complete |
| US5 (Tags) | Phase 2 | Phase 2 complete |
| US6 (Search) | US1, US2, US5 (filter logic) | US1, US2, US5 complete |

### Parallel Opportunities

**Phase 1 Parallel Tasks**:
```
T003 docker-compose.redpanda.yml
T004 backend/requirements.txt
T005 notification/requirements.txt
T006 recurring/requirements.txt
T007 notification/Dockerfile
T008 recurring/Dockerfile
```

**Phase 2 Parallel Tasks**:
```
T011 Reminder model
T012 Tag model
T013 TaskTag model
T014 ProcessedEvent model
T018 TaskEvent schemas
T019 ReminderEvent schemas
T020 RecurringEvent schemas
```

**User Stories (After Phase 2)**:
```
US1 (Priority) ──┐
US2 (Due Date) ──┼── Can all start in parallel
US3 (Recurring) ─┤
US4 (Reminder) ──┤
US5 (Tags) ──────┘
```

**Phase 10 Parallel Tasks**:
```
T085-T088 Dapr component files
T089-T090 Subscription files
T096-T098 Service templates
T102-T104 Values files
```

---

## Implementation Strategy

### MVP First (Stage 1 Features Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Priority) - **First testable increment**
4. Complete Phase 4: US2 (Due Date)
5. **STOP and VALIDATE**: Test priority and due date features via chat

### Event-Driven MVP (Add Stage 2)

6. Complete Phase 5: US3 (Recurring)
7. Complete Phase 6: US4 (Reminder)
8. Complete Phase 9: Stage 2 - Kafka Infrastructure
9. **STOP and VALIDATE**: Test event flow locally with Redpanda

### Full Local Deployment (Add Stage 3)

10. Complete Phase 7: US5 (Tags)
11. Complete Phase 8: US6 (Search)
12. Complete Phase 10: Stage 3 - Dapr Integration
13. **STOP and VALIDATE**: Deploy to Minikube, test full flow

### Production Ready (Add Stage 4)

14. Complete Phase 11: Stage 4 - CI/CD Pipelines
15. Complete Phase 12: Polish
16. **DEPLOY**: Push to staging, then production

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| Phase 1: Setup | T001-T008 (8) | Infrastructure setup |
| Phase 2: Foundational | T009-T023 (15) | Database + Event schemas |
| Phase 3: US1 Priority | T024-T030 (7) | Priority feature |
| Phase 4: US2 Due Date | T031-T037 (7) | Due date feature |
| Phase 5: US3 Recurring | T038-T042 (5) | Recurring task creation |
| Phase 6: US4 Reminder | T043-T048 (6) | Reminder feature |
| Phase 7: US5 Tags | T049-T057 (9) | Tags feature |
| Phase 8: US6 Search | T058-T061 (4) | Search/filter feature |
| Phase 9: Stage 2 Kafka | T062-T083 (22) | Kafka + Microservices |
| Phase 10: Stage 3 Dapr | T084-T104 (21) | Dapr + Helm |
| Phase 11: Stage 4 CI/CD | T105-T115 (11) | GitHub Actions |
| Phase 12: Polish | T116-T125 (10) | Validation |

**Total Tasks**: 125

**By User Story**:
- US1 (Priority): 7 tasks
- US2 (Due Date): 7 tasks
- US3 (Recurring): 5 tasks
- US4 (Reminder): 6 tasks
- US5 (Tags): 9 tasks
- US6 (Search): 4 tasks
- Infrastructure: 87 tasks

**MVP Scope**: Phases 1-4 (37 tasks) for basic priority + due date features
**Event MVP**: Phases 1-6, 9 (71 tasks) for recurring tasks + reminders with Kafka

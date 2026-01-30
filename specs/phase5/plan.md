# Implementation Plan: Phase V Advanced Cloud Deployment

**Branch**: `phase5-event-driven-cloud` | **Date**: 2026-01-28 | **Spec**: [specs/phase5/](./specs/phase5/)
**Input**: 10 Feature specifications from `/specs/phase5/`

## Summary

Phase V transforms the Todo Chatbot from a monolithic application into an event-driven microservices architecture with advanced task features (recurring tasks, reminders, priorities, tags), Kafka/Redpanda messaging, Dapr distributed runtime, and cloud Kubernetes deployment with CI/CD automation.

**Primary Requirements**:
- Extend task model with priority, due_date, recurrence, and tags
- Implement event-driven communication between microservices
- Build Notification Service for reminder delivery
- Build Recurring Task Service for automatic task recreation
- Deploy to cloud Kubernetes with Dapr sidecars
- Automate deployment with GitHub Actions CI/CD

**Technical Approach**: 4-stage sequential implementation (Features → Kafka → Dapr → Cloud)

## Technical Context

**Language/Version**: Python 3.11 (backend/microservices), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI, SQLModel, aiokafka, dapr-client, APScheduler, Next.js 14+
**Storage**: Neon PostgreSQL (serverless, existing), Redpanda/Kafka (events)
**Testing**: pytest (backend), jest/vitest (frontend), manual E2E validation
**Target Platform**: Kubernetes (Minikube local, DOKS/GKE/AKS cloud)
**Project Type**: Web application with microservices
**Performance Goals**: <3s response time, 100+ events/second throughput
**Constraints**: Hackathon timeline, free-tier cloud resources
**Scale/Scope**: 100+ concurrent users, 10,000+ events/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | JWT Verification on protected routes | ✅ PASS | Existing implementation preserved |
| 2 | User ID match in token vs URL | ✅ PASS | Existing implementation preserved |
| 3 | Query filtering by user_id | ✅ PASS | All new queries include user_id |
| 4 | Password hashing with bcrypt | ✅ PASS | No changes to auth |
| 5 | Index on user_id | ✅ PASS | Adding indexes on new columns |
| 6 | TypeScript strict mode | ✅ PASS | Existing frontend config |
| 7 | Server Components default | ✅ PASS | No frontend changes required |
| 8 | Stateless chat architecture | ✅ PASS | No changes to chat state |
| 9 | User isolation in MCP tools | ✅ PASS | All tools filter by user_id |
| 10 | API key in env vars | ✅ PASS | All keys via Dapr secrets |
| 11 | Tool consistency | ✅ PASS | New tools follow existing pattern |
| 12 | History limit 20 messages | ✅ PASS | No changes to history |
| 13 | Async I/O | ✅ PASS | All Kafka ops use aiokafka |
| 14 | Non-root containers | ✅ PASS | All Dockerfiles use non-root |
| 15 | Resource limits | ✅ PASS | All deployments define limits |
| 16 | Health probes | ✅ PASS | All services have /health |
| 17 | Secrets in K8s Secrets | ✅ PASS | Dapr secrets component |
| 18 | Multi-stage builds | ✅ PASS | All Dockerfiles multi-stage |
| 19 | Minimal base images | ✅ PASS | alpine/slim variants |
| 20 | Namespace isolation | ✅ PASS | todo-app namespace |
| 21 | Helm lint passes | ✅ PASS | Validated before deploy |
| 22 | Event idempotency | ✅ PASS | event_id deduplication |
| 23 | Event schema versioning | ✅ PASS | version field in all events |
| 24 | Dead letter queue | ✅ PASS | DLQ topics configured |
| 25 | User isolation in events | ✅ PASS | user_id in all events |
| 26 | Dapr sidecar enabled | ✅ PASS | All services have sidecar |
| 27 | No sensitive event data | ✅ PASS | No passwords/tokens in events |
| 28 | Async Kafka (aiokafka) | ✅ PASS | All producers/consumers async |
| 29 | Service independence | ✅ PASS | Each service deployable alone |
| 30 | Health endpoints | ✅ PASS | /health on all services |
| 31 | CI pipeline required | ✅ PASS | GitHub Actions workflow |
| 32 | Image SHA tagging | ✅ PASS | CI tags with commit SHA |
| 33 | Staging before prod | ✅ PASS | 3-stage deployment |
| 34 | Rollback capability | ✅ PASS | Helm rollback supported |
| 35 | TLS in production | ✅ PASS | cert-manager + Let's Encrypt |

**Gate Status**: ✅ ALL PASSED - Proceed to Phase 0

## Project Structure

### Documentation (Phase V)

```text
specs/phase5/
├── plan.md                    # This file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── quickstart.md              # Phase 1 output
├── contracts/                 # Phase 1 output
│   ├── task-events.json       # Event schema contracts
│   ├── reminder-events.json   # Reminder event contracts
│   └── api-extensions.yaml    # Extended API endpoints
├── 01-advanced-features.md    # Feature spec
├── 02-event-schemas.md        # Event spec
├── 03-kafka-integration.md    # Kafka spec
├── 04-notification-service.md # Notification spec
├── 05-recurring-task-service.md # Recurring spec
├── 06-dapr-components.md      # Dapr spec
├── 07-microservices-architecture.md # Architecture spec
├── 08-cloud-deployment.md     # Cloud spec
├── 09-cicd-pipeline.md        # CI/CD spec
├── 10-local-minikube-deployment.md # Local dev spec
└── checklists/
    └── requirements.md        # Quality checklist
```

### Source Code (repository root)

```text
backend/                       # FastAPI Chat API (enhanced)
├── Dockerfile
├── app/
│   ├── models/
│   │   ├── task.py            # Extended with priority, due_date, recurrence
│   │   ├── reminder.py        # NEW: Reminder model
│   │   ├── tag.py             # NEW: Tag model
│   │   └── task_tag.py        # NEW: TaskTag join table
│   ├── tools/
│   │   ├── add_task.py        # Extended with new fields
│   │   ├── list_tasks.py      # Extended with filters
│   │   ├── set_reminder.py    # NEW: Reminder tool
│   │   └── add_recurring_task.py # NEW: Recurring tool
│   ├── events/                # NEW: Event publishers
│   │   ├── producer.py        # Kafka producer
│   │   └── schemas.py         # Event schemas
│   └── routers/
│       └── chat.py            # Enhanced to publish events

services/                      # NEW: Microservices
├── notification/
│   ├── Dockerfile
│   └── app/
│       ├── main.py            # FastAPI app
│       ├── consumer.py        # Kafka consumer
│       ├── scheduler.py       # APScheduler for cron
│       └── notifier.py        # Email sender
└── recurring/
    ├── Dockerfile
    └── app/
        ├── main.py            # FastAPI app
        ├── consumer.py        # Kafka consumer
        └── calculator.py      # Date calculations

dapr/                          # NEW: Dapr components
├── pubsub-kafka.yaml
├── pubsub-kafka-local.yaml
├── statestore.yaml
├── secrets-local.yaml
├── secrets-k8s.yaml
└── subscriptions/
    ├── task-events.yaml
    └── reminder-events.yaml

helm/                          # Helm charts (extended)
└── todo-chatbot/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-dev.yaml
    ├── values-staging.yaml
    ├── values-prod.yaml
    └── templates/
        ├── notification-deployment.yaml  # NEW
        ├── notification-service.yaml     # NEW
        ├── recurring-deployment.yaml     # NEW
        ├── recurring-service.yaml        # NEW
        └── dapr-components.yaml          # NEW

.github/                       # NEW: CI/CD
└── workflows/
    ├── ci.yml
    ├── build-push.yml
    ├── deploy-staging.yml
    └── deploy-prod.yml

docker-compose.redpanda.yml    # NEW: Local Redpanda
```

**Structure Decision**: Extended web application with microservices pattern. Backend enhanced, two new microservices added, infrastructure directories (dapr/, helm/) extended.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Interface                            │
│                      (Next.js Frontend)                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Chat API                                │
│                        (Port 8000)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Dapr Sidecar │ Pub/Sub, State, Secrets                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  - Extended MCP tools (priority, due_date, tags, reminders)    │
│  - Event publishing on task state changes                       │
└─────────────────────────────────────────────────────────────────┘
        │                                      │
        │ task.completed                       │ reminder.scheduled
        ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redpanda / Kafka                             │
│  Topics: task-events, reminder-events, notification-events      │
│  DLQ: dlq.task-events, dlq.reminder-events                     │
└─────────────────────────────────────────────────────────────────┘
        │                                      │
        ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│ Recurring Task Svc  │              │ Notification Svc    │
│    (Port 8002)      │              │    (Port 8001)      │
│ ┌─────────────────┐ │              │ ┌─────────────────┐ │
│ │  Dapr Sidecar   │ │              │ │  Dapr Sidecar   │ │
│ └─────────────────┘ │              │ └─────────────────┘ │
│ - Consume completed │              │ - Consume reminders │
│ - Calculate next    │              │ - Send emails       │
│ - Create new task   │              │ - APScheduler cron  │
└─────────────────────┘              └─────────────────────┘
        │                                      │
        ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Neon PostgreSQL                             │
│  Extended: tasks (new fields), reminders, tags, task_tags       │
│  Idempotency: processed_events table                            │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Stages

### Stage 1: Advanced Features (Backend Enhancement)

**Goal**: Extend task model and MCP tools with priority, due_date, recurrence, reminders, and tags.

**Tasks**:
1. Add columns to Task model: `due_date`, `priority`, `recurrence_pattern`, `recurrence_end_date`
2. Create Reminder model: `id`, `task_id`, `user_id`, `remind_at`, `sent`, `retry_count`
3. Create Tag model: `id`, `user_id`, `name`, `color`
4. Create TaskTag join table: `id`, `task_id`, `tag_id`
5. Create database migration for new tables/columns
6. Update `add_task` tool to accept priority, due_date, tags
7. Update `list_tasks` tool to support filtering (priority, due_date, tags)
8. Create `set_reminder` tool
9. Create `add_recurring_task` tool
10. Add search endpoint for tasks (title/description text search)

**Validation**:
- [ ] Task created with priority displays correctly
- [ ] Task with due_date shows in filtered list
- [ ] Recurring task created with pattern
- [ ] Reminder saved to database
- [ ] Tags added to task
- [ ] Search returns matching tasks
- [ ] Filter by priority works
- [ ] Sort by due_date works

**Dependencies**: None (builds on existing Phase III)

---

### Stage 2: Event-Driven Architecture (Kafka Integration)

**Goal**: Add event publishing to Chat API and build consuming microservices.

**Tasks**:
1. Create `docker-compose.redpanda.yml` for local Redpanda
2. Create event schema classes (TaskEvent, ReminderEvent)
3. Implement Kafka producer in Chat API using aiokafka
4. Publish events on task create/update/complete/delete
5. Publish events on reminder scheduled
6. Build Notification Service skeleton (FastAPI)
7. Implement Kafka consumer in Notification Service
8. Implement email sender with retry logic
9. Implement APScheduler for reminder checks
10. Build Recurring Task Service skeleton
11. Implement Kafka consumer for task.completed
12. Implement date calculator for next occurrence
13. Implement processed_events table for idempotency
14. Add dead letter queue handling

**Validation**:
- [ ] Redpanda starts via Docker Compose
- [ ] Events published to task-events topic
- [ ] Notification Service consumes reminder events
- [ ] Recurring Task Service consumes task.completed
- [ ] Email sent when reminder triggers
- [ ] Next task auto-created on completion
- [ ] Duplicate events handled (idempotency)
- [ ] Failed events route to DLQ

**Dependencies**: Stage 1 complete (models exist)

---

### Stage 3: Dapr Integration (Local Kubernetes)

**Goal**: Abstract infrastructure with Dapr and deploy to Minikube.

**Tasks**:
1. Install Dapr CLI and init on Minikube
2. Create pubsub-kafka component for Redpanda
3. Create statestore component for PostgreSQL
4. Create secrets-local component for env vars
5. Modify Chat API to use Dapr SDK for publishing
6. Create Dapr subscriptions for each service
7. Modify services to receive events via HTTP callbacks
8. Update Dockerfiles for Dapr compatibility
9. Create Helm templates for microservices
10. Add Dapr annotations to all deployments
11. Deploy to Minikube with sidecars
12. Test end-to-end event flow

**Validation**:
- [ ] Dapr control plane running in Minikube
- [ ] All sidecars healthy (daprd containers)
- [ ] Events flow via Dapr pub/sub
- [ ] State stored via Dapr (optional)
- [ ] Secrets retrieved via Dapr
- [ ] All pods Running in todo-app namespace
- [ ] Frontend accessible via NodePort
- [ ] Chat creates task, event published, recurring created

**Dependencies**: Stage 2 complete (event flow works)

---

### Stage 4: Cloud Deployment & CI/CD

**Goal**: Deploy to cloud Kubernetes with automated CI/CD pipeline.

**Tasks**:
1. Create DigitalOcean Kubernetes cluster (or GKE/AKS)
2. Configure DigitalOcean Container Registry
3. Push images to registry with SHA tags
4. Install Dapr on cloud cluster
5. Configure Redpanda Cloud (or cloud Kafka)
6. Update Dapr components for cloud Kafka
7. Install nginx-ingress controller
8. Install cert-manager for TLS
9. Create ClusterIssuer for Let's Encrypt
10. Create Ingress with TLS
11. Create GitHub Actions CI workflow
12. Create GitHub Actions build-push workflow
13. Create GitHub Actions deploy-staging workflow
14. Create GitHub Actions deploy-prod workflow
15. Configure GitHub Secrets
16. Test full CI/CD pipeline

**Validation**:
- [ ] Cloud cluster created and accessible
- [ ] Images pushed to container registry
- [ ] Dapr running on cloud cluster
- [ ] Kafka/Redpanda Cloud connected
- [ ] All services deployed and healthy
- [ ] TLS certificate issued
- [ ] HTTPS access working
- [ ] CI runs on pull request
- [ ] Staging deploys on merge to main
- [ ] Production deploys on manual trigger
- [ ] Rollback tested successfully

**Dependencies**: Stage 3 complete (local deployment works)

## Decisions Documented

### ADR-001: Cloud Provider Selection

**Decision**: DigitalOcean Kubernetes (DOKS)

**Rationale**:
- Simplest setup for hackathon timeline
- Integrated container registry (DOCR)
- Competitive pricing with $200 free credit
- Excellent documentation

**Alternatives Considered**:
- GKE: More features but more complex
- AKS: Good Azure integration but overkill for this project

---

### ADR-002: Notification Channel

**Decision**: Email only (SMTP/SendGrid)

**Rationale**:
- Simplest to implement for hackathon
- Universal - all users have email
- No additional SDKs required

**Alternatives Considered**:
- Push notifications: Requires mobile app or service worker
- SMS: Cost per message, requires Twilio

---

### ADR-003: Database Strategy

**Decision**: Shared Neon PostgreSQL

**Rationale**:
- Existing database, no additional cost
- Simpler queries (joins possible)
- Consistent data model
- Appropriate for hackathon scale

**Alternatives Considered**:
- Separate databases per service: More isolation but unnecessary complexity

---

### ADR-004: Event Processing

**Decision**: Asynchronous via Kafka (Redpanda)

**Rationale**:
- Decouples services
- Enables horizontal scaling
- Provides durability and replay
- Industry standard pattern

**Alternatives Considered**:
- Synchronous HTTP: Would create tight coupling
- In-memory queue: No durability, single point of failure

---

### ADR-005: Dapr State Store

**Decision**: PostgreSQL (reuse Neon)

**Rationale**:
- Already available and configured
- Sufficient performance for state operations
- One less system to manage

**Alternatives Considered**:
- Redis: Faster but adds another component
- In-memory: No persistence across restarts

---

### ADR-006: Container Registry

**Decision**: DigitalOcean Container Registry (DOCR)

**Rationale**:
- Integrated with DOKS (no registry secrets needed)
- 500MB free tier sufficient
- Same region as cluster (low latency)

**Alternatives Considered**:
- Docker Hub: Rate limits on free tier
- GitHub Container Registry: Extra configuration needed

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Kafka complexity | Start with Redpanda Docker, use Dapr abstraction |
| Dapr learning curve | Follow official tutorials, test incrementally |
| Cloud costs | Monitor credit usage, delete resources when done |
| Event duplication | Implement idempotency from day 1 |
| Time constraints | Focus on core flow, skip audit service |
| TLS issues | Use staging Let's Encrypt first, switch to prod |

## Critical Path

```
Stage 1 (Features)     ████████████ 8 hours
                              ↓
Stage 2 (Kafka)        ████████████████ 12 hours
                              ↓
Stage 3 (Dapr/Local)   ████████████ 8 hours
                              ↓
Stage 4 (Cloud/CI)     ████████████████ 12 hours
                              ↓
                       Total: ~40 hours
```

**Parallel Opportunities**:
- Notification + Recurring services can be built in parallel (Stage 2)
- CI workflows can be developed while deploying manually (Stage 4)

**MVP Checkpoint**: After Stage 2, system is functional locally with events flowing.

## Success Criteria

| Criteria | Stage | Validation Method |
|----------|-------|-------------------|
| Recurring task auto-creates next | 2 | Complete task, verify new task exists |
| Reminder sent on time | 2 | Set reminder, check email |
| Events flow through Kafka | 2 | Check Redpanda console |
| Dapr sidecars running | 3 | `kubectl get pods` shows 2/2 Ready |
| Cloud deployment working | 4 | Access HTTPS URL |
| CI/CD deploys automatically | 4 | Push to main, verify new version |
| System handles 100+ events/sec | 4 | Load test with k6 or locust |

## Complexity Tracking

> No constitution violations requiring justification.

| Decision | Rationale | Simpler Alternative |
|----------|-----------|---------------------|
| 3 microservices | Event-driven architecture requires separation | Monolith would not demonstrate Phase V goals |
| Dapr sidecars | Required by constitution for service communication | Direct Kafka would bypass Dapr requirement |
| 4-stage sequential | Dependencies require completion before next | Parallel stages would create integration issues |

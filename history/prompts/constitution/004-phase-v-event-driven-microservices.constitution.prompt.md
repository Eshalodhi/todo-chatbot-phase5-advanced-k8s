---
id: 004
title: Phase V Event-Driven Microservices Constitution Update
stage: constitution
date: 2026-01-28
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: main
user: system
command: /sp.constitution
labels: ["constitution", "phase-v", "event-driven", "microservices", "dapr", "kafka", "kubernetes", "cicd"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - N/A (documentation update)
---

## Prompt

/sp.constitution

**Project context:**
A working Todo Chatbot with:
- Next.js 14+ frontend with App Router
- FastAPI backend with SQLModel ORM
- Neon PostgreSQL (serverless) database
- Better Auth for authentication
- JWT-based API protection

**Objectives:**
1. Advanced Features: Extend task model with recurring tasks, due dates, reminders, priorities, and tags
2. Event-Driven Architecture: Implement Kafka/Redpanda for microservices communication
3. Dapr Integration: Use Dapr for pub/sub, state management, and secrets
4. Cloud Kubernetes: Deploy to DigitalOcean, GKE, or AKS
5. CI/CD Pipeline: Automate with GitHub Actions

**Technology Stack:**
- Message Broker: Redpanda (Kafka-compatible)
- Async Client: aiokafka
- Distributed Runtime: Dapr
- Scheduler: APScheduler
- Cloud Providers: DOKS, GKE, AKS
- CI/CD: GitHub Actions

**Architecture:**
- Microservices: Chat API, Notification Service, Recurring Task Service
- Kafka Topics: task-events, reminder-events, recurring-task-events, notification-events
- Dapr Components: pubsub-kafka, statestore-postgres, secrets
- Deployment: 3 stages (Local → Staging → Production)

**Advanced Features:**
- Recurring Tasks: daily, weekly, monthly patterns
- Due Dates: ISO format, timezone-aware
- Reminders: APScheduler-based, multi-channel
- Priorities: low, medium, high
- Tags: many-to-many with filtering

**Event Schemas:**
- Standard format with event_id, event_type, timestamp, version, user_id, payload
- Idempotency via event_id deduplication
- Dead letter queues for failed messages

**Database Extensions:**
- New tables: reminders, tags, task_tags, processed_events
- Extended tasks: due_date, priority, recurrence_pattern, recurrence_end_date

**CI/CD Pipeline:**
- Workflows: ci.yml, build-push.yml, deploy-staging.yml, deploy-prod.yml
- Docker builds with SHA tagging
- Helm deployments with environment-specific values

## Response snapshot

Updated constitution from version 3.0.0 to 4.0.0 (MAJOR version bump) adding Phase V: Event-Driven Microservices with Cloud Kubernetes.

**New Sections Added:**
- XV. Event-Driven Architecture
- XVI. Kafka/Redpanda Integration
- XVII. Dapr Integration
- XVIII. Microservices Architecture
- XIX. Cloud Kubernetes Deployment
- XX. CI/CD Pipeline
- XXI. Advanced Task Features

**New Non-Negotiables (Rules 22-35):**
- Event idempotency, schema versioning, DLQ
- User isolation in events, Dapr sidecar requirement
- Async Kafka, service independence, health endpoints
- CI pipeline, image tagging, staging-first, rollback capability
- TLS requirement for production

**Data Model Extensions:**
- tasks: due_date, priority, recurrence_pattern, recurrence_end_date
- reminders: task reminders with retry logic
- tags: user-scoped task categorization
- task_tags: many-to-many join table
- processed_events: idempotency tracking

**Technology Stack Additions:**
- Redpanda/Kafka, aiokafka, Dapr, APScheduler
- DOKS/GKE/AKS, nginx-ingress, cert-manager
- GitHub Actions workflows

## Outcome

- ✅ Impact: Major constitution update enabling event-driven microservices architecture
- 🧪 Tests: N/A (documentation)
- 📁 Files: .specify/memory/constitution.md
- 🔁 Next prompts: /sp.specify for individual features, /sp.plan for implementation planning
- 🧠 Reflection: Successfully extended constitution while preserving all Phase II-IV content

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A

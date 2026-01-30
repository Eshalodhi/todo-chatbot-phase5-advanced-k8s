<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: 3.0.0 → 4.0.0 (MAJOR - Phase V Event-Driven Microservices with Cloud Kubernetes)

  Modified Principles:
  - Technology Standards: Added Kafka/Redpanda, Dapr, aiokafka, APScheduler, cloud providers
  - Project Structure: Added services/, events/, dapr/ directories for microservices

  Added Sections:
  - XV. Event-Driven Architecture (NEW)
  - XVI. Kafka/Redpanda Integration (NEW)
  - XVII. Dapr Integration (NEW)
  - XVIII. Microservices Architecture (NEW)
  - XIX. Cloud Kubernetes Deployment (NEW)
  - XX. CI/CD Pipeline (NEW)
  - XXI. Advanced Task Features (NEW)
  - Phase V Success Criteria
  - Phase V Non-Negotiables (rules 22-35)
  - Event Schemas section
  - Kafka Topics section
  - Dapr Components section
  - Cloud Deployment Stages section

  Removed Sections: None (Phase II, III, IV fully preserved)

  Templates Status:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md: ✅ Compatible (user stories, requirements aligned)
  - .specify/templates/tasks-template.md: ✅ Compatible (microservices tasks can follow same pattern)

  Follow-up TODOs: None
-->

# Phase V Full-Stack Web Application Constitution

Panaversity Hackathon II - AI-Powered Task Management System with Event-Driven Microservices and Cloud Kubernetes

## Core Principles

### I. Spec-Driven Development

All specifications MUST be written before code implementation begins.

- Feature specifications document user stories, acceptance criteria, and edge cases
- Implementation plans define technical approach and architecture decisions
- Task lists break work into trackable, parallelizable units
- Changes to requirements MUST update specs first, then code
- Spec-Kit Plus methodology governs all documentation in `specs/` directory
- Infrastructure specifications document deployment architecture and configurations
- Event schemas document message contracts between microservices

**Rationale**: Specifications prevent scope creep, ensure alignment, and create traceable decisions.

### II. Security First (NON-NEGOTIABLE)

Security is not optional. Every feature MUST implement these controls:

- **User Isolation**: ALL database queries MUST filter by authenticated `user_id`
- **JWT Verification**: ALL protected routes MUST verify JWT token signature
- **User ID Validation**: Token `user_id` MUST match URL `{user_id}` parameter
- **Password Security**: Passwords MUST be hashed with bcrypt (NEVER plain text)
- **Token Handling**: JWTs transmitted via `Authorization: Bearer <token>` header only
- **API Key Protection**: All API keys MUST be in environment variables or Dapr secrets, NEVER in code
- **Container Security**: Non-root users, minimal base images, no hardcoded secrets
- **Event Security**: Event payloads MUST NOT contain sensitive data (passwords, tokens)

**Violations are blocking**: Code that bypasses security controls MUST NOT be merged.

### III. Code Quality

Type safety and validation are mandatory across the entire stack:

- **Frontend (TypeScript)**:
  - Strict mode enabled (`"strict": true` in tsconfig.json)
  - All props, state, and API responses fully typed
  - No `any` types without explicit justification
  - Server Components by default; `'use client'` only when interactivity required

- **Backend (Python)**:
  - Type hints on all function signatures and return values
  - Pydantic/SQLModel validation for all request/response schemas
  - Async route handlers (`async def`) for all endpoints
  - Async/await for ALL I/O operations (database, AI API, Kafka)

- **Infrastructure (Kubernetes/Helm)**:
  - All manifests MUST pass `kubectl apply --dry-run=client`
  - Helm charts MUST pass `helm lint`
  - Resource limits MUST be defined for all containers
  - Dapr components MUST be validated before deployment

- **Events (Kafka/Dapr)**:
  - All event schemas MUST be versioned
  - Event handlers MUST be idempotent
  - Dead letter queues MUST be configured for failed messages

**Rationale**: Type safety catches errors at compile time, reducing runtime bugs.

### IV. User Experience

The application MUST provide responsive, feedback-rich interactions:

- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints (sm/md/lg/xl)
- **Loading States**: Visual feedback during async operations (typing indicator for chat)
- **Error Handling**: User-friendly error messages (not raw exceptions)
- **Confirmation**: Destructive actions (delete) MUST require user confirmation
- **Chat UX**: Auto-scroll to new messages, Enter to send, Shift+Enter for newline
- **Notification UX**: Timely reminders with user-configurable preferences

**Rationale**: Poor UX leads to user abandonment regardless of technical correctness.

### V. Data Integrity

Persistent storage with enforced relationships and optimized queries:

- **Neon PostgreSQL**: All data stored in serverless PostgreSQL (cloud-hosted)
- **Foreign Keys**:
  - `tasks.user_id` references `users.id` with ON DELETE CASCADE
  - `conversations.user_id` references `users.id` with ON DELETE CASCADE
  - `messages.conversation_id` references `conversations.id` with ON DELETE CASCADE
  - `reminders.task_id` references `tasks.id` with ON DELETE CASCADE
  - `task_tags.task_id` references `tasks.id` with ON DELETE CASCADE
  - `task_tags.tag_id` references `tags.id` with ON DELETE CASCADE
- **Indexes** (CRITICAL for performance):
  - `tasks.user_id` - filtered on EVERY query
  - `tasks.completed` - filtered for active/done views
  - `tasks.due_date` - filtered for due date queries
  - `tasks.priority` - filtered for priority sorting
  - `users.email` - used in authentication queries
  - `conversations.user_id` - filtered on EVERY chat query
  - `messages.conversation_id` - fetch history
  - `messages.user_id` - security isolation
  - `reminders.remind_at` - scheduled notification queries
  - `reminders.sent` - filter pending reminders
- **Timestamps**: `created_at` and `updated_at` on all mutable entities

**Rationale**: Proper indexing prevents O(n) table scans at scale.

### VI. Stateless Architecture (Phase III)

The chat system MUST operate without server-side session storage:

- **No Server State**: Server holds NOTHING between requests
- **Database Persistence**: ALL conversation state stored in database
- **Request Independence**: Each request is self-contained and complete
- **History Reconstruction**: Conversation history loaded from database each request
- **Restart Resilience**: Conversations resume correctly after server restart
- **Horizontal Scaling**: Any server instance can handle any request

**Stateless Chat Flow (9 Steps)**:
1. Receive user message from frontend
2. Verify JWT token (authenticate user)
3. Fetch conversation history from database
4. Build chat_history array (previous messages + new message)
5. Store new user message to database
6. Call AI API with chat_history and tools
7. If AI returns tool_calls: Execute MCP tool handlers
8. Store assistant response to database
9. Return response to frontend

**Rationale**: Stateless design enables horizontal scaling and survives restarts.

### VII. AI Integration (Phase III)

AI API integration MUST follow these patterns:

- **API Provider**: OpenAI (with function calling/tools)
- **Model**: Configurable (gpt-4, gpt-3.5-turbo)
- **Tool Execution**: MCP tools executed when AI requests via `tool_calls`
- **History Limit**: Last 20 messages loaded for API calls (token management)
- **Error Handling**: Retry with exponential backoff on rate limits
- **Logging**: Log all AI API requests/responses for debugging

**Agent Instructions (System Prompt)**:
```
You are a helpful task management assistant that helps users manage their
todo tasks through natural language conversation.

When users want to:
- Add, create, or remember something → use add_task tool
- Show, list, or see their tasks → use list_tasks tool
- Mark something as done or complete → use complete_task tool
- Delete, remove, or cancel a task → use delete_task tool
- Change, update, or modify a task → use update_task tool
- Set a reminder → use set_reminder tool
- Create a recurring task → use add_recurring_task tool

Always:
- Confirm actions with friendly messages
- Be concise but helpful
- Use emojis sparingly for positive feedback (✅, 🎉, 📝)
- Handle errors gracefully with helpful explanations
- Remember conversation context from history
```

**Rationale**: Consistent AI behavior requires explicit, documented instructions.

### VIII. MCP Tools Specification (Phase III + V Extensions)

Core MCP tools MUST be implemented with these exact specifications:

**Tool 1: add_task**
- Purpose: Create new task for user
- Parameters: `user_id` (string, required), `title` (string, required, 1-200 chars), `description` (string, optional, max 1000 chars), `due_date` (string, optional, ISO format), `priority` (string, optional, enum: "low"/"medium"/"high"), `tags` (array, optional)
- Returns: `task_id`, `status: "created"`, `title`

**Tool 2: list_tasks**
- Purpose: Retrieve user's tasks with optional filtering
- Parameters: `user_id` (string, required), `status` (string, optional, enum: "all"/"pending"/"completed", default: "all"), `priority` (string, optional), `due_before` (string, optional), `tags` (array, optional)
- Returns: `tasks` (array), `count` (integer)

**Tool 3: complete_task**
- Purpose: Mark task as complete
- Parameters: `user_id` (string, required), `task_id` (integer, required)
- Returns: `task_id`, `status: "completed"`, `title`
- Side Effect: Publishes `task.completed` event to Kafka

**Tool 4: delete_task**
- Purpose: Permanently remove task
- Parameters: `user_id` (string, required), `task_id` (integer, required)
- Returns: `task_id`, `status: "deleted"`, `title`

**Tool 5: update_task**
- Purpose: Modify task title, description, due_date, or priority
- Parameters: `user_id` (string, required), `task_id` (integer, required), `title` (string, optional), `description` (string, optional), `due_date` (string, optional), `priority` (string, optional), `tags` (array, optional)
- Returns: `task_id`, `status: "updated"`, `title`

**Tool 6: set_reminder** (Phase V)
- Purpose: Set a reminder for a task
- Parameters: `user_id` (string, required), `task_id` (integer, required), `remind_at` (string, required, ISO format)
- Returns: `reminder_id`, `status: "scheduled"`, `remind_at`
- Side Effect: Publishes `reminder.scheduled` event to Kafka

**Tool 7: add_recurring_task** (Phase V)
- Purpose: Create a recurring task
- Parameters: `user_id` (string, required), `title` (string, required), `recurrence_pattern` (string, required, enum: "daily"/"weekly"/"monthly"), `start_date` (string, optional)
- Returns: `task_id`, `status: "created"`, `recurrence_pattern`

**Tool Requirements**:
- All tools MUST filter database queries by `user_id`
- Return consistent structured format
- Handle errors gracefully (task not found, validation errors)
- Never expose database errors to AI agent
- Validate all parameters before execution
- Publish events for state changes (Phase V)

**Rationale**: Consistent tool interfaces enable reliable AI interactions.

### IX. Chat UI Requirements (Phase III)

The chat interface MUST implement these features:

- **Message Display**: User messages right-aligned, assistant messages left-aligned
- **Scrolling**: Auto-scroll to latest message on new messages
- **Input**: Textarea with send button, Enter to send, Shift+Enter for newline
- **Loading**: Typing indicator while waiting for AI response
- **Error Display**: User-friendly error messages for failed requests
- **Navigation**: "Chat" link in main navigation menu
- **Protection**: Route requires authentication (JWT)
- **Conversation Management**: Create new conversation, continue existing
- **Accessibility**: ARIA labels, keyboard navigation

**Rationale**: Chat UX patterns are established and users expect them.

### X. Containerization Standards (Phase IV)

All applications MUST be containerized following these standards:

**Frontend (Next.js) Dockerfile**:
- Base image: `node:20-alpine`
- Multi-stage build (builder → runner)
- Standalone output enabled
- Port: 3000
- Health check on `/`
- Non-root user (nextjs:nodejs)

**Backend (FastAPI) Dockerfile**:
- Base image: `python:3.11-slim`
- Multi-stage build (builder → runner)
- Port: 8000
- Health check on `/health`
- Non-root user

**Microservices (Phase V) Dockerfile**:
- Base image: `python:3.11-slim`
- Multi-stage build (builder → runner)
- Dapr sidecar compatible
- Health check endpoint required
- Non-root user

**Container Security Requirements**:
- Non-root users in ALL containers
- Minimal base images (alpine, slim variants)
- No hardcoded secrets in Dockerfiles
- Read-only root filesystem where possible
- Drop all capabilities, add only required ones
- Multi-stage builds to minimize attack surface

**Rationale**: Containerization ensures consistent deployment across environments.

### XI. Kubernetes Deployment (Phase IV - Local)

Local Kubernetes deployment MUST follow these specifications:

**Minikube Setup**:
- Install: `choco install minikube` (Windows) or equivalent
- Start: `minikube start`
- Enable addons: `minikube addons enable metrics-server`

**Required Components**:

| Component | Type | Replicas | Port |
|-----------|------|----------|------|
| Frontend | Deployment | 2 | 3000 |
| Backend | Deployment | 2 | 8000 |
| Frontend Service | NodePort | - | 30080 |
| Backend Service | ClusterIP | - | 8000 |
| Config | ConfigMap | - | - |
| Secrets | Secret | - | - |

**Namespace**: `todo-app`

**Rationale**: Kubernetes provides declarative, scalable deployment management.

### XII. Helm Chart Management (Phase IV)

Helm charts MUST be structured as follows:

**Chart Structure**:
```
todo-chatbot/
├── Chart.yaml           # Chart metadata
├── values.yaml          # Default configuration
├── values-dev.yaml      # Development overrides
├── values-staging.yaml  # Staging overrides (Phase V)
├── values-prod.yaml     # Production overrides (Phase V)
├── templates/
│   ├── _helpers.tpl     # Template helpers
│   ├── namespace.yaml   # Namespace definition
│   ├── configmap.yaml   # ConfigMap template
│   ├── secret.yaml      # Secret template
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── dapr-components.yaml  # Phase V
│   └── NOTES.txt        # Post-install notes
└── .helmignore
```

**Rationale**: Helm enables versioned, reusable Kubernetes deployments.

### XIII. AI DevOps Tools (Phase IV)

AI-assisted DevOps tools enhance Kubernetes operations:

**Gordon (Docker AI)**:
- Purpose: AI-assisted Dockerfile creation and optimization
- Enable: Docker Desktop → Settings → Beta features
- Fallback: Standard Docker CLI commands

**kubectl-ai**:
- Purpose: Natural language Kubernetes commands
- Install: `kubectl krew install ai`
- Requires: `OPENAI_API_KEY` environment variable

**Kagent**:
- Purpose: Cluster health analysis and optimization
- Install: Download from GitHub releases

**Fallback Strategy**:
- If AI tools unavailable, use standard CLI equivalents
- Document manual commands in deployment guides
- Never block deployment due to AI tool availability

**Rationale**: AI tools accelerate DevOps tasks while maintaining manual fallbacks.

### XIV. Resource Management (Phase IV)

All containers MUST define resource limits:

**Frontend Resources**:
```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**Backend Resources**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

**Microservice Resources** (Phase V):
```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**Rationale**: Resource limits prevent runaway containers and enable fair scheduling.

### XV. Event-Driven Architecture (NEW - Phase V)

The system MUST implement event-driven patterns for microservices communication:

**Event Categories**:
- **Task Events**: `task.created`, `task.updated`, `task.completed`, `task.deleted`
- **Reminder Events**: `reminder.scheduled`, `reminder.triggered`, `reminder.sent`
- **Recurring Events**: `recurring.task.created`, `recurring.task.triggered`

**Event Schema Standard**:
```json
{
  "event_id": "uuid",
  "event_type": "task.completed",
  "timestamp": "ISO-8601",
  "version": "1.0",
  "source": "chat-api",
  "user_id": "string",
  "payload": {
    "task_id": "integer",
    "title": "string"
  }
}
```

**Event Requirements**:
- All events MUST include `event_id`, `event_type`, `timestamp`, `version`
- All events MUST include `user_id` for isolation
- Payload MUST NOT contain sensitive data
- Events MUST be serialized as JSON
- Schema version MUST follow semantic versioning

**Idempotency**:
- All event handlers MUST be idempotent
- Use `event_id` for deduplication
- Store processed event IDs in database

**Rationale**: Event-driven architecture enables loose coupling and horizontal scaling.

### XVI. Kafka/Redpanda Integration (NEW - Phase V)

Message streaming MUST use Kafka-compatible infrastructure:

**Infrastructure Choice**:
- **Local Development**: Redpanda (Docker) - Kafka-compatible, lightweight
- **Cloud Production**: Redpanda Cloud or managed Kafka service

**Kafka Topics**:

| Topic | Purpose | Partitions | Retention |
|-------|---------|------------|-----------|
| `task-events` | Task lifecycle events | 3 | 7 days |
| `reminder-events` | Reminder scheduling/triggering | 3 | 7 days |
| `recurring-task-events` | Recurring task triggers | 3 | 7 days |
| `notification-events` | Notification delivery | 3 | 7 days |
| `dlq.task-events` | Dead letter queue | 1 | 30 days |

**Producer Requirements**:
- Use `aiokafka` for async Python producers
- Enable idempotent producer (`enable_idempotence=True`)
- Implement retry with exponential backoff
- Log all published events

**Consumer Requirements**:
- Use `aiokafka` for async Python consumers
- Implement manual offset commits after processing
- Handle deserialization errors gracefully
- Implement dead letter queue for failed messages
- Consumer group per service

**Redpanda Docker Setup**:
```yaml
services:
  redpanda:
    image: redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 1G
      - --overprovisioned
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
    ports:
      - "9092:9092"
      - "8081:8081"
```

**Rationale**: Kafka provides durable, scalable message streaming for microservices.

### XVII. Dapr Integration (NEW - Phase V)

Dapr MUST be used as the distributed application runtime:

**Dapr Components**:

| Component | Type | Purpose |
|-----------|------|---------|
| `pubsub-kafka` | pubsub.kafka | Event publishing/subscription |
| `statestore-postgres` | state.postgresql | State management |
| `secrets-env` | secretstores.local.env | Local secret storage |
| `secrets-k8s` | secretstores.kubernetes | K8s secret storage |
| `binding-cron` | bindings.cron | Scheduled tasks |

**Pub/Sub Configuration**:
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-kafka
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "redpanda:9092"
    - name: consumerGroup
      value: "todo-app"
    - name: authType
      value: "none"
```

**State Store Configuration**:
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: db-secrets
        key: DATABASE_URL
```

**Sidecar Requirements**:
- All microservices MUST run with Dapr sidecar
- Sidecar annotation: `dapr.io/enabled: "true"`
- App port annotation required
- Health probes MUST account for sidecar startup

**Dapr SDK Usage**:
```python
from dapr.clients import DaprClient

async def publish_event(topic: str, data: dict):
    async with DaprClient() as client:
        await client.publish_event(
            pubsub_name="pubsub-kafka",
            topic_name=topic,
            data=json.dumps(data)
        )
```

**Rationale**: Dapr abstracts infrastructure complexity and provides portable microservices patterns.

### XVIII. Microservices Architecture (NEW - Phase V)

The system MUST be decomposed into the following microservices:

**Service 1: Chat API (Enhanced)**
- **Purpose**: Handle chat requests, AI integration, MCP tool execution
- **Port**: 8000
- **Publishes**: `task.created`, `task.completed`, `task.updated`, `task.deleted`, `reminder.scheduled`
- **Dependencies**: Neon PostgreSQL, OpenAI API, Dapr

**Service 2: Notification Service**
- **Purpose**: Process reminders and send notifications
- **Port**: 8001
- **Subscribes**: `reminder-events`, `notification-events`
- **Publishes**: `reminder.sent`
- **Features**: APScheduler for scheduled checks, multi-channel delivery (email/push/SMS)
- **Dependencies**: Dapr, SMTP/Push provider

**Service 3: Recurring Task Service**
- **Purpose**: Handle recurring task creation on completion
- **Port**: 8002
- **Subscribes**: `task.completed`
- **Publishes**: `task.created` (for next occurrence)
- **Features**: Recurrence pattern calculation, date handling
- **Dependencies**: Dapr, Neon PostgreSQL

**Service Communication**:
- All inter-service communication via Dapr pub/sub
- No direct HTTP calls between services
- Shared database with service-specific tables where needed

**Service Independence**:
- Each service MUST be independently deployable
- Each service MUST have its own health endpoint
- Each service MUST handle failures gracefully

**Rationale**: Microservices enable independent scaling, deployment, and team ownership.

### XIX. Cloud Kubernetes Deployment (NEW - Phase V)

Cloud deployment MUST follow these specifications:

**Supported Providers**:
- DigitalOcean Kubernetes (DOKS) - Primary
- Google Kubernetes Engine (GKE) - Alternative
- Azure Kubernetes Service (AKS) - Alternative

**Deployment Stages**:

| Stage | Environment | Purpose |
|-------|-------------|---------|
| 1 | Local (Minikube) | Development and testing |
| 2 | Staging (Cloud) | Integration testing |
| 3 | Production (Cloud) | Live users |

**Cloud Requirements**:
- Container registry (DOCR, GCR, or ACR)
- Managed Kubernetes cluster (1.28+)
- Ingress controller (nginx-ingress)
- TLS certificates (cert-manager + Let's Encrypt)
- External secrets management

**DigitalOcean Setup**:
```bash
# Create cluster
doctl kubernetes cluster create todo-cluster \
  --region nyc1 \
  --node-pool "name=default;size=s-2vcpu-4gb;count=3"

# Install Dapr
dapr init -k

# Install ingress
helm install nginx-ingress ingress-nginx/ingress-nginx
```

**Ingress Configuration**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - todo.example.com
      secretName: todo-tls
  rules:
    - host: todo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
```

**Rationale**: Cloud Kubernetes provides production-grade reliability and scalability.

### XX. CI/CD Pipeline (NEW - Phase V)

Continuous Integration and Deployment MUST be automated:

**GitHub Actions Workflows**:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Lint, test, build |
| `build-push.yml` | Push to main | Build and push Docker images |
| `deploy-staging.yml` | Push to main | Deploy to staging |
| `deploy-prod.yml` | Manual/Tag | Deploy to production |

**CI Pipeline** (`ci.yml`):
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest
      - name: Run frontend tests
        run: |
          cd frontend
          npm ci
          npm test
      - name: Lint
        run: |
          cd backend && ruff check .
          cd ../frontend && npm run lint
```

**Build and Push** (`build-push.yml`):
```yaml
name: Build and Push
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - name: Build and push
        run: |
          docker build -t $REGISTRY/frontend:$SHA ./frontend
          docker build -t $REGISTRY/backend:$SHA ./backend
          docker push $REGISTRY/frontend:$SHA
          docker push $REGISTRY/backend:$SHA
```

**Deployment** (`deploy-staging.yml`):
```yaml
name: Deploy Staging
on:
  workflow_run:
    workflows: ["Build and Push"]
    types: [completed]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          helm upgrade --install todo-release ./helm/todo-chatbot \
            -n staging \
            -f ./helm/todo-chatbot/values-staging.yaml \
            --set image.tag=$SHA
```

**Secrets Management**:
- `REGISTRY_URL`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`
- `KUBE_CONFIG` - Base64 encoded kubeconfig
- `OPENAI_API_KEY` - AI API key
- `DATABASE_URL` - Neon connection string
- `BETTER_AUTH_SECRET` - JWT signing secret

**Rationale**: CI/CD automation ensures consistent, reliable deployments.

### XXI. Advanced Task Features (NEW - Phase V)

Advanced task management features MUST be implemented:

**Recurring Tasks**:
- **Patterns**: daily, weekly, monthly, custom (cron)
- **Trigger**: On task completion, calculate next occurrence
- **Edge Cases**: Month-end handling, timezone awareness
- **Database**: `recurrence_pattern`, `recurrence_end_date` columns

**Due Dates**:
- **Format**: ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)
- **Timezone**: Store in UTC, display in user timezone
- **Filtering**: Query tasks due before/after dates
- **Sorting**: Order by due_date ascending

**Reminders**:
- **Model**: Separate `reminders` table linked to tasks
- **Scheduling**: APScheduler checks every minute
- **Channels**: Email (primary), push notifications (optional)
- **Retry**: 3 attempts with exponential backoff

**Priorities**:
- **Levels**: low, medium, high (default: medium)
- **Display**: Visual indicators (color coding)
- **Filtering**: Query by priority level
- **Sorting**: Order by priority (high → low)

**Tags**:
- **Model**: Many-to-many via `task_tags` join table
- **Operations**: Add, remove, list tags per task
- **Filtering**: Query tasks by tag(s)
- **Autocomplete**: Suggest existing tags

**Rationale**: Advanced features enable comprehensive task management workflows.

## Technology Standards

The following technology stack is MANDATORY:

### Application Stack (Phase II-III)

| Layer | Technology | Version/Notes |
|-------|------------|---------------|
| Frontend Framework | Next.js | 16+ with App Router |
| Frontend Language | TypeScript | Strict mode |
| Frontend Styling | Tailwind CSS | Utility-first |
| Frontend Auth | Better Auth | Session + JWT issuance |
| Backend Framework | FastAPI | Async Python |
| Backend ORM | SQLModel | SQLAlchemy + Pydantic |
| Database | Neon PostgreSQL | Serverless (cloud-hosted) |
| JWT Library | python-jose | HS256 algorithm |
| AI Provider | OpenAI API | GPT-4/GPT-3.5-turbo |
| AI SDK | openai | Python SDK |

### Infrastructure Stack (Phase IV)

| Layer | Technology | Version/Notes |
|-------|------------|---------------|
| Containerization | Docker Desktop | 4.53+ with Gordon AI |
| Container Runtime | Docker | Multi-stage builds |
| Orchestration | Kubernetes | Via Minikube (local) |
| Local Cluster | Minikube | Latest version |
| Package Manager | Helm | v3+ |
| AI DevOps | Gordon, kubectl-ai, Kagent | Optional |

### Event-Driven Stack (Phase V)

| Layer | Technology | Version/Notes |
|-------|------------|---------------|
| Message Broker | Redpanda/Kafka | Kafka-compatible |
| Async Kafka | aiokafka | Python async client |
| Distributed Runtime | Dapr | 1.12+ |
| Dapr SDK | dapr-client | Python SDK |
| Scheduler | APScheduler | Async scheduler |
| Cloud Kubernetes | DOKS/GKE/AKS | Managed K8s |
| Ingress | nginx-ingress | Load balancing |
| TLS | cert-manager | Let's Encrypt |
| CI/CD | GitHub Actions | Workflows |

**Project Structure**:
```
project-root/
├── frontend/              # Next.js application
│   ├── Dockerfile
│   └── components/
│       └── chat/          # Chat UI components
├── backend/               # FastAPI Chat API (enhanced)
│   ├── Dockerfile
│   └── app/
│       ├── tools/         # MCP tool handlers
│       ├── events/        # Event publishers (NEW)
│       └── routers/
│           └── chat.py    # Chat endpoint
├── services/              # Microservices (NEW)
│   ├── notification/      # Notification service
│   │   ├── Dockerfile
│   │   └── app/
│   └── recurring/         # Recurring task service
│       ├── Dockerfile
│       └── app/
├── kubernetes/            # Raw manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── ...
├── helm/                  # Helm charts
│   └── todo-chatbot/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-staging.yaml
│       ├── values-prod.yaml
│       └── templates/
├── dapr/                  # Dapr components (NEW)
│   ├── pubsub-kafka.yaml
│   ├── statestore.yaml
│   └── secrets.yaml
├── .github/               # CI/CD workflows (NEW)
│   └── workflows/
│       ├── ci.yml
│       ├── build-push.yml
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
├── specs/                 # Spec-Kit Plus specifications
└── .specify/              # Templates and scripts
```

## API Contract

### Existing Endpoints (Phase II - Unchanged)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/{user_id}/tasks` | List all tasks for user |
| POST | `/api/{user_id}/tasks` | Create new task |
| GET | `/api/{user_id}/tasks/{id}` | Get single task |
| PUT | `/api/{user_id}/tasks/{id}` | Full update of task |
| DELETE | `/api/{user_id}/tasks/{id}` | Delete task |
| PATCH | `/api/{user_id}/tasks/{id}/complete` | Toggle completion |

### Chat Endpoint (Phase III)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/{user_id}/chat` | Process chat message with AI |

### Extended Endpoints (Phase V)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/{user_id}/tasks?priority=high` | Filter by priority |
| GET | `/api/{user_id}/tasks?due_before=DATE` | Filter by due date |
| GET | `/api/{user_id}/tasks?tags=tag1,tag2` | Filter by tags |
| POST | `/api/{user_id}/reminders` | Create reminder |
| GET | `/api/{user_id}/reminders` | List reminders |
| DELETE | `/api/{user_id}/reminders/{id}` | Delete reminder |
| GET | `/api/{user_id}/tags` | List user's tags |

### Health Endpoints (Phase IV-V)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Backend liveness/readiness check |
| GET | `/` | Frontend health check |
| GET | `/health` | Notification service health |
| GET | `/health` | Recurring task service health |

## Data Model

### Existing Tables (Phase II-III - Unchanged)

```
users
├── id: str (PK, UUID from Better Auth)
├── email: str (UNIQUE, INDEXED)
├── name: str
├── password_hash: str (bcrypt)
└── created_at: datetime

tasks
├── id: int (PK, auto-increment)
├── user_id: str (FK → users.id, INDEXED)
├── title: str (1-200 chars, required)
├── description: str (max 1000 chars, optional)
├── completed: bool (default: false, INDEXED)
├── due_date: datetime (optional, INDEXED) -- Phase V
├── priority: str (enum: low/medium/high, INDEXED) -- Phase V
├── recurrence_pattern: str (optional) -- Phase V
├── recurrence_end_date: datetime (optional) -- Phase V
├── created_at: datetime
└── updated_at: datetime

conversations
├── id: int (PK, auto-increment)
├── user_id: str (FK → users.id, INDEXED)
├── created_at: datetime
└── updated_at: datetime

messages
├── id: int (PK, auto-increment)
├── conversation_id: int (FK → conversations.id, INDEXED)
├── user_id: str (INDEXED - for user isolation)
├── role: str (enum: "user", "assistant", "tool")
├── content: text (message content or tool results)
├── tool_calls: json (nullable, AI tool_calls data)
└── created_at: datetime
```

### New Tables (Phase V)

```
reminders
├── id: int (PK, auto-increment)
├── task_id: int (FK → tasks.id, INDEXED)
├── user_id: str (FK → users.id, INDEXED)
├── remind_at: datetime (INDEXED)
├── sent: bool (default: false, INDEXED)
├── sent_at: datetime (optional)
├── retry_count: int (default: 0)
├── created_at: datetime
└── updated_at: datetime

tags
├── id: int (PK, auto-increment)
├── user_id: str (FK → users.id, INDEXED)
├── name: str (UNIQUE per user)
├── color: str (optional, hex color)
└── created_at: datetime

task_tags
├── id: int (PK, auto-increment)
├── task_id: int (FK → tasks.id, INDEXED)
├── tag_id: int (FK → tags.id, INDEXED)
└── created_at: datetime

processed_events (for idempotency)
├── id: int (PK, auto-increment)
├── event_id: str (UNIQUE, INDEXED)
├── event_type: str
├── processed_at: datetime
└── service_name: str
```

## Authentication Flow

The authentication system operates in 5 steps:

```
1. LOGIN
   User submits credentials → Better Auth validates → Creates session + JWT

2. API CALL
   Frontend extracts JWT → Attaches to request header
   Authorization: Bearer <token>

3. VERIFICATION
   Backend extracts token → Verifies signature with BETTER_AUTH_SECRET
   Invalid/expired → 401 Unauthorized

4. AUTHORIZATION
   Backend decodes token → Extracts user_id from 'sub' claim
   Compares with URL {user_id} → Mismatch → 403 Forbidden

5. DATA FILTERING
   Query includes WHERE user_id = authenticated_user_id
   Returns ONLY that user's data
```

**Environment Variables**:

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `BETTER_AUTH_SECRET` | Both | JWT signing/verification (MUST match) |
| `BETTER_AUTH_URL` | Frontend | Auth service endpoint |
| `DATABASE_URL` | Backend/Secret | Neon PostgreSQL connection string |
| `CORS_ORIGINS` | Backend | Allowed frontend origins |
| `OPENAI_API_KEY` | Backend/Secret | OpenAI API authentication |
| `KAFKA_BROKERS` | Services/Secret | Kafka/Redpanda broker addresses |
| `SMTP_HOST` | Notification/Secret | Email server for notifications |

**CRITICAL**:
- `BETTER_AUTH_SECRET` MUST be identical in frontend and backend environments.
- `OPENAI_API_KEY` MUST be stored in environment variables/Secrets, NEVER hardcoded.
- In Kubernetes, sensitive values MUST be in Secret resources, not ConfigMaps.
- Dapr secrets MUST be used for production deployments.

## Deployment Workflow (Phase V)

### Stage 1: Local Development (Minikube)
```bash
# Start Minikube
minikube start

# Deploy Redpanda
kubectl apply -f dapr/redpanda.yaml

# Install Dapr
dapr init -k

# Apply Dapr components
kubectl apply -f dapr/

# Deploy application
helm install todo-release ./helm/todo-chatbot -n todo-app --create-namespace
```

### Stage 2: Staging (Cloud)
```bash
# Push images to registry
docker push $REGISTRY/frontend:$SHA
docker push $REGISTRY/backend:$SHA
docker push $REGISTRY/notification:$SHA
docker push $REGISTRY/recurring:$SHA

# Deploy to staging cluster
helm upgrade --install todo-release ./helm/todo-chatbot \
  -n staging \
  -f ./helm/todo-chatbot/values-staging.yaml
```

### Stage 3: Production (Cloud)
```bash
# Deploy to production cluster (manual or tag-triggered)
helm upgrade --install todo-release ./helm/todo-chatbot \
  -n production \
  -f ./helm/todo-chatbot/values-prod.yaml

# Verify deployment
kubectl get pods -n production
kubectl logs -f deployment/backend -n production
```

## Non-Negotiables

These rules have NO exceptions:

### Phase II Rules (Unchanged)
1. **JWT Verification**: Every protected route MUST call `verify_jwt_token()` dependency
2. **User ID Match**: Token `sub` claim MUST equal URL `{user_id}` or return 403
3. **Query Filtering**: Every SELECT/UPDATE/DELETE MUST include `WHERE user_id = X`
4. **Password Hashing**: `password_hash` column only; never store or log plain passwords
5. **Index on user_id**: Task table MUST have index on `user_id` column
6. **TypeScript Strict**: `tsconfig.json` MUST have `"strict": true`
7. **Server Components Default**: Only add `'use client'` when hooks/events required

### Phase III Rules (AI Integration)
8. **Stateless Chat**: Server MUST NOT store conversation state in memory
9. **User Isolation in Chat**: Every MCP tool MUST filter by `user_id`
10. **API Key Security**: AI API key MUST NOT appear in source code
11. **Tool Consistency**: All MCP tools MUST return consistent structured format
12. **History Limit**: Chat endpoint MUST limit history to 20 messages for API calls
13. **Async I/O**: ALL AI API calls MUST use async/await

### Phase IV Rules (Kubernetes/DevOps)
14. **Non-Root Containers**: ALL containers MUST run as non-root user
15. **Resource Limits**: ALL containers MUST define CPU and memory limits
16. **Health Probes**: ALL deployments MUST include liveness and readiness probes
17. **Secrets Management**: Sensitive data MUST be in Kubernetes Secrets, never ConfigMaps
18. **Multi-Stage Builds**: ALL Dockerfiles MUST use multi-stage builds
19. **Minimal Images**: ALL containers MUST use alpine or slim base images
20. **Namespace Isolation**: ALL resources MUST be deployed to appropriate namespace
21. **Helm Validation**: ALL Helm charts MUST pass `helm lint` before deployment

### Phase V Rules (Event-Driven/Cloud)
22. **Event Idempotency**: ALL event handlers MUST be idempotent
23. **Event Schema Versioning**: ALL event schemas MUST include version field
24. **Dead Letter Queue**: ALL consumers MUST route failed messages to DLQ
25. **User Isolation in Events**: ALL events MUST include user_id for filtering
26. **Dapr Sidecar**: ALL microservices MUST run with Dapr sidecar enabled
27. **No Sensitive Event Data**: Events MUST NOT contain passwords, tokens, or PII
28. **Async Kafka**: ALL Kafka operations MUST use aiokafka (async)
29. **Service Independence**: Each microservice MUST be independently deployable
30. **Health Endpoints**: ALL services MUST expose `/health` endpoint
31. **CI Pipeline**: ALL code changes MUST pass CI before merge
32. **Image Tagging**: ALL images MUST be tagged with commit SHA
33. **Staging First**: ALL deployments MUST go to staging before production
34. **Rollback Capability**: ALL deployments MUST support Helm rollback
35. **TLS Required**: ALL production ingress MUST use TLS certificates

## Success Criteria

The project is complete when ALL of these are verified:

### Phase II Criteria (Unchanged)
- [ ] All 5 features working (Create, View, Update, Delete, Mark Complete)
- [ ] Multi-user authentication functional (register, login, logout)
- [ ] User isolation verified (User A cannot see/modify User B's tasks)
- [ ] Data persists across browser sessions (Neon PostgreSQL)
- [ ] Responsive UI works on mobile, tablet, and desktop
- [ ] Zero security vulnerabilities in code review
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] No Python type errors (mypy or pyright clean)
- [ ] No console errors in browser

### Phase III Criteria (AI Chatbot)
- [ ] Users can create tasks via natural language
- [ ] Users can list tasks via natural language
- [ ] Users can complete tasks via natural language
- [ ] Users can delete tasks via natural language
- [ ] Users can update tasks via natural language
- [ ] Conversation history persists and can be resumed
- [ ] Multiple conversations supported per user
- [ ] User isolation enforced in chat (no cross-user access)
- [ ] AI API integrated successfully
- [ ] 5 MCP tools implemented and working
- [ ] Stateless architecture verified (survives server restart)
- [ ] Response times acceptable (< 3 seconds typical)
- [ ] Chat UI responsive and intuitive

### Phase IV Criteria (Local Kubernetes)
- [ ] Docker images build successfully for frontend and backend
- [ ] Images use multi-stage builds with minimal base images
- [ ] Containers run as non-root users
- [ ] Minikube cluster running and healthy
- [ ] All pods in Running state
- [ ] Services accessible (NodePort for frontend, ClusterIP for backend)
- [ ] ConfigMap contains non-sensitive configuration
- [ ] Secret contains sensitive data (API keys, DB URL)
- [ ] Frontend loads in browser via Minikube service
- [ ] Chat functionality works end-to-end
- [ ] Health probes passing for all containers
- [ ] Resource limits enforced
- [ ] Helm chart passes `helm lint`
- [ ] Helm install/upgrade/rollback functional

### Phase V Criteria (Event-Driven/Cloud)
- [ ] Redpanda/Kafka cluster running
- [ ] Dapr installed and components configured
- [ ] Chat API publishes events on task operations
- [ ] Notification service receives and processes reminders
- [ ] Recurring task service creates next occurrences
- [ ] Events are idempotent (no duplicates)
- [ ] Dead letter queue captures failed messages
- [ ] Due dates can be set and filtered
- [ ] Priorities can be set and filtered
- [ ] Tags can be created and assigned
- [ ] Reminders trigger notifications
- [ ] Recurring tasks create next instance on completion
- [ ] CI pipeline passes on all PRs
- [ ] Images pushed to container registry
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] TLS certificates configured
- [ ] Ingress routing working
- [ ] All microservices healthy
- [ ] Horizontal scaling tested
- [ ] Rollback tested

## Integration Summary

### What Phase II Has (Preserved)
- REST API for task CRUD operations
- Dashboard UI with task list
- Better Auth with JWT tokens
- User authentication and isolation
- Neon PostgreSQL database with Task model

### What Phase III Adds (Preserved)
- Conversational AI interface using OpenAI
- Natural language task management
- Chat endpoint with stateless architecture
- Conversation and Message persistence
- 5 MCP tools for AI to use
- Chat UI component

### What Phase IV Adds (Preserved)
- Docker containerization for frontend and backend
- Kubernetes deployment via Minikube
- Helm charts for package management
- AI-assisted DevOps (Gordon, kubectl-ai, Kagent)
- Resource management and health probes
- Local cloud-native development environment

### What Phase V Adds
- Event-driven architecture with Kafka/Redpanda
- Dapr distributed runtime integration
- Microservices (Notification, Recurring Task)
- Advanced task features (due dates, priorities, tags)
- Reminder system with scheduled notifications
- Recurring task automation
- Cloud Kubernetes deployment (DOKS/GKE/AKS)
- CI/CD pipelines with GitHub Actions
- Multi-environment deployment (staging/production)
- TLS and ingress configuration

### How They Work Together
- Same authentication (JWT tokens)
- Same database (Neon PostgreSQL - cloud-hosted, extended schema)
- Same user isolation principles (extended to events)
- Phases II-IV code enhanced, not replaced
- Kubernetes provides orchestration layer
- Dapr abstracts messaging infrastructure
- CI/CD automates deployment pipeline
- Events enable loose coupling between services

## Constraints

### MUST Use
- Kafka-compatible message broker (Redpanda recommended)
- Dapr for service communication
- Existing Neon PostgreSQL (extended schema)
- aiokafka for async Python Kafka
- APScheduler for scheduled tasks
- GitHub Actions for CI/CD
- Helm for Kubernetes deployments

### MUST NOT
- Use synchronous Kafka clients (must be async)
- Store sensitive data in event payloads
- Make direct HTTP calls between microservices
- Skip staging deployment for production
- Deploy without health probes
- Use root users in containers
- Hardcode secrets anywhere

### SHOULD Use (When Available)
- Redpanda Cloud for production Kafka
- Managed Kubernetes (DOKS/GKE/AKS)
- Container registry close to cluster
- cert-manager for TLS automation

## Governance

This constitution supersedes all other project documentation.

**Amendment Process**:
1. Propose change with rationale
2. Update constitution version (semantic versioning)
3. Update all affected specs and templates
4. Document change in Sync Impact Report

**Compliance**:
- All pull requests MUST verify constitution compliance
- Constitution Check in `plan.md` MUST pass before implementation
- Violations require explicit justification in Complexity Tracking table

**Version Policy**:
- MAJOR: Backward-incompatible principle changes or new mandatory phases
- MINOR: New principles or expanded guidance
- PATCH: Clarifications and typo fixes

**Version**: 4.0.0 | **Ratified**: 2026-01-01 | **Last Amended**: 2026-01-28

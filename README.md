# Todo Chatbot - Phase V: Advanced Cloud Deployment

A full-stack AI-powered task management application with event-driven microservices, Kafka streaming, Dapr integration, and Kubernetes deployment.

## Architecture

```
                    +-----------------+
                    |   Frontend      |
                    |   (Next.js)     |
                    +--------+--------+
                             |
                    +--------v--------+
                    |   Backend API   |
                    |   (FastAPI)     |
                    +---+----+----+---+
                        |    |    |
              +---------+    |    +---------+
              |              |              |
     +--------v---+  +------v------+  +----v-------+
     |  Neon DB   |  |  Redpanda   |  |   Cohere   |
     | PostgreSQL |  |   (Kafka)   |  |  AI Chat   |
     +------------+  +--+------+--+  +------------+
                        |      |
              +---------+      +---------+
              |                          |
     +--------v---------+    +----------v--------+
     | Notification Svc  |    | Recurring Task Svc|
     | (APScheduler +    |    | (Date calculator + |
     |  aiosmtplib)      |    |  task creator)     |
     +-------------------+    +--------------------+
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS, Framer Motion |
| Backend API | Python 3.11+, FastAPI, SQLModel, Pydantic |
| Database | Neon PostgreSQL (serverless) |
| AI | Cohere API (command-r-plus) with function calling |
| Messaging | Redpanda (Kafka-compatible), aiokafka |
| Microservices | Notification Service, Recurring Task Service |
| Runtime | Dapr (pub/sub, state store, secrets) |
| Orchestration | Kubernetes (Minikube / cloud), Helm charts |
| CI/CD | GitHub Actions (CI, build, staging, production) |
| Containers | Docker multi-stage builds |

## Features

### Phase II - Core Task Management
- User registration and login (email/password + Google OAuth)
- JWT authentication with session management
- Full CRUD task operations with user isolation

### Phase III - AI Chatbot
- Natural language task management via Cohere AI
- 7 MCP tools: add_task, list_tasks, complete_task, delete_task, update_task, set_reminder, list_reminders
- Conversation history with multi-turn context
- 9-step stateless chat flow
- Floating chat widget with minimize/reopen support

### Phase V - Advanced Features
- **Priority levels** (low/medium/high) with color-coded badges, filtering and sorting
- **Due dates** with date picker and date range filtering
- **Recurring tasks** (daily/weekly/monthly) with auto-creation on completion via event-driven microservice
- **Reminders** with scheduled notifications and auto-cancel on completion
- **Tags** with CRUD endpoints, task-tag associations, color-coded badges, and tag input component
- **Search** across title and description with real-time search bar
- **Filter panel** with combined priority, due date, tag, and status filters
- **Event-driven architecture** with Kafka event streaming (Redpanda)
- **Microservices** for notification delivery and recurring task processing
- **Idempotent event processing** to prevent duplicates
- **Non-blocking Kafka consumers** with retry logic for graceful degradation

### Phase V - Infrastructure
- **Kubernetes deployments** for all services with health probes and resource limits
- **Dapr sidecar injection** for pub/sub messaging on microservices
- **Dual-listener Redpanda** configuration for host and Minikube access
- **Helm charts** for templated Kubernetes deployments
- **GitHub Actions CI/CD** with lint, test, build, and multi-environment deploy

## Project Structure

```
.
├── backend/                    # FastAPI backend API
│   ├── app/
│   │   ├── main.py            # Application entry point
│   │   ├── config.py          # Environment configuration
│   │   ├── models.py          # SQLModel entities (User, Task, Reminder, Tag, etc.)
│   │   ├── schemas.py         # Pydantic DTOs
│   │   ├── database.py        # Database engine and session
│   │   ├── auth.py            # JWT authentication
│   │   ├── routers/           # API endpoints
│   │   │   ├── auth.py        # /auth/* routes
│   │   │   ├── tasks.py       # /api/{user_id}/tasks/* routes
│   │   │   ├── chat.py        # /api/{user_id}/chat route
│   │   │   └── tags.py        # /api/{user_id}/tags/* routes
│   │   ├── services/chat/     # Cohere AI chat service
│   │   │   └── tools/         # MCP tool implementations
│   │   └── events/            # Kafka event infrastructure
│   │       ├── schemas.py     # Event envelope base class
│   │       ├── task_events.py # Task event classes
│   │       ├── reminder_events.py
│   │       ├── recurring_events.py
│   │       ├── producer.py    # Kafka producer (aiokafka)
│   │       └── publisher.py   # High-level event publishing
│   └── migrations/            # SQL migration scripts
├── frontend/                   # Next.js frontend
│   ├── app/(dashboard)/       # Dashboard pages
│   ├── components/features/   # Feature components
│   │   ├── task-card.tsx      # Task card with dropdown menu
│   │   ├── task-form.tsx      # Create/edit form (tags, priority, due date, recurrence)
│   │   ├── task-list.tsx      # Task list with animations
│   │   ├── task-modal.tsx     # Create/edit task modal
│   │   ├── filter-panel.tsx   # Combined filter UI (priority, date, tags, status)
│   │   ├── search-bar.tsx     # Real-time search input
│   │   ├── tag-badge.tsx      # Color-coded tag badge
│   │   ├── tag-input.tsx      # Tag selection/creation input
│   │   └── floating-chat/     # AI chat widget
│   ├── hooks/                 # React hooks (use-tasks, etc.)
│   ├── lib/                   # API client, validations
│   └── types/                 # TypeScript type definitions
├── services/
│   ├── notification/          # Notification microservice
│   │   └── app/
│   │       ├── main.py        # FastAPI app + /health
│   │       ├── consumer.py    # Kafka consumer (reminder-events) with retry
│   │       ├── scheduler.py   # APScheduler for reminder checks
│   │       ├── notifier.py    # Email sender with retry logic
│   │       ├── queries.py     # Pending reminder queries
│   │       └── idempotency.py # Duplicate event prevention
│   └── recurring/             # Recurring task microservice
│       └── app/
│           ├── main.py        # FastAPI app + /health
│           ├── consumer.py    # Kafka consumer (task-events) with retry
│           ├── calculator.py  # Next occurrence date calculator
│           ├── task_creator.py# New task instance creation
│           └── idempotency.py # Duplicate event prevention
├── kubernetes/                 # Raw Kubernetes manifests
│   ├── configmap.yaml         # Shared configuration (incl. Kafka brokers)
│   ├── secret.yaml            # Secret references
│   ├── notification-deployment.yaml  # Notification svc + Dapr sidecar
│   ├── notification-service.yaml     # Notification ClusterIP service
│   ├── recurring-deployment.yaml     # Recurring svc + Dapr sidecar
│   └── recurring-service.yaml        # Recurring ClusterIP service
├── dapr/                       # Dapr component definitions
│   ├── pubsub-kafka.yaml      # Kafka pub/sub (Minikube listener)
│   ├── pubsub-kafka-local.yaml# Kafka pub/sub (local dev)
│   ├── statestore.yaml        # PostgreSQL state store (scoped to backend)
│   ├── secrets-local.yaml     # Local env file secrets
│   ├── secrets-k8s.yaml       # Kubernetes secrets integration
│   └── subscriptions/
│       ├── task-events.yaml
│       └── reminder-events.yaml
├── helm/todo-chatbot/          # Helm chart for Kubernetes
│   ├── templates/
│   │   ├── backend-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── notification-deployment.yaml
│   │   ├── recurring-deployment.yaml
│   │   └── dapr-components.yaml
│   ├── values.yaml
│   └── values-dev.yaml
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                 # Lint + test (push/PR)
│   ├── build-push.yml         # Docker build matrix
│   ├── deploy-staging.yml     # Auto-deploy to staging
│   └── deploy-prod.yml        # Manual production deploy
├── docker-compose.yml          # Redpanda local dev
├── docker-compose.redpanda.yml # Redpanda with dual-listener + console
└── specs/phase5/               # Design documents
    ├── tasks.md               # 125 implementation tasks
    ├── plan.md                # Architecture plan
    └── research.md            # Technology research
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop
- (Optional) Minikube + Helm for Kubernetes

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, BETTER_AUTH_SECRET, COHERE_API_KEY

uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Kafka (Redpanda) Local Development

```bash
docker compose -f docker-compose.redpanda.yml up -d

# Redpanda listeners:
#   Port 9092  - Host/local access (advertises localhost:9092)
#   Port 19092 - Minikube access (advertises host.minikube.internal:19092)
# Console UI at http://localhost:8080
# Admin API at localhost:9644
```

### Kubernetes Deployment (Minikube)

```bash
# Start Minikube
minikube start

# Build images in Minikube's Docker daemon
eval $(minikube docker-env)           # macOS/Linux
# & minikube -p minikube docker-env --shell powershell | Invoke-Expression  # Windows

# Apply raw manifests
kubectl apply -f kubernetes/
kubectl apply -f dapr/

# Or deploy with Helm
helm install todo-chatbot ./helm/todo-chatbot \
  --set secrets.databaseUrl=<your-db-url> \
  --set secrets.betterAuthSecret=<your-secret> \
  --set secrets.cohereApiKey=<your-key>
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/auth/google` | Google OAuth |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{user_id}/tasks` | List tasks (supports search, filter, sort) |
| POST | `/api/{user_id}/tasks` | Create task |
| PATCH | `/api/{user_id}/tasks/{id}` | Update task |
| DELETE | `/api/{user_id}/tasks/{id}` | Delete task |

**Query parameters for GET /tasks:**
- `search` - Search title and description
- `priority` - Filter by priority (low/medium/high)
- `is_completed` - Filter by completion status
- `due_date_from` / `due_date_to` - Date range filter
- `tag_ids` - Filter by tag IDs
- `sort_by` - Sort field (created_at, due_date, priority)
- `sort_order` - Sort direction (asc/desc)

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/{user_id}/chat` | Send message to AI |
| GET | `/api/{user_id}/conversations` | List conversations |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{user_id}/tags` | List tags |
| POST | `/api/{user_id}/tags` | Create tag |
| DELETE | `/api/{user_id}/tags/{id}` | Delete tag |
| POST | `/api/{user_id}/tasks/{id}/tags` | Add tag to task |
| DELETE | `/api/{user_id}/tasks/{id}/tags/{tag_id}` | Remove tag |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend health check |

## Event Topics (Kafka)

| Topic | Events | Consumer |
|-------|--------|----------|
| `task-events` | task.created, task.updated, task.completed, task.deleted | Recurring Task Service |
| `reminder-events` | reminder.scheduled, reminder.triggered, reminder.sent, reminder.cancelled | Notification Service |
| `notification-events` | notification.sent, notification.failed | (logging) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | JWT signing secret |
| `COHERE_API_KEY` | Cohere AI API key |
| `CORS_ORIGINS` | Allowed CORS origins |
| `KAFKA_BROKERS` | Kafka broker address(es), comma-separated |
| `KAFKA_ENABLED` | Enable event publishing (true/false) |
| `SMTP_HOST` | SMTP server for notifications |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

## License

MIT

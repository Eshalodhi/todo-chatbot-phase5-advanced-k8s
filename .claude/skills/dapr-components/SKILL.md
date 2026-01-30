# Dapr Components Skill

## Purpose

Guide for implementing Dapr (Distributed Application Runtime) components to abstract infrastructure dependencies behind portable APIs. Covers pub/sub messaging, state management, bindings, and secrets for microservices in the Phase II hackathon architecture.

## Technology Stack

- **Dapr 1.13+** - Distributed runtime sidecar
- **Dapr CLI** - Local development and debugging
- **Redpanda/Kafka** - Pub/sub message broker backend
- **Redis** - State store backend
- **Kubernetes** - Production deployment with sidecars
- **FastAPI/Python** - Application integration

---

## Project Structure

```
infrastructure/
├── dapr/
│   ├── components/
│   │   ├── pubsub-redpanda.yaml      # Pub/Sub component
│   │   ├── statestore-redis.yaml     # State store component
│   │   ├── binding-cron.yaml         # Cron input binding
│   │   ├── binding-http.yaml         # HTTP output binding
│   │   └── secrets-env.yaml          # Secrets component
│   ├── config/
│   │   └── config.yaml               # Dapr configuration
│   └── subscriptions/
│       └── subscriptions.yaml        # Pub/sub subscriptions
├── kubernetes/
│   ├── deployments/
│   │   ├── task-service.yaml         # With Dapr annotations
│   │   └── notification-service.yaml
│   └── dapr/
│       └── components/               # K8s Dapr components
docker-compose.dapr.yml               # Local Dapr development
```

---

## Dapr Installation

### Local Development (Dapr CLI)

```bash
# Install Dapr CLI
# Windows (PowerShell)
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"

# macOS
brew install dapr/tap/dapr-cli

# Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Verify installation
dapr --version

# Initialize Dapr (local mode with Docker)
dapr init

# Verify Dapr is running
dapr status
docker ps  # Should show dapr_placement, dapr_redis, dapr_zipkin

# Uninstall (if needed)
dapr uninstall
```

### Kubernetes Installation

```bash
# Install Dapr on Kubernetes cluster
dapr init -k

# Or with Helm for more control
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --wait

# Verify installation
dapr status -k
kubectl get pods -n dapr-system

# Dashboard (optional)
dapr dashboard -k
# Opens http://localhost:8080
```

---

## Local Development Setup

### docker-compose.dapr.yml

```yaml
version: '3.8'

services:
  # ============================================================
  # Infrastructure Services
  # ============================================================
  redis:
    image: redis:7-alpine
    container_name: dapr-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:v24.1.1
    container_name: dapr-redpanda
    command:
      - redpanda
      - start
      - --smp 1
      - --memory 512M
      - --overprovisioned
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://redpanda:9092
    ports:
      - "9092:9092"
    healthcheck:
      test: ["CMD", "rpk", "cluster", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  zipkin:
    image: openzipkin/zipkin:latest
    container_name: dapr-zipkin
    ports:
      - "9411:9411"

  # ============================================================
  # Dapr Placement Service (for actors)
  # ============================================================
  placement:
    image: daprio/dapr:1.13.0
    container_name: dapr-placement
    command: ["./placement", "-port", "50006"]
    ports:
      - "50006:50006"

  # ============================================================
  # Task Service with Dapr Sidecar
  # ============================================================
  task-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: task-service
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
    ports:
      - "8000:8000"
    depends_on:
      redis:
        condition: service_healthy
      redpanda:
        condition: service_healthy

  task-service-dapr:
    image: daprio/daprd:1.13.0
    container_name: task-service-dapr
    command:
      - "./daprd"
      - "-app-id"
      - "task-service"
      - "-app-port"
      - "8000"
      - "-dapr-http-port"
      - "3500"
      - "-dapr-grpc-port"
      - "50001"
      - "-placement-host-address"
      - "placement:50006"
      - "-components-path"
      - "/components"
      - "-config"
      - "/config/config.yaml"
    volumes:
      - ./infrastructure/dapr/components:/components
      - ./infrastructure/dapr/config:/config
    network_mode: "service:task-service"
    depends_on:
      - task-service
      - placement
      - redis
      - redpanda

  # ============================================================
  # Notification Service with Dapr Sidecar
  # ============================================================
  notification-service:
    build:
      context: ./services/notification
      dockerfile: Dockerfile
    container_name: notification-service
    environment:
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
    ports:
      - "8001:8001"
    depends_on:
      redis:
        condition: service_healthy
      redpanda:
        condition: service_healthy

  notification-service-dapr:
    image: daprio/daprd:1.13.0
    container_name: notification-service-dapr
    command:
      - "./daprd"
      - "-app-id"
      - "notification-service"
      - "-app-port"
      - "8001"
      - "-dapr-http-port"
      - "3501"
      - "-dapr-grpc-port"
      - "50002"
      - "-placement-host-address"
      - "placement:50006"
      - "-components-path"
      - "/components"
      - "-config"
      - "/config/config.yaml"
    volumes:
      - ./infrastructure/dapr/components:/components
      - ./infrastructure/dapr/config:/config
    network_mode: "service:notification-service"
    depends_on:
      - notification-service
      - placement

networks:
  default:
    name: dapr-network
```

---

## Dapr Configuration

### config.yaml

```yaml
# infrastructure/dapr/config/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  # Tracing configuration
  tracing:
    samplingRate: "1"  # 100% sampling for dev, reduce in prod
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"

  # Metrics configuration
  metrics:
    enabled: true

  # mTLS configuration (enable in production)
  mtls:
    enabled: false  # Set true for production

  # Access control (optional)
  accessControl:
    defaultAction: allow
    trustDomain: "public"

  # API logging
  logging:
    apiLogging:
      enabled: true
      obfuscateURLs: false

  # Features
  features:
    - name: "ServiceInvocation"
      enabled: true
    - name: "StateStore"
      enabled: true
    - name: "PubSub"
      enabled: true
    - name: "Bindings"
      enabled: true
    - name: "Secrets"
      enabled: true
```

---

## Pub/Sub Component

### Redpanda/Kafka Pub/Sub

```yaml
# infrastructure/dapr/components/pubsub-redpanda.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    # Broker configuration
    - name: brokers
      value: "redpanda:9092"  # Use localhost:9092 for local dev without Docker

    # Consumer configuration
    - name: consumerGroup
      value: "dapr-consumers"
    - name: authRequired
      value: "false"

    # Producer configuration
    - name: maxMessageBytes
      value: "1048576"  # 1MB

    # Reliability settings
    - name: initialOffset
      value: "oldest"  # Start from beginning if no offset
    - name: disableTls
      value: "true"  # Enable TLS in production

    # For Redpanda Cloud (production)
    # - name: authType
    #   value: "password"
    # - name: saslUsername
    #   secretKeyRef:
    #     name: kafka-secrets
    #     key: username
    # - name: saslPassword
    #   secretKeyRef:
    #     name: kafka-secrets
    #     key: password

scopes:
  - task-service
  - notification-service
  - recurring-task-service
```

### Pub/Sub Subscriptions

```yaml
# infrastructure/dapr/subscriptions/subscriptions.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: task-events-subscription
spec:
  pubsubname: pubsub
  topic: task-events
  routes:
    default: /events/task
  scopes:
    - notification-service
    - recurring-task-service
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: reminder-events-subscription
spec:
  pubsubname: pubsub
  topic: reminder-events
  routes:
    rules:
      - match: event.type == "reminder.triggered"
        path: /events/reminder/triggered
      - match: event.type == "reminder.scheduled"
        path: /events/reminder/scheduled
    default: /events/reminder
  scopes:
    - notification-service
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: notification-events-subscription
spec:
  pubsubname: pubsub
  topic: notification-events
  routes:
    default: /events/notification
  scopes:
    - notification-service
```

### Python Pub/Sub Usage

```python
# dapr_client.py
import os
import json
import httpx
from typing import Any, Optional
from pydantic import BaseModel

DAPR_HTTP_PORT = os.getenv("DAPR_HTTP_PORT", "3500")
DAPR_BASE_URL = f"http://localhost:{DAPR_HTTP_PORT}"


class DaprClient:
    """
    Dapr HTTP client for pub/sub, state, and service invocation.

    Uses HTTP API instead of gRPC for simplicity.
    """

    def __init__(self):
        self.base_url = DAPR_BASE_URL
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client."""
        await self._client.aclose()

    # ============================================================
    # Pub/Sub Operations
    # ============================================================

    async def publish(
        self,
        pubsub_name: str,
        topic: str,
        data: dict | BaseModel,
        metadata: Optional[dict] = None,
    ) -> bool:
        """
        Publish an event to a topic.

        Args:
            pubsub_name: Name of the pubsub component
            topic: Topic to publish to
            data: Event data (dict or Pydantic model)
            metadata: Optional metadata headers

        Returns:
            True if published successfully
        """
        url = f"{self.base_url}/v1.0/publish/{pubsub_name}/{topic}"

        # Serialize Pydantic models
        if isinstance(data, BaseModel):
            payload = data.model_dump(mode="json")
        else:
            payload = data

        headers = {"Content-Type": "application/json"}

        # Add metadata as headers
        if metadata:
            for key, value in metadata.items():
                headers[f"metadata.{key}"] = str(value)

        response = await self._client.post(
            url,
            json=payload,
            headers=headers,
        )

        return response.status_code == 204

    async def publish_bulk(
        self,
        pubsub_name: str,
        topic: str,
        entries: list[dict],
    ) -> dict:
        """
        Publish multiple events in a single request.

        Args:
            entries: List of {"entryId": str, "event": dict, "contentType": str}
        """
        url = f"{self.base_url}/v1.0-alpha1/publish/bulk/{pubsub_name}/{topic}"

        response = await self._client.post(url, json=entries)
        return response.json()


# Global client instance
dapr_client = DaprClient()


# FastAPI integration
async def get_dapr_client() -> DaprClient:
    return dapr_client
```

### FastAPI Pub/Sub Subscriber

```python
# routes/events.py
from fastapi import APIRouter, Request, Response
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Dapr subscription endpoint
@router.get("/dapr/subscribe")
async def subscribe():
    """
    Return subscriptions for Dapr to register.

    Alternative to declarative YAML subscriptions.
    """
    subscriptions = [
        {
            "pubsubname": "pubsub",
            "topic": "task-events",
            "route": "/events/task",
        },
        {
            "pubsubname": "pubsub",
            "topic": "reminder-events",
            "routes": {
                "rules": [
                    {
                        "match": 'event.type == "reminder.triggered"',
                        "path": "/events/reminder/triggered",
                    },
                ],
                "default": "/events/reminder",
            },
        },
    ]
    return subscriptions


# Event handlers
@router.post("/events/task")
async def handle_task_event(request: Request):
    """Handle task events from Dapr pub/sub."""
    # Dapr sends CloudEvents format
    event = await request.json()

    logger.info(f"Received task event: {event.get('type')}")

    # Extract data from CloudEvent
    data = event.get("data", {})
    event_type = event.get("type")
    source = event.get("source")

    # Process based on event type
    if event_type == "task.created":
        await handle_task_created(data)
    elif event_type == "task.completed":
        await handle_task_completed(data)
    elif event_type == "task.deleted":
        await handle_task_deleted(data)

    # Return success - Dapr expects 200 for SUCCESS
    # Return 404 for DROP (don't retry)
    # Return other status for RETRY
    return Response(status_code=200)


@router.post("/events/reminder/triggered")
async def handle_reminder_triggered(request: Request):
    """Handle triggered reminder events."""
    event = await request.json()
    data = event.get("data", {})

    logger.info(f"Reminder triggered: {data.get('reminder_id')}")

    # Send notification
    await send_notification(data)

    return Response(status_code=200)


async def handle_task_created(data: dict):
    """Process task created event."""
    logger.info(f"Task created: {data.get('task_id')}")
    # Implementation here


async def handle_task_completed(data: dict):
    """Process task completed event."""
    logger.info(f"Task completed: {data.get('task_id')}")
    # Check for recurring task creation


async def handle_task_deleted(data: dict):
    """Process task deleted event."""
    logger.info(f"Task deleted: {data.get('task_id')}")
    # Cancel any scheduled reminders


async def send_notification(data: dict):
    """Send notification for reminder."""
    # Implementation here
    pass
```

---

## State Store Component

### Redis State Store

```yaml
# infrastructure/dapr/components/statestore-redis.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    # Connection
    - name: redisHost
      value: "redis:6379"  # Use localhost:6379 for local dev

    # Authentication (if enabled)
    - name: redisPassword
      value: ""

    # State configuration
    - name: actorStateStore
      value: "true"  # Enable for actor state

    # Key prefix
    - name: keyPrefix
      value: "name"  # Options: name, none, appid

    # TTL support
    - name: enableTLS
      value: "false"

    # Consistency
    - name: queryIndexes
      value: |
        [
          {"name": "user_id", "indexes": [{"key": "user_id", "type": "TEXT"}]}
        ]

scopes:
  - task-service
  - notification-service
```

### Python State Store Usage

```python
# dapr_client.py (continued)

class DaprClient:
    # ... (previous code)

    # ============================================================
    # State Store Operations
    # ============================================================

    async def save_state(
        self,
        store_name: str,
        key: str,
        value: Any,
        etag: Optional[str] = None,
        metadata: Optional[dict] = None,
        consistency: str = "strong",  # or "eventual"
        concurrency: str = "first-write",  # or "last-write"
    ) -> bool:
        """
        Save state to state store.

        Args:
            store_name: Name of state store component
            key: State key
            value: State value (will be JSON serialized)
            etag: Optional ETag for optimistic concurrency
            consistency: Consistency level
            concurrency: Concurrency mode

        Returns:
            True if saved successfully
        """
        url = f"{self.base_url}/v1.0/state/{store_name}"

        state_item = {
            "key": key,
            "value": value,
            "options": {
                "consistency": consistency,
                "concurrency": concurrency,
            },
        }

        if etag:
            state_item["etag"] = etag

        if metadata:
            state_item["metadata"] = metadata

        response = await self._client.post(url, json=[state_item])
        return response.status_code == 204

    async def get_state(
        self,
        store_name: str,
        key: str,
        consistency: str = "strong",
    ) -> tuple[Any, Optional[str]]:
        """
        Get state from state store.

        Returns:
            Tuple of (value, etag)
        """
        url = f"{self.base_url}/v1.0/state/{store_name}/{key}"
        params = {"consistency": consistency}

        response = await self._client.get(url, params=params)

        if response.status_code == 204:
            return None, None

        etag = response.headers.get("ETag")
        return response.json(), etag

    async def delete_state(
        self,
        store_name: str,
        key: str,
        etag: Optional[str] = None,
    ) -> bool:
        """Delete state from state store."""
        url = f"{self.base_url}/v1.0/state/{store_name}/{key}"
        headers = {}

        if etag:
            headers["If-Match"] = etag

        response = await self._client.delete(url, headers=headers)
        return response.status_code == 204

    async def get_bulk_state(
        self,
        store_name: str,
        keys: list[str],
    ) -> dict[str, Any]:
        """Get multiple state values."""
        url = f"{self.base_url}/v1.0/state/{store_name}/bulk"

        response = await self._client.post(
            url,
            json={"keys": keys},
        )

        if response.status_code != 200:
            return {}

        results = {}
        for item in response.json():
            if item.get("data"):
                results[item["key"]] = item["data"]

        return results

    async def query_state(
        self,
        store_name: str,
        query: dict,
    ) -> list[dict]:
        """
        Query state store (requires query support in component).

        Example query:
        {
            "filter": {
                "EQ": {"user_id": "user-123"}
            },
            "sort": [{"key": "created_at", "order": "DESC"}],
            "page": {"limit": 10}
        }
        """
        url = f"{self.base_url}/v1.0-alpha1/state/{store_name}/query"

        response = await self._client.post(url, json=query)

        if response.status_code != 200:
            return []

        return response.json().get("results", [])

    async def transaction(
        self,
        store_name: str,
        operations: list[dict],
    ) -> bool:
        """
        Execute state transaction.

        Operations format:
        [
            {"operation": "upsert", "request": {"key": "k1", "value": "v1"}},
            {"operation": "delete", "request": {"key": "k2"}}
        ]
        """
        url = f"{self.base_url}/v1.0/state/{store_name}/transaction"

        response = await self._client.post(
            url,
            json={"operations": operations},
        )

        return response.status_code == 204
```

### State Store Usage Example

```python
# services/idempotency.py
from dapr_client import dapr_client


class IdempotencyService:
    """
    Idempotency tracking using Dapr state store.

    Ensures events are processed exactly once.
    """

    def __init__(self, store_name: str = "statestore"):
        self.store_name = store_name
        self.prefix = "idempotency"

    async def is_processed(self, event_id: str) -> bool:
        """Check if event has been processed."""
        key = f"{self.prefix}:{event_id}"
        value, _ = await dapr_client.get_state(self.store_name, key)
        return value is not None

    async def mark_processed(
        self,
        event_id: str,
        result: dict,
        ttl_seconds: int = 86400,  # 24 hours
    ) -> None:
        """Mark event as processed with result."""
        key = f"{self.prefix}:{event_id}"
        await dapr_client.save_state(
            self.store_name,
            key,
            {"processed": True, "result": result},
            metadata={"ttlInSeconds": str(ttl_seconds)},
        )

    async def get_result(self, event_id: str) -> dict | None:
        """Get cached result for processed event."""
        key = f"{self.prefix}:{event_id}"
        value, _ = await dapr_client.get_state(self.store_name, key)
        return value.get("result") if value else None


# Usage in event handler
idempotency = IdempotencyService()


async def handle_event(event: dict):
    event_id = event.get("event_id")

    # Check idempotency
    if await idempotency.is_processed(event_id):
        return await idempotency.get_result(event_id)

    # Process event
    result = await process_event_logic(event)

    # Mark as processed
    await idempotency.mark_processed(event_id, result)

    return result
```

---

## Bindings Component

### Cron Input Binding (Scheduled Tasks)

```yaml
# infrastructure/dapr/components/binding-cron.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: reminder-scheduler
spec:
  type: bindings.cron
  version: v1
  metadata:
    # Schedule using cron expression
    - name: schedule
      value: "*/5 * * * *"  # Every 5 minutes

    # Or use @every syntax
    # - name: schedule
    #   value: "@every 1m"  # Every 1 minute

scopes:
  - notification-service
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: daily-cleanup
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "0 2 * * *"  # Daily at 2 AM

scopes:
  - task-service
```

### HTTP Output Binding

```yaml
# infrastructure/dapr/components/binding-http.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: external-api
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: "https://api.external-service.com"
    - name: method
      value: "POST"

scopes:
  - notification-service
---
# SendGrid Email Binding
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: "https://api.sendgrid.com/v3/mail/send"
    - name: method
      value: "POST"

scopes:
  - notification-service
```

### SMTP Output Binding

```yaml
# infrastructure/dapr/components/binding-smtp.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: email-smtp
spec:
  type: bindings.smtp
  version: v1
  metadata:
    - name: host
      value: "smtp.gmail.com"
    - name: port
      value: "587"
    - name: user
      secretKeyRef:
        name: smtp-secrets
        key: username
    - name: password
      secretKeyRef:
        name: smtp-secrets
        key: password
    - name: skipTLSVerify
      value: "false"

scopes:
  - notification-service
```

### Python Bindings Usage

```python
# dapr_client.py (continued)

class DaprClient:
    # ... (previous code)

    # ============================================================
    # Bindings Operations
    # ============================================================

    async def invoke_binding(
        self,
        binding_name: str,
        operation: str,
        data: Any,
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Invoke an output binding.

        Args:
            binding_name: Name of the binding component
            operation: Binding operation (e.g., "create", "get")
            data: Data to send to binding
            metadata: Optional metadata

        Returns:
            Response from binding
        """
        url = f"{self.base_url}/v1.0/bindings/{binding_name}"

        payload = {
            "operation": operation,
            "data": data,
        }

        if metadata:
            payload["metadata"] = metadata

        response = await self._client.post(url, json=payload)

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 204:
            return {}
        else:
            response.raise_for_status()


# Binding-specific helpers
async def send_email_smtp(
    to: str,
    subject: str,
    body: str,
    from_addr: str = "noreply@example.com",
) -> bool:
    """Send email via SMTP binding."""
    return await dapr_client.invoke_binding(
        binding_name="email-smtp",
        operation="create",
        data=body,
        metadata={
            "emailTo": to,
            "emailFrom": from_addr,
            "subject": subject,
        },
    )


async def send_email_sendgrid(
    to: str,
    subject: str,
    body: str,
    api_key: str,
) -> dict:
    """Send email via SendGrid HTTP binding."""
    return await dapr_client.invoke_binding(
        binding_name="sendgrid",
        operation="create",
        data={
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": "noreply@example.com"},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        },
        metadata={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
```

### Input Binding Handler (Cron)

```python
# routes/bindings.py
from fastapi import APIRouter, Request, Response
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/reminder-scheduler")
async def handle_reminder_cron(request: Request):
    """
    Handle cron trigger for reminder checks.

    Dapr calls this endpoint based on cron schedule.
    """
    logger.info("Reminder scheduler triggered")

    # Check for due reminders
    await check_due_reminders()

    return Response(status_code=200)


@router.post("/daily-cleanup")
async def handle_cleanup_cron(request: Request):
    """Handle daily cleanup cron job."""
    logger.info("Daily cleanup triggered")

    # Cleanup old data
    await cleanup_old_processed_events()
    await cleanup_expired_sessions()

    return Response(status_code=200)


async def check_due_reminders():
    """Check and trigger due reminders."""
    # Implementation here
    pass


async def cleanup_old_processed_events():
    """Clean up old idempotency records."""
    # Implementation here
    pass


async def cleanup_expired_sessions():
    """Clean up expired sessions."""
    # Implementation here
    pass
```

---

## Secrets Component

### Local Secrets (Development)

```yaml
# infrastructure/dapr/components/secrets-local.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "/secrets/secrets.json"
    - name: nestedSeparator
      value: ":"

scopes:
  - task-service
  - notification-service
```

```json
// infrastructure/dapr/secrets/secrets.json
{
  "database": {
    "url": "postgresql://user:pass@host/db"
  },
  "auth": {
    "secret": "your-better-auth-secret"
  },
  "kafka": {
    "username": "kafka-user",
    "password": "kafka-password"
  },
  "smtp": {
    "username": "smtp-user",
    "password": "smtp-password"
  }
}
```

### Kubernetes Secrets

```yaml
# infrastructure/dapr/components/secrets-kubernetes.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []

scopes:
  - task-service
  - notification-service
```

### Environment Variables Secrets

```yaml
# infrastructure/dapr/components/secrets-env.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: env-secrets
spec:
  type: secretstores.local.env
  version: v1
  metadata: []

scopes:
  - task-service
  - notification-service
```

### Python Secrets Usage

```python
# dapr_client.py (continued)

class DaprClient:
    # ... (previous code)

    # ============================================================
    # Secrets Operations
    # ============================================================

    async def get_secret(
        self,
        store_name: str,
        key: str,
    ) -> dict[str, str]:
        """
        Get a secret from secret store.

        Returns:
            Dict of secret key-value pairs
        """
        url = f"{self.base_url}/v1.0/secrets/{store_name}/{key}"

        response = await self._client.get(url)

        if response.status_code != 200:
            return {}

        return response.json()

    async def get_bulk_secrets(
        self,
        store_name: str,
    ) -> dict[str, dict[str, str]]:
        """Get all secrets from secret store."""
        url = f"{self.base_url}/v1.0/secrets/{store_name}/bulk"

        response = await self._client.get(url)

        if response.status_code != 200:
            return {}

        return response.json()


# Secret access helper
async def get_database_url() -> str:
    """Get database URL from secrets."""
    secrets = await dapr_client.get_secret("kubernetes-secrets", "database")
    return secrets.get("url", "")


async def get_auth_secret() -> str:
    """Get Better Auth secret."""
    secrets = await dapr_client.get_secret("kubernetes-secrets", "auth")
    return secrets.get("secret", "")
```

### Using Secrets in Components

```yaml
# Reference secrets in other components
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: saslUsername
      secretKeyRef:
        name: kafka-secrets  # Kubernetes secret name
        key: username
    - name: saslPassword
      secretKeyRef:
        name: kafka-secrets
        key: password
  auth:
    secretStore: kubernetes-secrets
```

---

## Kubernetes Deployment with Sidecars

### Deployment with Dapr Annotations

```yaml
# kubernetes/deployments/task-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
  labels:
    app: task-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
      annotations:
        # Dapr sidecar injection
        dapr.io/enabled: "true"
        dapr.io/app-id: "task-service"
        dapr.io/app-port: "8000"
        dapr.io/app-protocol: "http"

        # Resource limits for sidecar
        dapr.io/sidecar-cpu-limit: "300m"
        dapr.io/sidecar-memory-limit: "256Mi"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"

        # Logging and tracing
        dapr.io/log-level: "info"
        dapr.io/enable-metrics: "true"
        dapr.io/metrics-port: "9090"

        # Configuration
        dapr.io/config: "dapr-config"

        # Health probes
        dapr.io/sidecar-liveness-probe-delay-seconds: "3"
        dapr.io/sidecar-readiness-probe-delay-seconds: "3"
    spec:
      containers:
        - name: task-service
          image: task-service:latest
          ports:
            - containerPort: 8000
          env:
            - name: DAPR_HTTP_PORT
              value: "3500"
            - name: DAPR_GRPC_PORT
              value: "50001"
          envFrom:
            - secretRef:
                name: task-service-secrets
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
  ports:
    - name: http
      port: 80
      targetPort: 8000
    - name: dapr-http
      port: 3500
      targetPort: 3500
```

### Dapr Components in Kubernetes

```yaml
# kubernetes/dapr/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default  # Or your app namespace
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "redpanda.kafka.svc.cluster.local:9092"
    - name: consumerGroup
      value: "dapr-consumers"
    - name: authRequired
      value: "false"
---
# kubernetes/dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.redis.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secrets
        key: password
```

### Kubernetes Secrets

```yaml
# kubernetes/secrets/app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: task-service-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@host/db"
  BETTER_AUTH_SECRET: "your-secret-here"
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-secrets
type: Opaque
stringData:
  password: "redis-password"
---
apiVersion: v1
kind: Secret
metadata:
  name: kafka-secrets
type: Opaque
stringData:
  username: "kafka-user"
  password: "kafka-password"
```

---

## Service Invocation

### Direct Service-to-Service Calls

```python
# dapr_client.py (continued)

class DaprClient:
    # ... (previous code)

    # ============================================================
    # Service Invocation
    # ============================================================

    async def invoke_service(
        self,
        app_id: str,
        method: str,
        http_verb: str = "POST",
        data: Any = None,
        headers: Optional[dict] = None,
    ) -> dict:
        """
        Invoke a method on another Dapr service.

        Args:
            app_id: Target service app-id
            method: Method/path to invoke
            http_verb: HTTP method (GET, POST, etc.)
            data: Request body
            headers: Optional headers

        Returns:
            Response from service
        """
        url = f"{self.base_url}/v1.0/invoke/{app_id}/method/{method}"

        request_headers = headers or {}
        request_headers["Content-Type"] = "application/json"

        if http_verb.upper() == "GET":
            response = await self._client.get(url, headers=request_headers)
        elif http_verb.upper() == "POST":
            response = await self._client.post(
                url,
                json=data,
                headers=request_headers,
            )
        elif http_verb.upper() == "PUT":
            response = await self._client.put(
                url,
                json=data,
                headers=request_headers,
            )
        elif http_verb.upper() == "DELETE":
            response = await self._client.delete(url, headers=request_headers)
        else:
            raise ValueError(f"Unsupported HTTP verb: {http_verb}")

        if response.status_code == 204:
            return {}

        return response.json()


# Service invocation helpers
async def get_user_details(user_id: str) -> dict:
    """Get user details from user service."""
    return await dapr_client.invoke_service(
        app_id="user-service",
        method=f"api/users/{user_id}",
        http_verb="GET",
    )


async def send_notification_request(notification: dict) -> dict:
    """Send notification request to notification service."""
    return await dapr_client.invoke_service(
        app_id="notification-service",
        method="api/notifications",
        http_verb="POST",
        data=notification,
    )
```

---

## Running Locally with Dapr CLI

### Run Single Service

```bash
# Run task-service with Dapr sidecar
dapr run \
  --app-id task-service \
  --app-port 8000 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --components-path ./infrastructure/dapr/components \
  --config ./infrastructure/dapr/config/config.yaml \
  -- python -m uvicorn main:app --host 0.0.0.0 --port 8000

# In another terminal, run notification-service
dapr run \
  --app-id notification-service \
  --app-port 8001 \
  --dapr-http-port 3501 \
  --dapr-grpc-port 50002 \
  --components-path ./infrastructure/dapr/components \
  --config ./infrastructure/dapr/config/config.yaml \
  -- python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Multi-App Run (dapr.yaml)

```yaml
# dapr.yaml
version: 1
common:
  resourcesPath: ./infrastructure/dapr/components
  configFilePath: ./infrastructure/dapr/config/config.yaml
apps:
  - appID: task-service
    appDirPath: ./backend
    appPort: 8000
    command: ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
    daprHTTPPort: 3500
    daprGRPCPort: 50001

  - appID: notification-service
    appDirPath: ./services/notification
    appPort: 8001
    command: ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
    daprHTTPPort: 3501
    daprGRPCPort: 50002
```

```bash
# Run all services
dapr run -f dapr.yaml

# Stop all services
dapr stop -f dapr.yaml
```

---

## Debugging & Troubleshooting

### Dapr CLI Commands

```bash
# List running Dapr apps
dapr list

# View Dapr logs
dapr logs --app-id task-service

# Invoke Dapr method directly
dapr invoke --app-id task-service --method health --verb GET

# Publish test event
dapr publish --publish-app-id task-service --pubsub pubsub --topic task-events --data '{"type":"test"}'

# Dashboard
dapr dashboard
```

### Common Issues

```bash
# Check if Dapr sidecar is running
curl http://localhost:3500/v1.0/healthz

# Check component status
curl http://localhost:3500/v1.0/metadata

# Debug pub/sub subscription
curl http://localhost:8000/dapr/subscribe

# Test state store
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"test","value":"hello"}]'

curl http://localhost:3500/v1.0/state/statestore/test
```

---

## Quick Reference

### Dapr HTTP API Endpoints

| Operation | Endpoint |
|-----------|----------|
| Publish | `POST /v1.0/publish/{pubsub}/{topic}` |
| Save State | `POST /v1.0/state/{store}` |
| Get State | `GET /v1.0/state/{store}/{key}` |
| Delete State | `DELETE /v1.0/state/{store}/{key}` |
| Invoke Binding | `POST /v1.0/bindings/{name}` |
| Get Secret | `GET /v1.0/secrets/{store}/{key}` |
| Invoke Service | `POST /v1.0/invoke/{app-id}/method/{method}` |
| Health | `GET /v1.0/healthz` |
| Metadata | `GET /v1.0/metadata` |

### Dapr Annotations Cheat Sheet

| Annotation | Description |
|------------|-------------|
| `dapr.io/enabled` | Enable Dapr sidecar |
| `dapr.io/app-id` | Application identifier |
| `dapr.io/app-port` | Application port |
| `dapr.io/app-protocol` | Protocol (http/grpc) |
| `dapr.io/config` | Dapr configuration name |
| `dapr.io/log-level` | Sidecar log level |
| `dapr.io/enable-metrics` | Enable Prometheus metrics |
| `dapr.io/sidecar-cpu-limit` | Sidecar CPU limit |
| `dapr.io/sidecar-memory-limit` | Sidecar memory limit |

# Research: Phase V Advanced Cloud Deployment

**Date**: 2026-01-28
**Status**: Complete
**Plan**: [plan.md](./plan.md)

## Research Summary

This document consolidates research findings for Phase V implementation decisions.

---

## 1. Redpanda vs Apache Kafka

### Decision: Redpanda (Kafka-compatible)

### Rationale
- **100% Kafka API compatible** - no code changes needed
- **Single binary** - no ZooKeeper dependency
- **Lower resource usage** - ideal for local development
- **Simpler operations** - one container vs. multi-container Kafka setup
- **Built-in console** - web UI for topic management at port 8081

### Configuration Verified
```yaml
# docker-compose.redpanda.yml
services:
  redpanda:
    image: redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 1G
      - --overprovisioned
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://host.docker.internal:9092
    ports:
      - "9092:9092"   # Kafka protocol
      - "8081:8081"   # Admin console
      - "8082:8082"   # Schema registry
```

### Alternatives Considered
- **Apache Kafka**: More mature but requires ZooKeeper, complex setup
- **AWS MSK**: Managed but requires AWS account, not local
- **Confluent Cloud**: Excellent but adds cost/complexity

---

## 2. aiokafka vs confluent-kafka-python

### Decision: aiokafka

### Rationale
- **Native async/await** - matches FastAPI's async model
- **Pure Python** - no C dependencies, easier installation
- **Battle-tested** - widely used in production
- **Simpler API** - cleaner for async code

### Code Pattern Verified
```python
from aiokafka import AIOKafkaProducer

async def publish_event(topic: str, event: dict):
    producer = AIOKafkaProducer(
        bootstrap_servers='localhost:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    await producer.start()
    try:
        await producer.send_and_wait(topic, event)
    finally:
        await producer.stop()
```

### Alternatives Considered
- **confluent-kafka-python**: Requires librdkafka C library, sync-first API
- **kafka-python**: Older, less maintained, sync API

---

## 3. Dapr SDK vs HTTP API

### Decision: Dapr Python SDK (dapr-client)

### Rationale
- **Type safety** - Python SDK provides typed interfaces
- **Simpler code** - abstracts HTTP details
- **Official support** - maintained by Dapr team
- **Async support** - native async/await methods

### Code Pattern Verified
```python
from dapr.clients import DaprClient

async def publish_via_dapr(topic: str, data: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub-kafka",
            topic_name=topic,
            data=json.dumps(data),
            data_content_type="application/json"
        )
```

### HTTP API Alternative (also works)
```python
import httpx

async def publish_via_http(topic: str, data: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:3500/v1.0/publish/pubsub-kafka/{topic}",
            json=data
        )
```

---

## 4. APScheduler vs Celery Beat

### Decision: APScheduler

### Rationale
- **Lightweight** - no external dependencies (Redis/RabbitMQ)
- **Async support** - AsyncIOScheduler for FastAPI
- **Simple setup** - in-process scheduler
- **Sufficient for hackathon** - handles minute-level scheduling

### Code Pattern Verified
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job(CronTrigger(minute="*"))  # Every minute
async def check_due_reminders():
    # Query reminders where remind_at <= now() and sent = False
    # Publish reminder.triggered events
    pass

scheduler.start()
```

### Alternatives Considered
- **Celery Beat**: Requires Redis/RabbitMQ, overkill for simple cron
- **Dapr Cron Binding**: Could work but APScheduler more flexible

---

## 5. Email Provider

### Decision: SMTP with SendGrid (or any SMTP server)

### Rationale
- **Universal protocol** - works with any provider
- **Free tier available** - SendGrid offers 100 emails/day free
- **Simple integration** - Python's aiosmtplib library
- **No vendor lock-in** - can switch providers easily

### Code Pattern Verified
```python
import aiosmtplib
from email.message import EmailMessage

async def send_email(to: str, subject: str, body: str):
    message = EmailMessage()
    message["From"] = "noreply@todoapp.com"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname=os.getenv("SMTP_HOST"),
        port=587,
        username=os.getenv("SMTP_USER"),
        password=os.getenv("SMTP_PASS"),
        start_tls=True
    )
```

### Alternatives Considered
- **SendGrid SDK**: Vendor-specific, less portable
- **AWS SES**: Requires AWS account
- **Mailgun**: Good but adds another account

---

## 6. Date Calculation Library

### Decision: Python dateutil

### Rationale
- **Relative deltas** - easy "next month" calculation
- **Timezone handling** - pytz integration
- **Edge case handling** - handles month-end correctly
- **Standard library complement** - extends datetime

### Code Pattern Verified
```python
from dateutil.relativedelta import relativedelta
from datetime import datetime

def calculate_next_occurrence(
    completed_date: datetime,
    pattern: str  # "daily", "weekly", "monthly"
) -> datetime:
    if pattern == "daily":
        return completed_date + relativedelta(days=1)
    elif pattern == "weekly":
        return completed_date + relativedelta(weeks=1)
    elif pattern == "monthly":
        return completed_date + relativedelta(months=1)
    raise ValueError(f"Unknown pattern: {pattern}")

# Month-end handling is automatic:
# Jan 31 + 1 month = Feb 28 (or 29 in leap year)
```

---

## 7. DigitalOcean vs GKE vs AKS

### Decision: DigitalOcean Kubernetes (DOKS)

### Rationale
- **Simplest setup** - one command cluster creation
- **Integrated registry** - DOCR works seamlessly
- **$200 free credit** - sufficient for hackathon
- **Excellent docs** - step-by-step tutorials
- **Lower complexity** - fewer IAM/networking concerns

### Setup Commands Verified
```bash
# Install doctl CLI
brew install doctl  # or choco install doctl

# Authenticate
doctl auth init

# Create cluster
doctl kubernetes cluster create todo-cluster \
  --region nyc1 \
  --node-pool "name=default;size=s-2vcpu-4gb;count=3"

# Get kubeconfig
doctl kubernetes cluster kubeconfig save todo-cluster
```

### Alternatives Considered
- **GKE**: More features but requires Google Cloud expertise
- **AKS**: Good Azure integration but more complex networking
- **EKS**: AWS complexity, not needed for hackathon

---

## 8. Ingress Controller

### Decision: nginx-ingress

### Rationale
- **Industry standard** - most widely used
- **Excellent docs** - many examples available
- **cert-manager integration** - automatic TLS
- **Simple configuration** - annotation-based

### Installation Verified
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace
```

### Alternatives Considered
- **Traefik**: Good but less documentation
- **Kong**: Overkill for this use case
- **DigitalOcean Ingress**: Less flexible

---

## 9. TLS Certificate Management

### Decision: cert-manager with Let's Encrypt

### Rationale
- **Free certificates** - no cost for TLS
- **Automatic renewal** - no manual intervention
- **Standard approach** - widely documented
- **ACME protocol** - industry standard

### Configuration Verified
```yaml
# ClusterIssuer for Let's Encrypt Production
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

---

## 10. CI/CD Platform

### Decision: GitHub Actions

### Rationale
- **Integrated with repo** - no external service needed
- **Free for public repos** - 2000 minutes/month for private
- **Matrix builds** - parallel service builds
- **Environment secrets** - secure credential storage

### Workflow Pattern Verified
```yaml
name: Build and Push
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, backend, notification, recurring]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: ${{ env.REGISTRY }}/${{ matrix.service }}:${{ github.sha }}
```

### Alternatives Considered
- **GitLab CI**: Good but separate platform
- **CircleCI**: Adds another service to manage
- **Jenkins**: Self-hosted, too much overhead

---

## Summary of Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Message Broker | Redpanda | Kafka-compatible, simple, lightweight |
| Kafka Client | aiokafka | Native async, pure Python |
| Dapr Integration | dapr-client SDK | Type safety, simpler code |
| Scheduler | APScheduler | Lightweight, async support |
| Email | SMTP (SendGrid) | Universal, free tier |
| Date Library | python-dateutil | Handles edge cases |
| Cloud Provider | DigitalOcean | Simple, free credits |
| Ingress | nginx-ingress | Standard, well-documented |
| TLS | cert-manager | Free, automatic |
| CI/CD | GitHub Actions | Integrated, free |

---

## Unresolved Items

None - all NEEDS CLARIFICATION items have been resolved through research.

## Next Steps

1. Proceed to Phase 1: Design & Contracts
2. Create data-model.md with entity definitions
3. Create contracts/ with event schemas and API extensions
4. Create quickstart.md with setup instructions

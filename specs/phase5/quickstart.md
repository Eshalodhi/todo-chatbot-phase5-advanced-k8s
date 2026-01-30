# Quickstart: Phase V Local Development

**Date**: 2026-01-28
**Plan**: [plan.md](./plan.md)

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Verify Command | Install |
|------|---------|----------------|---------|
| Docker Desktop | 4.x+ | `docker --version` | [Install](https://www.docker.com/products/docker-desktop) |
| Minikube | 1.32+ | `minikube version` | `choco install minikube` |
| kubectl | 1.28+ | `kubectl version --client` | `choco install kubernetes-cli` |
| Helm | 3.x+ | `helm version` | `choco install kubernetes-helm` |
| Dapr CLI | 1.12+ | `dapr --version` | [Install](https://docs.dapr.io/getting-started/install-dapr-cli/) |
| Python | 3.11+ | `python --version` | [Install](https://www.python.org/downloads/) |
| Node.js | 20+ | `node --version` | `choco install nodejs-lts` |

## Quick Setup (All-in-One)

```bash
# Clone and navigate to project
cd phase_II

# Run setup script (if available)
./scripts/local-setup.sh

# Or follow manual steps below
```

## Manual Setup Steps

### 1. Start Infrastructure

```bash
# Start Minikube (if not running)
minikube start --cpus=2 --memory=4096 --driver=docker

# Verify Minikube is running
minikube status

# Start Redpanda (Kafka) via Docker Compose
docker-compose -f docker-compose.redpanda.yml up -d

# Verify Redpanda is running
docker logs redpanda
# Visit http://localhost:8081 for Redpanda Console
```

### 2. Install Dapr

```bash
# Initialize Dapr on Minikube
dapr init -k --wait

# Verify Dapr is running
dapr status -k

# Expected output: dapr-operator, dapr-sidecar-injector, dapr-placement all Running
```

### 3. Build Docker Images

```bash
# Build all images locally
docker build -t todo-frontend:local ./frontend
docker build -t todo-backend:local ./backend
docker build -t todo-notification:local ./services/notification
docker build -t todo-recurring:local ./services/recurring

# Load images into Minikube
minikube image load todo-frontend:local
minikube image load todo-backend:local
minikube image load todo-notification:local
minikube image load todo-recurring:local

# Verify images are loaded
minikube image list | grep todo
```

### 4. Create Kubernetes Resources

```bash
# Create namespace
kubectl create namespace todo-app

# Apply Dapr components
kubectl apply -f dapr/ -n todo-app

# Verify Dapr components
kubectl get components -n todo-app
```

### 5. Deploy Application

```bash
# Deploy with Helm
helm install todo-release ./helm/todo-chatbot \
  -n todo-app \
  -f ./helm/todo-chatbot/values-dev.yaml \
  --set image.pullPolicy=Never \
  --set image.frontend.tag=local \
  --set image.backend.tag=local \
  --set image.notification.tag=local \
  --set image.recurring.tag=local

# Watch pods come up
kubectl get pods -n todo-app -w

# Wait for all pods to be Running (2/2 Ready - includes Dapr sidecar)
```

### 6. Access Application

```bash
# Option 1: Minikube service (opens browser automatically)
minikube service frontend -n todo-app

# Option 2: Port forward
kubectl port-forward svc/frontend 3000:3000 -n todo-app &
kubectl port-forward svc/backend 8000:8000 -n todo-app &

# Access at http://localhost:3000
```

## Verification Checklist

Run these checks to verify everything is working:

### Infrastructure
- [ ] `minikube status` shows Running
- [ ] `docker ps` shows redpanda container
- [ ] http://localhost:8081 shows Redpanda Console
- [ ] `dapr status -k` shows all components Running

### Application
- [ ] `kubectl get pods -n todo-app` shows all pods 2/2 Ready
- [ ] Frontend loads in browser
- [ ] Can log in with existing credentials
- [ ] Chat interface loads

### Event Flow
- [ ] Create a task via chat → Check Redpanda Console for task.created event
- [ ] Set a reminder → Check reminder.scheduled event
- [ ] Complete a recurring task → Verify new task auto-created

## Common Commands

### Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n todo-app

# Notification service logs
kubectl logs -f deployment/notification -n todo-app

# Recurring task service logs
kubectl logs -f deployment/recurring -n todo-app

# Dapr sidecar logs
kubectl logs -f deployment/backend -n todo-app -c daprd
```

### Debugging
```bash
# Get pod events
kubectl describe pod -l app=backend -n todo-app

# Access shell
kubectl exec -it deployment/backend -n todo-app -- /bin/sh

# View all events in namespace
kubectl get events -n todo-app --sort-by='.lastTimestamp'

# Open Minikube dashboard
minikube dashboard
```

### Restart Services
```bash
# Restart a specific deployment
kubectl rollout restart deployment/backend -n todo-app

# Restart all deployments
kubectl rollout restart deployment -n todo-app

# Force recreate pods
kubectl delete pods -l app=backend -n todo-app
```

## Cleanup

### Reset Application (Keep Infra)
```bash
# Uninstall Helm release
helm uninstall todo-release -n todo-app

# Delete namespace (removes everything in it)
kubectl delete namespace todo-app
```

### Full Cleanup
```bash
# Stop Redpanda
docker-compose -f docker-compose.redpanda.yml down -v

# Stop Minikube
minikube stop

# Delete Minikube (removes all data)
minikube delete
```

## Environment Variables

Create `.env` file for local development (not for K8s):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# Auth
BETTER_AUTH_SECRET=your-secret-key

# AI
OPENAI_API_KEY=sk-your-key

# Kafka (for local non-K8s testing)
KAFKA_BROKERS=localhost:9092

# Email (for local testing)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key
```

## Troubleshooting

### Pods stuck in Pending
```bash
# Check resources
kubectl describe node minikube

# Increase Minikube resources
minikube stop
minikube start --cpus=4 --memory=8192
```

### Dapr sidecar not injecting
```bash
# Check namespace has Dapr annotation
kubectl get namespace todo-app -o yaml

# Ensure Dapr is installed
dapr status -k

# Check deployment has Dapr annotations
kubectl get deployment backend -n todo-app -o yaml | grep dapr
```

### Events not flowing
```bash
# Check Redpanda is accessible from Minikube
kubectl run test-kafka --rm -i --tty --image=redpandadata/redpanda:latest -- \
  rpk topic list --brokers host.docker.internal:9092

# Check Dapr pub/sub component
kubectl describe component pubsub-kafka -n todo-app
```

### Image pull errors
```bash
# Ensure images are loaded in Minikube
minikube image list | grep todo

# Check imagePullPolicy is Never for local images
kubectl get deployment backend -n todo-app -o yaml | grep -A2 image
```

## Next Steps

After local development is working:

1. **Run tests**: `pytest backend/tests/` and `npm test` in frontend/
2. **Test event flow**: Create tasks, set reminders, complete recurring tasks
3. **Check Redpanda Console**: Verify events are being published
4. **Proceed to Stage 4**: Deploy to cloud Kubernetes

See [plan.md](./plan.md) for full implementation roadmap.

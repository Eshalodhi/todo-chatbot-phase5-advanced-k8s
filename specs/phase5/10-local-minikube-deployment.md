# Feature Specification: Local Minikube Deployment

**Feature Branch**: `phase5-local-minikube-deployment`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Local development environment with Minikube, Redpanda Docker, and Dapr for testing event-driven architecture

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Local Development Environment (Priority: P1)

As a developer, I want to start a complete local Kubernetes environment so I can develop and test all Phase V features.

**Why this priority**: Foundation for all local development - must work first.

**Independent Test**: Run setup commands, verify all components start successfully.

**Acceptance Scenarios**:

1. **Given** Docker and Minikube are installed, **When** I run the setup script, **Then** Minikube cluster starts.
2. **Given** Minikube is running, **When** I check status, **Then** all system pods are healthy.
3. **Given** setup completes, **When** I run `kubectl get pods -A`, **Then** I see kube-system pods running.
4. **Given** Dapr is installed, **When** I check Dapr status, **Then** Dapr control plane pods are running.

---

### User Story 2 - Run Redpanda Locally (Priority: P1)

As a developer, I want Redpanda running locally so I can test event publishing and consuming.

**Why this priority**: Required for event-driven features - Kafka-compatible broker is essential.

**Independent Test**: Start Redpanda, publish test event, consume and verify.

**Acceptance Scenarios**:

1. **Given** Docker Compose file exists, **When** I run `docker-compose up -d redpanda`, **Then** Redpanda starts.
2. **Given** Redpanda is running, **When** I access admin console (port 8081), **Then** I see cluster information.
3. **Given** Redpanda is healthy, **When** I create a topic, **Then** topic appears in the console.
4. **Given** a topic exists, **When** I publish/consume via CLI, **Then** messages flow correctly.

---

### User Story 3 - Deploy Application to Minikube (Priority: P1)

As a developer, I want to deploy all services to Minikube so I can test the complete system locally.

**Why this priority**: Full local testing - validates entire architecture.

**Independent Test**: Deploy all services, access frontend, verify chat works.

**Acceptance Scenarios**:

1. **Given** images are built locally, **When** I load them into Minikube, **Then** Minikube can access them.
2. **Given** images are loaded, **When** I run Helm install, **Then** all pods start successfully.
3. **Given** services are running, **When** I access the frontend, **Then** the application loads.
4. **Given** the application is loaded, **When** I create a task via chat, **Then** the task appears in my list.

---

### User Story 4 - Test Event-Driven Flow Locally (Priority: P1)

As a developer, I want to verify event-driven features work locally so I have confidence before deploying.

**Why this priority**: Validates Phase V core functionality - catches issues early.

**Independent Test**: Complete recurring task, verify Recurring Task Service creates next instance.

**Acceptance Scenarios**:

1. **Given** all services are running, **When** I complete a recurring task, **Then** task.completed event is published.
2. **Given** event is published, **When** Recurring Task Service processes it, **Then** new task is created.
3. **Given** I set a reminder, **When** reminder time passes, **Then** notification service processes it.
4. **Given** I check Redpanda console, **When** viewing topics, **Then** I see events published.

---

### User Story 5 - Debug Services Locally (Priority: P2)

As a developer, I want to view logs and debug services so I can troubleshoot issues.

**Why this priority**: Developer productivity - essential for efficient debugging.

**Independent Test**: Introduce error, view logs, identify issue.

**Acceptance Scenarios**:

1. **Given** services are running, **When** I run `kubectl logs`, **Then** I see service logs.
2. **Given** I need to debug, **When** I run `kubectl exec`, **Then** I can access the container shell.
3. **Given** I want to see events, **When** I run `kubectl describe pod`, **Then** I see pod events and status.
4. **Given** Minikube dashboard is enabled, **When** I access it, **Then** I see all resources visually.

---

### User Story 6 - Reset Local Environment (Priority: P2)

As a developer, I want to reset my local environment so I can start fresh when needed.

**Why this priority**: Clean slate for testing - removes accumulated state.

**Independent Test**: Run reset commands, verify clean state.

**Acceptance Scenarios**:

1. **Given** I want to start fresh, **When** I delete the namespace, **Then** all resources are removed.
2. **Given** I want to remove everything, **When** I stop Minikube and Redpanda, **Then** no containers run.
3. **Given** I want to keep Minikube, **When** I reinstall only the application, **Then** previous data is cleared.
4. **Given** I restart after reset, **When** deploying again, **Then** everything works correctly.

---

### Edge Cases

- What if Docker Desktop isn't running? (Fail fast with clear error)
- What if port 9092 is already in use? (Detect conflict, suggest resolution)
- What if Minikube runs out of memory? (Increase limit or reduce replica count)
- What if image build fails locally? (Report error, suggest fixes)
- What if Dapr components fail to initialize? (Check component YAML, broker connection)

## Requirements *(mandatory)*

### Functional Requirements

**Prerequisites**:
- **FR-001**: System MUST document required tools: Docker Desktop, Minikube, kubectl, Helm, dapr CLI
- **FR-002**: System MUST provide verification commands for each prerequisite
- **FR-003**: System MUST support Windows, macOS, and Linux development machines

**Minikube Setup**:
- **FR-004**: Minikube MUST be configured with minimum 4GB memory, 2 CPUs
- **FR-005**: Minikube MUST enable metrics-server addon
- **FR-006**: Minikube MUST support loading local Docker images

**Redpanda Setup**:
- **FR-007**: Redpanda MUST run via Docker Compose (separate from Minikube)
- **FR-008**: Redpanda MUST be accessible from Minikube pods (host.docker.internal or IP)
- **FR-009**: Redpanda admin console MUST be available on port 8081
- **FR-010**: Docker Compose MUST include topic auto-creation or setup script

**Dapr Setup**:
- **FR-011**: Dapr MUST be installed in Minikube cluster (`dapr init -k`)
- **FR-012**: Dapr components MUST be configured for local Redpanda
- **FR-013**: Dapr state store MUST use Neon PostgreSQL (existing cloud database)
- **FR-014**: Local secrets MUST use environment variables or ConfigMap

**Application Deployment**:
- **FR-015**: Images MUST be built locally with Docker
- **FR-016**: Images MUST be loaded into Minikube (`minikube image load`)
- **FR-017**: Helm MUST use `values-dev.yaml` for local deployment
- **FR-018**: Services MUST use NodePort or port-forward for access

**Developer Experience**:
- **FR-019**: System MUST provide a single setup script for initial configuration
- **FR-020**: System MUST provide commands for common operations (deploy, logs, reset)
- **FR-021**: System MUST document troubleshooting steps for common issues

### Key Entities

- **Minikube Cluster**: Local single-node Kubernetes cluster
- **Redpanda Container**: Kafka-compatible broker in Docker
- **Dapr Control Plane**: Dapr system pods in Minikube
- **Application Services**: Frontend, Backend, Notification, Recurring in Minikube
- **Developer Scripts**: Shell scripts for common operations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fresh environment setup completes in under 15 minutes
- **SC-002**: Application deployment completes in under 5 minutes
- **SC-003**: All services reach Running state within 2 minutes of deployment
- **SC-004**: Event flow (create → publish → consume) works end-to-end
- **SC-005**: Developer can access application frontend in browser
- **SC-006**: Logs are accessible via kubectl within 10 seconds
- **SC-007**: Environment reset completes in under 2 minutes
- **SC-008**: Local environment uses less than 8GB memory total

## Assumptions

- Developer has Docker Desktop installed and running
- Developer has at least 8GB RAM available for development
- Network allows outbound connections to Neon PostgreSQL
- Developer has basic familiarity with Kubernetes concepts
- Host machine supports virtualization (for Minikube)

## Configuration Reference

### Prerequisites Check
```bash
# Check Docker
docker --version

# Check Minikube
minikube version

# Check kubectl
kubectl version --client

# Check Helm
helm version

# Check Dapr CLI
dapr --version
```

### Minikube Setup
```bash
# Start Minikube with resources
minikube start --cpus=2 --memory=4096 --driver=docker

# Enable addons
minikube addons enable metrics-server
minikube addons enable dashboard

# Verify status
minikube status
kubectl get nodes
```

### Redpanda Docker Compose (docker-compose.redpanda.yml)
```yaml
version: '3.8'
services:
  redpanda:
    image: redpandadata/redpanda:latest
    container_name: redpanda
    command:
      - redpanda start
      - --smp 1
      - --memory 1G
      - --reserve-memory 0M
      - --overprovisioned
      - --node-id 0
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://host.docker.internal:9092
    ports:
      - "9092:9092"
      - "8081:8081"
      - "8082:8082"
    volumes:
      - redpanda-data:/var/lib/redpanda/data

volumes:
  redpanda-data:
```

### Start Redpanda
```bash
docker-compose -f docker-compose.redpanda.yml up -d

# Verify
docker logs redpanda

# Access console
# http://localhost:8081
```

### Build and Load Images
```bash
# Build images
docker build -t todo-frontend:local ./frontend
docker build -t todo-backend:local ./backend
docker build -t todo-notification:local ./services/notification
docker build -t todo-recurring:local ./services/recurring

# Load into Minikube
minikube image load todo-frontend:local
minikube image load todo-backend:local
minikube image load todo-notification:local
minikube image load todo-recurring:local

# Verify
minikube image list | grep todo
```

### Install Dapr
```bash
# Install Dapr in cluster
dapr init -k --wait

# Verify
dapr status -k
kubectl get pods -n dapr-system
```

### Deploy Dapr Components
```bash
# Apply local Dapr components
kubectl apply -f dapr/pubsub-kafka-local.yaml
kubectl apply -f dapr/statestore.yaml
kubectl apply -f dapr/secrets-local.yaml
```

### Dapr Pub/Sub for Local (dapr/pubsub-kafka-local.yaml)
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
      value: "host.docker.internal:9092"  # Access Redpanda from Minikube
    - name: consumerGroup
      value: "todo-app-local"
    - name: authType
      value: "none"
```

### Deploy Application
```bash
# Create namespace
kubectl create namespace todo-app

# Deploy with Helm
helm install todo-release ./helm/todo-chatbot \
  -n todo-app \
  -f ./helm/todo-chatbot/values-dev.yaml \
  --set image.pullPolicy=Never \
  --set image.frontend.tag=local \
  --set image.backend.tag=local \
  --set image.notification.tag=local \
  --set image.recurring.tag=local

# Watch deployment
kubectl get pods -n todo-app -w
```

### Access Application
```bash
# Option 1: Minikube service (opens browser)
minikube service frontend -n todo-app

# Option 2: Port forward
kubectl port-forward svc/frontend 3000:3000 -n todo-app
kubectl port-forward svc/backend 8000:8000 -n todo-app

# Access at http://localhost:3000
```

### Debugging Commands
```bash
# View logs
kubectl logs -f deployment/backend -n todo-app
kubectl logs -f deployment/notification -n todo-app

# Check Dapr sidecar logs
kubectl logs -f deployment/backend -n todo-app -c daprd

# Access shell
kubectl exec -it deployment/backend -n todo-app -- /bin/sh

# View events
kubectl get events -n todo-app --sort-by='.lastTimestamp'

# Minikube dashboard
minikube dashboard
```

### Reset Environment
```bash
# Remove application
helm uninstall todo-release -n todo-app
kubectl delete namespace todo-app

# Stop Redpanda
docker-compose -f docker-compose.redpanda.yml down -v

# Stop Minikube (keeps data)
minikube stop

# Delete Minikube (removes everything)
minikube delete
```

### Quick Start Script (scripts/local-setup.sh)
```bash
#!/bin/bash
set -e

echo "Starting local development environment..."

# Start Minikube
minikube start --cpus=2 --memory=4096 --driver=docker
minikube addons enable metrics-server

# Start Redpanda
docker-compose -f docker-compose.redpanda.yml up -d

# Install Dapr
dapr init -k --wait

# Build images
docker build -t todo-frontend:local ./frontend
docker build -t todo-backend:local ./backend
docker build -t todo-notification:local ./services/notification
docker build -t todo-recurring:local ./services/recurring

# Load images
minikube image load todo-frontend:local
minikube image load todo-backend:local
minikube image load todo-notification:local
minikube image load todo-recurring:local

# Deploy
kubectl create namespace todo-app || true
kubectl apply -f dapr/ -n todo-app
helm install todo-release ./helm/todo-chatbot -n todo-app -f ./helm/todo-chatbot/values-dev.yaml --set image.pullPolicy=Never

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n todo-app --timeout=120s

echo "Environment ready! Access at:"
minikube service frontend -n todo-app --url
```

# Infrastructure Model: Phase IV Local Kubernetes Deployment

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-20
**Purpose**: Define container and Kubernetes resource specifications

## Container Images

### Frontend Image: todo-frontend

| Attribute | Value |
|-----------|-------|
| Name | todo-frontend |
| Tag | 1.0.0 |
| Base Image | node:20-alpine |
| Build Type | Multi-stage |
| Exposed Port | 3000 |
| User | nextjs (UID 1001) |
| Health Check | HTTP GET / |
| Working Directory | /app |

**Build Context**: `./frontend`

**Environment Variables** (at runtime):
| Variable | Source | Required |
|----------|--------|----------|
| NEXT_PUBLIC_API_URL | ConfigMap | Yes |
| NODE_ENV | Hardcoded (production) | No |

**Expected Size**: < 200MB (standalone output)

---

### Backend Image: todo-backend

| Attribute | Value |
|-----------|-------|
| Name | todo-backend |
| Tag | 1.0.0 |
| Base Image | python:3.11-slim |
| Build Type | Multi-stage |
| Exposed Port | 8000 |
| User | appuser (UID 1000) |
| Health Check | HTTP GET /health |
| Working Directory | /app |

**Build Context**: `./backend`

**Environment Variables** (at runtime):
| Variable | Source | Required |
|----------|--------|----------|
| DATABASE_URL | Secret | Yes |
| COHERE_API_KEY | Secret | Yes |
| BETTER_AUTH_SECRET | Secret | Yes |
| API_HOST | ConfigMap | Yes |
| LOG_LEVEL | ConfigMap | No |

**Expected Size**: < 300MB

---

## Kubernetes Resources

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: todo-app
  labels:
    name: todo-app
    environment: local
```

---

### ConfigMap: todo-config

| Key | Default Value | Description |
|-----|---------------|-------------|
| API_HOST | 0.0.0.0 | Backend bind address |
| API_PORT | 8000 | Backend port |
| LOG_LEVEL | info | Logging verbosity |
| ENVIRONMENT | production | Runtime environment |
| NEXT_PUBLIC_API_URL | http://todo-backend:8000 | Backend URL for frontend |

---

### Secret: todo-secrets

| Key | Description | Encoding |
|-----|-------------|----------|
| DATABASE_URL | Neon PostgreSQL connection string | base64 |
| COHERE_API_KEY | Cohere API authentication | base64 |
| BETTER_AUTH_SECRET | JWT signing secret | base64 |

**Note**: Actual values must be provided at deployment time. Never commit real secrets.

---

### Deployment: todo-frontend

| Attribute | Value |
|-----------|-------|
| Name | todo-frontend |
| Namespace | todo-app |
| Replicas | 2 |
| Image | todo-frontend:1.0.0 |
| Image Pull Policy | IfNotPresent |
| Container Port | 3000 |

**Labels**:
- app: todo-frontend
- component: frontend
- tier: web

**Resource Requests**:
| Resource | Value |
|----------|-------|
| CPU | 250m |
| Memory | 256Mi |

**Resource Limits**:
| Resource | Value |
|----------|-------|
| CPU | 500m |
| Memory | 512Mi |

**Liveness Probe**:
| Setting | Value |
|---------|-------|
| Type | HTTP GET |
| Path | / |
| Port | 3000 |
| Initial Delay | 30s |
| Period | 10s |
| Timeout | 5s |
| Failure Threshold | 3 |

**Readiness Probe**:
| Setting | Value |
|---------|-------|
| Type | HTTP GET |
| Path | / |
| Port | 3000 |
| Initial Delay | 5s |
| Period | 5s |
| Timeout | 3s |
| Failure Threshold | 3 |

**Environment From**:
- ConfigMap: todo-config

---

### Deployment: todo-backend

| Attribute | Value |
|-----------|-------|
| Name | todo-backend |
| Namespace | todo-app |
| Replicas | 2 |
| Image | todo-backend:1.0.0 |
| Image Pull Policy | IfNotPresent |
| Container Port | 8000 |

**Labels**:
- app: todo-backend
- component: backend
- tier: api

**Resource Requests**:
| Resource | Value |
|----------|-------|
| CPU | 500m |
| Memory | 512Mi |

**Resource Limits**:
| Resource | Value |
|----------|-------|
| CPU | 1000m |
| Memory | 1Gi |

**Liveness Probe**:
| Setting | Value |
|---------|-------|
| Type | HTTP GET |
| Path | /health |
| Port | 8000 |
| Initial Delay | 30s |
| Period | 10s |
| Timeout | 5s |
| Failure Threshold | 3 |

**Readiness Probe**:
| Setting | Value |
|---------|-------|
| Type | HTTP GET |
| Path | /health |
| Port | 8000 |
| Initial Delay | 5s |
| Period | 5s |
| Timeout | 3s |
| Failure Threshold | 3 |

**Environment From**:
- ConfigMap: todo-config
- Secret: todo-secrets

---

### Service: todo-frontend

| Attribute | Value |
|-----------|-------|
| Name | todo-frontend |
| Namespace | todo-app |
| Type | NodePort |
| Port | 80 |
| Target Port | 3000 |
| Node Port | 30080 |
| Protocol | TCP |

**Selector**:
- app: todo-frontend

**Access**:
- Internal: `http://todo-frontend.todo-app.svc.cluster.local:80`
- External: `http://<minikube-ip>:30080`
- Via Minikube: `minikube service todo-frontend -n todo-app`

---

### Service: todo-backend

| Attribute | Value |
|-----------|-------|
| Name | todo-backend |
| Namespace | todo-app |
| Type | ClusterIP |
| Port | 8000 |
| Target Port | 8000 |
| Protocol | TCP |

**Selector**:
- app: todo-backend

**Access**:
- Internal: `http://todo-backend.todo-app.svc.cluster.local:8000`
- From Frontend: `http://todo-backend:8000`
- External: Not directly accessible (by design)

---

## Helm Chart Structure

### Chart.yaml

```yaml
apiVersion: v2
name: todo-chatbot
description: Phase IV Todo Chatbot with AI-powered task management
type: application
version: 0.1.0
appVersion: "1.0.0"
keywords:
  - todo
  - chatbot
  - kubernetes
  - phase-iv
maintainers:
  - name: Developer
```

### values.yaml Schema

```yaml
# Namespace
namespace: todo-app

# Frontend Configuration
frontend:
  image:
    repository: todo-frontend
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicas: 2
  service:
    type: NodePort
    port: 80
    targetPort: 3000
    nodePort: 30080
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  probes:
    liveness:
      path: /
      initialDelaySeconds: 30
      periodSeconds: 10
    readiness:
      path: /
      initialDelaySeconds: 5
      periodSeconds: 5

# Backend Configuration
backend:
  image:
    repository: todo-backend
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicas: 2
  service:
    type: ClusterIP
    port: 8000
    targetPort: 8000
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  probes:
    liveness:
      path: /health
      initialDelaySeconds: 30
      periodSeconds: 10
    readiness:
      path: /health
      initialDelaySeconds: 5
      periodSeconds: 5

# ConfigMap Data
config:
  apiHost: "0.0.0.0"
  apiPort: "8000"
  logLevel: "info"
  environment: "production"
  nextPublicApiUrl: "http://todo-backend:8000"

# Secrets (base64 encoded values)
secrets:
  # Set these via --set or values file
  databaseUrl: ""
  cohereApiKey: ""
  betterAuthSecret: ""
```

---

## Resource Topology

```
todo-app (namespace)
│
├── ConfigMap: todo-config
│   └── [environment variables]
│
├── Secret: todo-secrets
│   └── [sensitive credentials]
│
├── Deployment: todo-frontend
│   ├── ReplicaSet (2 pods)
│   │   ├── Pod: todo-frontend-xxx
│   │   └── Pod: todo-frontend-yyy
│   └── envFrom: todo-config
│
├── Deployment: todo-backend
│   ├── ReplicaSet (2 pods)
│   │   ├── Pod: todo-backend-xxx
│   │   └── Pod: todo-backend-yyy
│   └── envFrom: todo-config, todo-secrets
│
├── Service: todo-frontend (NodePort)
│   └── Endpoints: todo-frontend pods
│
└── Service: todo-backend (ClusterIP)
    └── Endpoints: todo-backend pods
```

---

## Network Flow

```
User Browser
     │
     ▼ (port 30080)
NodePort Service: todo-frontend
     │
     ▼ (port 80 → 3000)
Frontend Pod (Next.js)
     │
     ▼ (NEXT_PUBLIC_API_URL)
ClusterIP Service: todo-backend
     │
     ▼ (port 8000)
Backend Pod (FastAPI)
     │
     ▼ (DATABASE_URL)
Neon PostgreSQL (External)
```

---

## Security Context

### Pod Security (Frontend)

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
```

### Container Security (Frontend)

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

### Pod Security (Backend)

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
```

### Container Security (Backend)

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: false  # Python may need write access
  capabilities:
    drop:
      - ALL
```

---

## Resource Summary

| Resource Type | Count | Names |
|---------------|-------|-------|
| Namespace | 1 | todo-app |
| ConfigMap | 1 | todo-config |
| Secret | 1 | todo-secrets |
| Deployment | 2 | todo-frontend, todo-backend |
| Service | 2 | todo-frontend, todo-backend |
| Pod (total) | 4 | 2 frontend + 2 backend |

**Total CPU Requests**: 1500m (1.5 cores)
**Total CPU Limits**: 3000m (3 cores)
**Total Memory Requests**: 1536Mi (~1.5 GB)
**Total Memory Limits**: 3072Mi (~3 GB)

**Minikube Recommended**: `--cpus=4 --memory=8192`

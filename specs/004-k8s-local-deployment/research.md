# Research Notes: Phase IV Local Kubernetes Deployment

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-20
**Purpose**: Document AI tools capabilities, Kubernetes patterns, and implementation guidance

## AI DevOps Tools Research

### Gordon (Docker AI Agent)

**Availability**: Docker Desktop 4.53+ (Beta feature)

**Enabling Gordon**:
1. Open Docker Desktop
2. Navigate to Settings (gear icon)
3. Select "Beta features" tab
4. Toggle "Docker AI Agent (Gordon)" to ON
5. Restart Docker Desktop if prompted

**Verification**:
```bash
docker ai "What can you do?"
```

**Useful Commands for Phase IV**:

| Task | Gordon Command |
|------|----------------|
| Generate Next.js Dockerfile | `docker ai "Create optimized multi-stage Dockerfile for Next.js 14 production app with standalone output"` |
| Generate FastAPI Dockerfile | `docker ai "Create multi-stage Dockerfile for FastAPI with Python 3.11 and uvicorn"` |
| Optimize image size | `docker ai "Optimize this Dockerfile for smaller image size"` |
| Security analysis | `docker ai "Analyze security vulnerabilities in this Dockerfile"` |
| Add health check | `docker ai "Add health check to this Dockerfile"` |
| Non-root user | `docker ai "Configure this Dockerfile to run as non-root user"` |

**Fallback Strategy**:
If Gordon is unavailable (region restrictions, older Docker Desktop, disabled):
- Use manual Dockerfile templates from `.claude/skills/docker-gordon/SKILL.md`
- Reference Next.js and FastAPI official documentation for Dockerfile patterns
- Multi-stage build patterns are well-documented in Docker documentation

---

### kubectl-ai

**Installation**:
```bash
# Install Krew (kubectl plugin manager) first
kubectl krew install ai

# Set API key
export OPENAI_API_KEY="sk-your-api-key"
```

**Useful Commands for Phase IV**:

| Task | kubectl-ai Command |
|------|-------------------|
| Create deployment | `kubectl ai "create deployment for Next.js frontend with 2 replicas and health probes"` |
| Create service | `kubectl ai "create NodePort service for frontend exposing port 3000 on nodePort 30080"` |
| Create configmap | `kubectl ai "create configmap with API_HOST=0.0.0.0 and LOG_LEVEL=info"` |
| Scale deployment | `kubectl ai "scale frontend deployment to 3 replicas"` |
| Check pod issues | `kubectl ai "check why pods in todo-app namespace are failing"` |
| Resource usage | `kubectl ai "show resource usage for all pods in todo-app"` |
| Generate YAML | `kubectl ai "create deployment yaml for node app" --raw` |

**Best Practices**:
- Use `--require-confirmation` for destructive actions
- Use `--raw` to preview YAML before applying
- Be specific in prompts for better results
- Always include namespace context

**Fallback Strategy**:
If kubectl-ai is unavailable (no API key, installation issues):
- Use standard kubectl commands
- Reference `.claude/skills/kubectl-ai-ops/SKILL.md` for command equivalents
- Manual YAML writing is straightforward for basic resources

---

### Kagent

**Installation**:
```bash
# Download from GitHub releases
# Or via Go
go install github.com/kagent-dev/kagent@latest
```

**Useful Commands for Phase IV**:

| Task | Kagent Command |
|------|----------------|
| Cluster health | `kagent "analyze cluster health"` |
| Resource optimization | `kagent "optimize resource allocation for todo-app namespace"` |
| Performance analysis | `kagent "identify performance bottlenecks"` |
| Security audit | `kagent "audit security posture of todo-app"` |
| Cost analysis | `kagent "analyze resource efficiency"` |

**Fallback Strategy**:
If Kagent is unavailable:
- Use `kubectl top pods` for resource metrics
- Use `kubectl describe pod` for detailed status
- Use `kubectl get events` for cluster events
- Use `minikube dashboard` for visual monitoring

---

## Docker Multi-Stage Build Patterns

### Next.js Multi-Stage Build

**Pattern**: Dependencies → Build → Production

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Key Points**:
- `next.config.js` must have `output: 'standalone'`
- Non-root user (nextjs:nodejs) created and used
- Only production dependencies in final image
- Static assets copied separately

### FastAPI Multi-Stage Build

**Pattern**: Build → Production

```dockerfile
# Stage 1: Build
FROM python:3.11-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes
RUN pip install --no-cache-dir --target=/app/deps -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim AS runner
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /app/deps /usr/local/lib/python3.11/site-packages
COPY ./app ./app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key Points**:
- Poetry used for dependency management (if applicable)
- Requirements exported for pip install
- Non-root user (appuser) created and used
- Health check built into Dockerfile
- Slim base image for smaller size

---

## Kubernetes Resource Patterns

### Deployment with Probes and Resources

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-frontend
  namespace: todo-app
  labels:
    app: todo-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: todo-frontend
  template:
    metadata:
      labels:
        app: todo-frontend
    spec:
      containers:
        - name: frontend
          image: todo-frontend:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          envFrom:
            - configMapRef:
                name: todo-config
```

### Service Patterns

**NodePort** (External Access):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-frontend
  namespace: todo-app
spec:
  type: NodePort
  selector:
    app: todo-frontend
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080
```

**ClusterIP** (Internal Only):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-backend
  namespace: todo-app
spec:
  type: ClusterIP
  selector:
    app: todo-backend
  ports:
    - port: 8000
      targetPort: 8000
```

### ConfigMap and Secret

**ConfigMap** (Non-sensitive):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-config
  namespace: todo-app
data:
  API_HOST: "0.0.0.0"
  LOG_LEVEL: "info"
  ENVIRONMENT: "production"
```

**Secret** (Sensitive - base64 encoded):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-secrets
  namespace: todo-app
type: Opaque
data:
  DATABASE_URL: <base64-encoded-value>
  COHERE_API_KEY: <base64-encoded-value>
  BETTER_AUTH_SECRET: <base64-encoded-value>
```

---

## Helm Chart Patterns

### values.yaml Structure

```yaml
# Image configuration
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

backend:
  image:
    repository: todo-backend
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicas: 2
  service:
    type: ClusterIP
    port: 8000
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Configuration
config:
  apiHost: "0.0.0.0"
  logLevel: "info"
  environment: "production"

# Secrets (provide at install time)
secrets:
  databaseUrl: ""
  cohereApiKey: ""
  betterAuthSecret: ""
```

### Template Pattern

```yaml
# templates/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "todo-chatbot.fullname" . }}-frontend
  labels:
    {{- include "todo-chatbot.labels" . | nindent 4 }}
    component: frontend
spec:
  replicas: {{ .Values.frontend.replicas }}
  selector:
    matchLabels:
      {{- include "todo-chatbot.selectorLabels" . | nindent 6 }}
      component: frontend
  template:
    metadata:
      labels:
        {{- include "todo-chatbot.selectorLabels" . | nindent 8 }}
        component: frontend
    spec:
      containers:
        - name: frontend
          image: "{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"
          imagePullPolicy: {{ .Values.frontend.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.frontend.service.targetPort }}
          resources:
            {{- toYaml .Values.frontend.resources | nindent 12 }}
```

---

## Minikube Operations

### Starting Cluster

```bash
# Start with adequate resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable useful addons
minikube addons enable metrics-server
minikube addons enable dashboard
```

### Loading Images

```bash
# Load local Docker images to Minikube
minikube image load todo-frontend:1.0.0
minikube image load todo-backend:1.0.0

# Verify images are loaded
minikube image ls | grep todo
```

### Accessing Services

```bash
# Get service URL
minikube service todo-frontend -n todo-app --url

# Or open in browser directly
minikube service todo-frontend -n todo-app

# Alternative: port-forward
kubectl port-forward svc/todo-frontend 3000:80 -n todo-app
```

### Dashboard

```bash
minikube dashboard
```

---

## Troubleshooting Patterns

### Pod Issues

```bash
# Check pod status
kubectl get pods -n todo-app

# Describe pod for events
kubectl describe pod <pod-name> -n todo-app

# Check logs
kubectl logs <pod-name> -n todo-app

# Check previous logs (if restarting)
kubectl logs <pod-name> --previous -n todo-app

# Exec into container
kubectl exec -it <pod-name> -n todo-app -- /bin/sh
```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| ImagePullBackOff | Image not in Minikube | `minikube image load` |
| CrashLoopBackOff | Application error | Check logs, fix code |
| Pending | Insufficient resources | Increase Minikube resources |
| Probe failures | Wrong path or slow startup | Adjust probe config |
| Service no endpoints | Selector mismatch | Check labels match |

---

## References

- Docker Multi-Stage Builds: https://docs.docker.com/build/building/multi-stage/
- Next.js Docker: https://nextjs.org/docs/deployment#docker-image
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Helm Charts: https://helm.sh/docs/chart_template_guide/
- Minikube: https://minikube.sigs.k8s.io/docs/

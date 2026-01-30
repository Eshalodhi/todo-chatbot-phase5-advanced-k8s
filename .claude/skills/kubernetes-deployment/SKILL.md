# Kubernetes Deployment Manifests Skill

## Overview

This skill teaches Claude how to create Kubernetes deployment manifests for deploying containerized applications. It covers all essential resource types needed for Phase IV deployment of the Todo Chatbot application to a local Kubernetes cluster.

## Deployment YAML Structure

### Basic Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend
  namespace: todo-app
  labels:
    app: todo-backend
    tier: backend
    environment: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: todo-backend
  template:
    metadata:
      labels:
        app: todo-backend
        tier: backend
    spec:
      containers:
        - name: todo-backend
          image: todo-backend:1.0.0
          ports:
            - containerPort: 8000
              name: http
```

### Complete Deployment with All Options
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend
  namespace: todo-app
  labels:
    app: todo-backend
    tier: backend
    version: v1.0.0
  annotations:
    description: "Todo Chatbot Backend API"
    kubernetes.io/change-cause: "Initial deployment"
spec:
  replicas: 2
  revisionHistoryLimit: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: todo-backend
  template:
    metadata:
      labels:
        app: todo-backend
        tier: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
    spec:
      serviceAccountName: todo-backend-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: todo-backend
          image: todo-backend:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8000
              name: http
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: todo-secrets
                  key: database-url
            - name: API_HOST
              valueFrom:
                configMapKeyRef:
                  name: todo-config
                  key: api-host
          envFrom:
            - configMapRef:
                name: todo-config
            - secretRef:
                name: todo-secrets
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30
          volumeMounts:
            - name: config-volume
              mountPath: /app/config
              readOnly: true
            - name: tmp-volume
              mountPath: /tmp
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      volumes:
        - name: config-volume
          configMap:
            name: todo-config
        - name: tmp-volume
          emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: todo-backend
                topologyKey: kubernetes.io/hostname
      tolerations:
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 30
      terminationGracePeriodSeconds: 30
```

### Deployment Strategies

#### Rolling Update (Default)
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Max pods above desired count
      maxUnavailable: 25%  # Max pods unavailable during update
```

#### Recreate (Downtime Acceptable)
```yaml
spec:
  strategy:
    type: Recreate  # All old pods terminated before new ones created
```

## Service YAML Structure

### ClusterIP Service (Internal)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-backend
  namespace: todo-app
  labels:
    app: todo-backend
spec:
  type: ClusterIP
  selector:
    app: todo-backend
  ports:
    - name: http
      port: 80           # Service port
      targetPort: 8000   # Container port
      protocol: TCP
```

### NodePort Service (External via Node)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-frontend
  namespace: todo-app
  labels:
    app: todo-frontend
spec:
  type: NodePort
  selector:
    app: todo-frontend
  ports:
    - name: http
      port: 80
      targetPort: 3000
      nodePort: 30080    # Accessible on <NodeIP>:30080
      protocol: TCP
```

### LoadBalancer Service (Cloud/Minikube)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-frontend
  namespace: todo-app
  labels:
    app: todo-frontend
  annotations:
    # Cloud-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: todo-frontend
  ports:
    - name: http
      port: 80
      targetPort: 3000
      protocol: TCP
  # Optional: Restrict source IPs
  loadBalancerSourceRanges:
    - 10.0.0.0/8
```

### Headless Service (StatefulSets/DNS)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-database
  namespace: todo-app
spec:
  type: ClusterIP
  clusterIP: None  # Headless
  selector:
    app: todo-database
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
```

### Multi-Port Service
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
    - name: http
      port: 80
      targetPort: 8000
    - name: metrics
      port: 9090
      targetPort: 9090
    - name: grpc
      port: 50051
      targetPort: 50051
```

## ConfigMap for Environment Variables

### Basic ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-config
  namespace: todo-app
  labels:
    app: todo-app
data:
  # Simple key-value pairs
  API_HOST: "0.0.0.0"
  API_PORT: "8000"
  LOG_LEVEL: "info"
  ENVIRONMENT: "production"

  # Multi-line configuration file
  app.properties: |
    server.host=0.0.0.0
    server.port=8000
    log.level=info

  # JSON configuration
  config.json: |
    {
      "apiUrl": "http://backend:8000",
      "features": {
        "darkMode": true,
        "analytics": false
      }
    }
```

### Using ConfigMap in Pods

#### As Environment Variables
```yaml
spec:
  containers:
    - name: app
      env:
        # Single key
        - name: API_HOST
          valueFrom:
            configMapKeyRef:
              name: todo-config
              key: API_HOST
      # All keys as env vars
      envFrom:
        - configMapRef:
            name: todo-config
            optional: false
```

#### As Volume Mount
```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
  volumes:
    - name: config-volume
      configMap:
        name: todo-config
        # Optional: Select specific keys
        items:
          - key: config.json
            path: config.json
```

## Secret for Sensitive Data

### Creating Secrets

#### Opaque Secret (Generic)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-secrets
  namespace: todo-app
  labels:
    app: todo-app
type: Opaque
data:
  # Values must be base64 encoded
  database-url: cG9zdGdyZXM6Ly91c2VyOnBhc3NAZGI6NTQzMi90b2Rvcw==
  api-key: c2stdGVzdC1hcGkta2V5LTEyMzQ1
  jwt-secret: bXktc3VwZXItc2VjcmV0LWp3dC1rZXk=
stringData:
  # Plain text (auto-encoded)
  openai-api-key: "sk-your-openai-api-key"
```

#### Docker Registry Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: todo-app
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

#### TLS Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: todo-app
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

### Using Secrets in Pods

#### As Environment Variables
```yaml
spec:
  containers:
    - name: app
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: todo-secrets
              key: database-url
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: todo-secrets
              key: api-key
              optional: false
      envFrom:
        - secretRef:
            name: todo-secrets
```

#### As Volume Mount
```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: secrets-volume
          mountPath: /app/secrets
          readOnly: true
  volumes:
    - name: secrets-volume
      secret:
        secretName: todo-secrets
        defaultMode: 0400  # Read-only for owner
```

### Creating Secrets via kubectl
```bash
# From literal values
kubectl create secret generic todo-secrets \
  --from-literal=database-url='postgres://user:pass@db:5432/todos' \
  --from-literal=api-key='sk-test-key' \
  -n todo-app

# From file
kubectl create secret generic todo-secrets \
  --from-file=api-key=./api-key.txt \
  -n todo-app

# From .env file
kubectl create secret generic todo-secrets \
  --from-env-file=.env \
  -n todo-app

# Docker registry
kubectl create secret docker-registry registry-creds \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass \
  -n todo-app
```

## Resource Limits and Requests

### CPU and Memory
```yaml
spec:
  containers:
    - name: app
      resources:
        requests:
          cpu: 100m      # 0.1 CPU cores (100 millicores)
          memory: 128Mi  # 128 MiB
        limits:
          cpu: 500m      # 0.5 CPU cores
          memory: 512Mi  # 512 MiB
```

### Resource Units
| Resource | Units | Examples |
|----------|-------|----------|
| CPU | millicores (m) or cores | `100m`, `0.5`, `2` |
| Memory | bytes, Ki, Mi, Gi | `128Mi`, `1Gi`, `512000000` |

### Guidelines by Workload Type
```yaml
# Frontend (Next.js)
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Backend API (FastAPI)
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

# Database (PostgreSQL)
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

### Resource Quota (Namespace Level)
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: todo-app-quota
  namespace: todo-app
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    configmaps: "10"
    secrets: "10"
```

### Limit Range (Default Limits)
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: todo-app
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      min:
        cpu: 50m
        memory: 64Mi
      max:
        cpu: 2000m
        memory: 2Gi
```

## Liveness and Readiness Probes

### HTTP Probes
```yaml
spec:
  containers:
    - name: app
      livenessProbe:
        httpGet:
          path: /health
          port: 8000
          httpHeaders:
            - name: Custom-Header
              value: "health-check"
        initialDelaySeconds: 30  # Wait before first probe
        periodSeconds: 10        # Probe frequency
        timeoutSeconds: 5        # Probe timeout
        successThreshold: 1      # Successes to be healthy
        failureThreshold: 3      # Failures before unhealthy

      readinessProbe:
        httpGet:
          path: /ready
          port: 8000
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3

      startupProbe:
        httpGet:
          path: /health
          port: 8000
        initialDelaySeconds: 10
        periodSeconds: 5
        failureThreshold: 30     # 30 * 5 = 150s max startup time
```

### TCP Probes
```yaml
livenessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 15
  periodSeconds: 20
```

### Exec Probes
```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - pg_isready -U postgres
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Probe Types Comparison
| Probe | Purpose | Failure Action |
|-------|---------|----------------|
| Liveness | Is container running? | Restart container |
| Readiness | Can container serve traffic? | Remove from service endpoints |
| Startup | Has container started? | Block other probes until success |

## Labels and Selectors

### Standard Labels
```yaml
metadata:
  labels:
    # Recommended labels
    app.kubernetes.io/name: todo-backend
    app.kubernetes.io/instance: todo-backend-prod
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: todo-app
    app.kubernetes.io/managed-by: helm

    # Custom labels
    app: todo-backend
    tier: backend
    environment: production
    team: platform
```

### Label Selectors

#### Equality-Based
```yaml
selector:
  matchLabels:
    app: todo-backend
    tier: backend
```

#### Set-Based
```yaml
selector:
  matchExpressions:
    - key: app
      operator: In
      values:
        - todo-backend
        - todo-api
    - key: environment
      operator: NotIn
      values:
        - development
    - key: tier
      operator: Exists
```

### Service Discovery via Labels
```yaml
# Service selects pods with matching labels
apiVersion: v1
kind: Service
metadata:
  name: todo-backend
spec:
  selector:
    app: todo-backend
    tier: backend
  ports:
    - port: 80
      targetPort: 8000
```

## Namespace Management

### Creating Namespaces
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: todo-app
  labels:
    name: todo-app
    environment: production
  annotations:
    description: "Todo Chatbot Application"
```

### Namespace with Resource Limits
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: todo-app
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: todo-app
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: todo-app
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
```

### kubectl Namespace Commands
```bash
# Create namespace
kubectl create namespace todo-app

# List namespaces
kubectl get namespaces

# Set default namespace for context
kubectl config set-context --current --namespace=todo-app

# Apply to specific namespace
kubectl apply -f deployment.yaml -n todo-app

# Get resources in namespace
kubectl get all -n todo-app
```

## Applying Manifests

### kubectl apply
```bash
# Apply single file
kubectl apply -f deployment.yaml

# Apply directory
kubectl apply -f ./manifests/

# Apply recursively
kubectl apply -f ./manifests/ -R

# Apply with namespace
kubectl apply -f deployment.yaml -n todo-app

# Apply from URL
kubectl apply -f https://example.com/deployment.yaml

# Dry run (validate only)
kubectl apply -f deployment.yaml --dry-run=client

# Server-side dry run
kubectl apply -f deployment.yaml --dry-run=server

# Show diff before applying
kubectl diff -f deployment.yaml
```

### Kustomize
```bash
# Apply with kustomize
kubectl apply -k ./overlays/production/

# View rendered manifests
kubectl kustomize ./overlays/production/
```

## Viewing Resources

### kubectl get
```bash
# List deployments
kubectl get deployments -n todo-app

# List pods with more info
kubectl get pods -o wide -n todo-app

# List all resources
kubectl get all -n todo-app

# Custom output columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase

# JSON/YAML output
kubectl get deployment todo-backend -o yaml -n todo-app
kubectl get deployment todo-backend -o json -n todo-app

# Watch for changes
kubectl get pods -w -n todo-app

# Filter by label
kubectl get pods -l app=todo-backend -n todo-app
```

### kubectl describe
```bash
# Describe deployment
kubectl describe deployment todo-backend -n todo-app

# Describe pod
kubectl describe pod todo-backend-abc123 -n todo-app

# Describe service
kubectl describe service todo-backend -n todo-app

# Describe events
kubectl describe events -n todo-app
```

### kubectl logs
```bash
# Pod logs
kubectl logs todo-backend-abc123 -n todo-app

# Follow logs
kubectl logs -f todo-backend-abc123 -n todo-app

# Previous container logs (after restart)
kubectl logs todo-backend-abc123 --previous -n todo-app

# Logs from specific container
kubectl logs todo-backend-abc123 -c sidecar -n todo-app

# Logs with timestamps
kubectl logs todo-backend-abc123 --timestamps -n todo-app

# Last N lines
kubectl logs todo-backend-abc123 --tail=100 -n todo-app

# Logs from all pods with label
kubectl logs -l app=todo-backend -n todo-app

# Logs since duration
kubectl logs todo-backend-abc123 --since=1h -n todo-app
```

## Debugging

### kubectl exec
```bash
# Execute command in pod
kubectl exec todo-backend-abc123 -n todo-app -- ls /app

# Interactive shell
kubectl exec -it todo-backend-abc123 -n todo-app -- /bin/sh

# Execute in specific container
kubectl exec -it todo-backend-abc123 -c sidecar -n todo-app -- /bin/sh

# Run one-off command
kubectl exec todo-backend-abc123 -n todo-app -- env
```

### kubectl port-forward
```bash
# Forward local port to pod
kubectl port-forward todo-backend-abc123 8080:8000 -n todo-app

# Forward to service
kubectl port-forward svc/todo-backend 8080:80 -n todo-app

# Forward to deployment
kubectl port-forward deployment/todo-backend 8080:8000 -n todo-app

# Listen on all interfaces
kubectl port-forward --address 0.0.0.0 todo-backend-abc123 8080:8000 -n todo-app
```

### Additional Debug Commands
```bash
# Get events (sorted by time)
kubectl get events --sort-by=.lastTimestamp -n todo-app

# Check pod status
kubectl get pod todo-backend-abc123 -o jsonpath='{.status.conditions}' -n todo-app

# Check container status
kubectl get pod todo-backend-abc123 -o jsonpath='{.status.containerStatuses}' -n todo-app

# Debug with ephemeral container
kubectl debug todo-backend-abc123 -it --image=busybox -n todo-app

# Copy files from pod
kubectl cp todo-app/todo-backend-abc123:/app/logs ./local-logs

# Copy files to pod
kubectl cp ./config.json todo-app/todo-backend-abc123:/app/config/
```

### Troubleshooting Checklist
```bash
# 1. Check pod status
kubectl get pods -n todo-app

# 2. Describe pod for events
kubectl describe pod <pod-name> -n todo-app

# 3. Check logs
kubectl logs <pod-name> -n todo-app

# 4. Check previous logs if restarting
kubectl logs <pod-name> --previous -n todo-app

# 5. Check service endpoints
kubectl get endpoints -n todo-app

# 6. Test connectivity
kubectl exec -it <pod> -- curl http://service:port

# 7. Check resource usage
kubectl top pods -n todo-app
```

## Complete Todo App Manifest Example

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: todo-app
---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-config
  namespace: todo-app
data:
  API_HOST: "0.0.0.0"
  API_PORT: "8000"
  FRONTEND_URL: "http://todo-frontend:3000"
  LOG_LEVEL: "info"
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-secrets
  namespace: todo-app
type: Opaque
stringData:
  DATABASE_URL: "postgres://user:pass@db:5432/todos"
  OPENAI_API_KEY: "sk-your-key"
---
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend
  namespace: todo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: todo-backend
  template:
    metadata:
      labels:
        app: todo-backend
    spec:
      containers:
        - name: todo-backend
          image: todo-backend:1.0.0
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: todo-config
            - secretRef:
                name: todo-secrets
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
---
# backend-service.yaml
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
    - port: 80
      targetPort: 8000
---
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-frontend
  namespace: todo-app
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
        - name: todo-frontend
          image: todo-frontend:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "http://todo-backend"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
# frontend-service.yaml
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

## Integration Notes

This skill is used by:
- **Kubernetes Engineer** - For creating and deploying manifests to Minikube
- **Helm Engineer** - As reference for templating Kubernetes resources

When creating manifests for Phase IV:
1. Always define resource limits and requests
2. Include liveness and readiness probes
3. Use ConfigMaps for non-sensitive configuration
4. Use Secrets for sensitive data (never commit actual secrets)
5. Apply consistent labeling for service discovery
6. Use namespaces to isolate environments
7. Test with `--dry-run` before applying
8. Monitor with `kubectl get` and `kubectl describe`

# Cloud Kubernetes Skill

## Purpose

Guide for deploying the Phase II Todo Chatbot application to managed Kubernetes services (DigitalOcean DOKS, Google GKE, Azure AKS). Covers cluster provisioning, container registries, ingress controllers, secrets management, and cost optimization strategies.

## Technology Stack

- **DigitalOcean DOKS** - Managed Kubernetes with simplicity focus
- **Google GKE** - Feature-rich managed Kubernetes
- **Azure AKS** - Enterprise-grade managed Kubernetes
- **Helm** - Kubernetes package manager
- **cert-manager** - Automatic TLS certificates
- **NGINX Ingress** - Ingress controller
- **External Secrets** - Secrets management

---

## Cloud Provider Comparison

| Feature | DOKS | GKE | AKS |
|---------|------|-----|-----|
| **Pricing** | $12/node/mo + resources | $0.10/hr/cluster + resources | Free control plane + resources |
| **Min Nodes** | 1 | 1 (Autopilot: 0) | 1 |
| **Autoscaling** | Node pools | Autopilot or node pools | Node pools + VMSS |
| **Registry** | DOCR ($5/mo) | GCR/Artifact Registry | ACR |
| **Load Balancer** | $12/mo | $18/mo | $15/mo |
| **Best For** | Startups, simplicity | Advanced features, ML | Enterprise, hybrid |

---

## DigitalOcean Kubernetes (DOKS)

### Prerequisites

```bash
# Install doctl CLI
# macOS
brew install doctl

# Windows
scoop install doctl

# Linux
snap install doctl

# Authenticate
doctl auth init
# Enter your API token from https://cloud.digitalocean.com/account/api/tokens
```

### Create Cluster

```bash
# List available regions
doctl kubernetes options regions

# List available node sizes
doctl kubernetes options sizes

# Create cluster
doctl kubernetes cluster create todo-chatbot \
  --region nyc1 \
  --version 1.29.1-do.0 \
  --node-pool "name=default;size=s-2vcpu-4gb;count=3;auto-scale=true;min-nodes=2;max-nodes=5" \
  --tag todo-chatbot

# Get kubeconfig
doctl kubernetes cluster kubeconfig save todo-chatbot

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### DigitalOcean Container Registry (DOCR)

```bash
# Create registry
doctl registry create todo-chatbot-registry

# Login to registry
doctl registry login

# Get registry endpoint
doctl registry get

# Tag and push images
docker tag task-service:latest registry.digitalocean.com/todo-chatbot-registry/task-service:v1.0.0
docker push registry.digitalocean.com/todo-chatbot-registry/task-service:v1.0.0

# Enable registry integration with cluster
doctl kubernetes cluster registry add todo-chatbot

# Create image pull secret (automatic with integration, manual if needed)
doctl registry kubernetes-manifest | kubectl apply -f -
```

### DOKS Cost Management

```yaml
# infrastructure/doks/node-pool-config.yaml
# Recommended node pools for cost optimization

# Production workloads
apiVersion: v1
kind: NodePool
metadata:
  name: production
spec:
  size: s-2vcpu-4gb    # $24/mo per node
  count: 3
  autoScale:
    enabled: true
    minNodes: 2
    maxNodes: 5
  labels:
    workload: production

---
# Development/staging workloads (cheaper)
apiVersion: v1
kind: NodePool
metadata:
  name: development
spec:
  size: s-1vcpu-2gb    # $12/mo per node
  count: 1
  autoScale:
    enabled: true
    minNodes: 1
    maxNodes: 3
  labels:
    workload: development
  taints:
    - key: workload
      value: development
      effect: NoSchedule
```

---

## Google Kubernetes Engine (GKE)

### Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Create Cluster (Standard)

```bash
# Create standard cluster
gcloud container clusters create todo-chatbot \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5 \
  --enable-autorepair \
  --enable-autoupgrade \
  --workload-pool=YOUR_PROJECT_ID.svc.id.goog \
  --labels=app=todo-chatbot,env=production

# Get credentials
gcloud container clusters get-credentials todo-chatbot --zone us-central1-a

# Verify
kubectl cluster-info
```

### Create Cluster (Autopilot - Recommended)

```bash
# Autopilot: Pay per pod, automatic scaling and management
gcloud container clusters create-auto todo-chatbot-autopilot \
  --region us-central1 \
  --project YOUR_PROJECT_ID \
  --labels=app=todo-chatbot,env=production

# Get credentials
gcloud container clusters get-credentials todo-chatbot-autopilot \
  --region us-central1
```

### Google Artifact Registry

```bash
# Create repository
gcloud artifacts repositories create todo-chatbot \
  --repository-format=docker \
  --location=us-central1 \
  --description="Todo Chatbot container images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag and push
docker tag task-service:latest \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/todo-chatbot/task-service:v1.0.0

docker push \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/todo-chatbot/task-service:v1.0.0

# List images
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/todo-chatbot
```

### GKE Workload Identity (Recommended for Secrets)

```bash
# Enable workload identity on cluster (if not done at creation)
gcloud container clusters update todo-chatbot \
  --zone us-central1-a \
  --workload-pool=YOUR_PROJECT_ID.svc.id.goog

# Create Google Service Account
gcloud iam service-accounts create todo-chatbot-sa \
  --display-name="Todo Chatbot Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:todo-chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create Kubernetes Service Account
kubectl create serviceaccount todo-chatbot-ksa -n default

# Bind KSA to GSA
gcloud iam service-accounts add-iam-policy-binding \
  todo-chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:YOUR_PROJECT_ID.svc.id.goog[default/todo-chatbot-ksa]"

# Annotate KSA
kubectl annotate serviceaccount todo-chatbot-ksa \
  iam.gke.io/gcp-service-account=todo-chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### GKE Cost Management

```yaml
# infrastructure/gke/resource-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
```

---

## Azure Kubernetes Service (AKS)

### Prerequisites

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Set subscription
az account set --subscription YOUR_SUBSCRIPTION_ID

# Register providers
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.ContainerRegistry
```

### Create Cluster

```bash
# Create resource group
az group create \
  --name todo-chatbot-rg \
  --location eastus

# Create AKS cluster
az aks create \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-aks \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 5 \
  --enable-managed-identity \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --tags app=todo-chatbot env=production

# Get credentials
az aks get-credentials \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-aks

# Verify
kubectl cluster-info
```

### Azure Container Registry (ACR)

```bash
# Create ACR
az acr create \
  --resource-group todo-chatbot-rg \
  --name todochatbotacr \
  --sku Basic

# Login to ACR
az acr login --name todochatbotacr

# Attach ACR to AKS (enables pulling without secrets)
az aks update \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-aks \
  --attach-acr todochatbotacr

# Tag and push
docker tag task-service:latest todochatbotacr.azurecr.io/task-service:v1.0.0
docker push todochatbotacr.azurecr.io/task-service:v1.0.0

# List images
az acr repository list --name todochatbotacr
```

### AKS with Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-kv \
  --location eastus

# Add secrets
az keyvault secret set \
  --vault-name todo-chatbot-kv \
  --name database-url \
  --value "postgresql://user:pass@host/db"

az keyvault secret set \
  --vault-name todo-chatbot-kv \
  --name better-auth-secret \
  --value "your-secret-here"

# Enable AKS Key Vault integration
az aks enable-addons \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-aks \
  --addons azure-keyvault-secrets-provider

# Grant AKS identity access to Key Vault
AKS_IDENTITY=$(az aks show \
  --resource-group todo-chatbot-rg \
  --name todo-chatbot-aks \
  --query addonProfiles.azureKeyvaultSecretsProvider.identity.clientId -o tsv)

az keyvault set-policy \
  --name todo-chatbot-kv \
  --spn $AKS_IDENTITY \
  --secret-permissions get
```

---

## Container Registry Comparison

### Multi-Cloud Registry Setup

```bash
# ============================================================
# DigitalOcean Container Registry
# ============================================================
DOCR_REGISTRY="registry.digitalocean.com/todo-chatbot-registry"

docker tag app:latest $DOCR_REGISTRY/app:v1.0.0
docker push $DOCR_REGISTRY/app:v1.0.0

# ============================================================
# Google Artifact Registry
# ============================================================
GAR_REGISTRY="us-central1-docker.pkg.dev/PROJECT_ID/todo-chatbot"

docker tag app:latest $GAR_REGISTRY/app:v1.0.0
docker push $GAR_REGISTRY/app:v1.0.0

# ============================================================
# Azure Container Registry
# ============================================================
ACR_REGISTRY="todochatbotacr.azurecr.io"

docker tag app:latest $ACR_REGISTRY/app:v1.0.0
docker push $ACR_REGISTRY/app:v1.0.0
```

### Registry Image Pull Secrets

```yaml
# kubernetes/registry-secrets.yaml

# For DOCR (if not using cluster integration)
apiVersion: v1
kind: Secret
metadata:
  name: docr-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
---
# For private registries
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.example.com": {
          "username": "user",
          "password": "password",
          "auth": "<base64-user:password>"
        }
      }
    }
```

```yaml
# Reference in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: task-service
          image: registry.example.com/task-service:v1.0.0
```

---

## Ingress Controller

### NGINX Ingress Installation

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.requests.memory=128Mi \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-name"="todo-chatbot-lb" \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-size-slug"="lb-small"

# Wait for external IP
kubectl get svc -n ingress-nginx -w
```

### Ingress Configuration

```yaml
# kubernetes/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-chatbot-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"
    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    # TLS with cert-manager
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.todo-chatbot.example.com
        - app.todo-chatbot.example.com
      secretName: todo-chatbot-tls
  rules:
    # API backend
    - host: api.todo-chatbot.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
    # Frontend
    - host: app.todo-chatbot.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

### cert-manager for TLS

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for pods
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s
```

```yaml
# kubernetes/ingress/cluster-issuer.yaml
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
---
# Staging issuer for testing (higher rate limits)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Cloud-Specific Load Balancer Annotations

```yaml
# DigitalOcean Load Balancer
metadata:
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-name: "todo-chatbot-lb"
    service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-small"
    service.beta.kubernetes.io/do-loadbalancer-protocol: "http"
    service.beta.kubernetes.io/do-loadbalancer-tls-ports: "443"
    service.beta.kubernetes.io/do-loadbalancer-certificate-id: "cert-id"
    service.beta.kubernetes.io/do-loadbalancer-redirect-http-to-https: "true"

---
# GKE Load Balancer
metadata:
  annotations:
    cloud.google.com/load-balancer-type: "External"
    cloud.google.com/backend-config: '{"default": "backend-config"}'

---
# AKS Load Balancer
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
    service.beta.kubernetes.io/azure-dns-label-name: "todo-chatbot"
```

---

## Secrets Management

### Kubernetes Secrets (Basic)

```yaml
# kubernetes/secrets/app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: default
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@host:5432/db?sslmode=require"
  BETTER_AUTH_SECRET: "your-32-char-secret-here"
  OPENAI_API_KEY: "sk-..."
  SENDGRID_API_KEY: "SG...."
---
apiVersion: v1
kind: Secret
metadata:
  name: kafka-secrets
  namespace: default
type: Opaque
stringData:
  KAFKA_USERNAME: "kafka-user"
  KAFKA_PASSWORD: "kafka-password"
```

### External Secrets Operator

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

#### AWS Secrets Manager Integration

```yaml
# kubernetes/secrets/aws-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: todo-chatbot/production
        property: database_url
    - secretKey: BETTER_AUTH_SECRET
      remoteRef:
        key: todo-chatbot/production
        property: auth_secret
```

#### Google Secret Manager Integration

```yaml
# kubernetes/secrets/gcp-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: YOUR_PROJECT_ID
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: todo-chatbot
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: database-url
        version: latest
    - secretKey: BETTER_AUTH_SECRET
      remoteRef:
        key: auth-secret
        version: latest
```

#### Azure Key Vault Integration

```yaml
# kubernetes/secrets/azure-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      tenantId: "YOUR_TENANT_ID"
      vaultUrl: "https://todo-chatbot-kv.vault.azure.net"
      authType: ManagedIdentity
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: database-url
    - secretKey: BETTER_AUTH_SECRET
      remoteRef:
        key: better-auth-secret
```

### Sealed Secrets (GitOps-friendly)

```bash
# Install Sealed Secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system

# Install kubeseal CLI
brew install kubeseal  # macOS

# Create sealed secret
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-secrets.yaml

# Apply sealed secret (can be committed to git)
kubectl apply -f sealed-secrets.yaml
```

---

## Cost Management

### Resource Optimization

```yaml
# kubernetes/resource-policies/vertical-pod-autoscaler.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: task-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-service
  updatePolicy:
    updateMode: "Auto"  # or "Off" for recommendations only
  resourcePolicy:
    containerPolicies:
      - containerName: task-service
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 1
          memory: 1Gi
        controlledResources: ["cpu", "memory"]
```

```yaml
# kubernetes/resource-policies/horizontal-pod-autoscaler.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: task-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

### Pod Disruption Budgets

```yaml
# kubernetes/resource-policies/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: task-service-pdb
spec:
  minAvailable: 1  # or maxUnavailable: 1
  selector:
    matchLabels:
      app: task-service
```

### Spot/Preemptible Instances

```yaml
# GKE Spot Node Pool
# gcloud container node-pools create spot-pool \
#   --cluster todo-chatbot \
#   --spot \
#   --num-nodes 2 \
#   --machine-type e2-medium

# kubernetes/deployments/spot-tolerant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service-spot
spec:
  replicas: 2
  template:
    spec:
      # Tolerate spot/preemptible nodes
      tolerations:
        - key: "cloud.google.com/gke-spot"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
      # Prefer spot nodes
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: cloud.google.com/gke-spot
                    operator: In
                    values:
                      - "true"
      # Handle preemption gracefully
      terminationGracePeriodSeconds: 30
      containers:
        - name: task-service
          image: task-service:latest
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

### Cost Monitoring

```yaml
# kubernetes/monitoring/kubecost.yaml
# Install Kubecost for cost visibility
# helm repo add kubecost https://kubecost.github.io/cost-analyzer/
# helm install kubecost kubecost/cost-analyzer \
#   --namespace kubecost \
#   --create-namespace

apiVersion: v1
kind: Namespace
metadata:
  name: kubecost
  labels:
    name: kubecost
---
# Access Kubecost dashboard
# kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

### Resource Quotas per Environment

```yaml
# kubernetes/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "100"
    services.loadbalancers: "2"
    persistentvolumeclaims: "10"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "4Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
      type: Container
```

```yaml
# kubernetes/namespaces/staging.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    env: staging
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging
spec:
  hard:
    requests.cpu: "5"
    requests.memory: 10Gi
    limits.cpu: "10"
    limits.memory: 20Gi
    pods: "30"
    services.loadbalancers: "1"
```

---

## Complete Deployment Example

### Production Deployment

```yaml
# kubernetes/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
  namespace: production
  labels:
    app: task-service
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: task-service-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: task-service
          image: registry.example.com/task-service:v1.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
              name: http
          env:
            - name: ENVIRONMENT
              value: "production"
          envFrom:
            - secretRef:
                name: app-secrets
            - configMapRef:
                name: app-config
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: task-service
---
apiVersion: v1
kind: Service
metadata:
  name: task-service
  namespace: production
spec:
  selector:
    app: task-service
  ports:
    - port: 80
      targetPort: 8000
      name: http
  type: ClusterIP
```

---

## Monitoring & Observability

### Prometheus & Grafana Stack

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi

# Access Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Default: admin / prom-operator
```

### Application Metrics

```yaml
# kubernetes/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: task-service
  namespace: monitoring
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: task-service
  namespaceSelector:
    matchNames:
      - production
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

---

## Quick Reference

### CLI Cheat Sheet

```bash
# ============================================================
# DigitalOcean (doctl)
# ============================================================
doctl kubernetes cluster list
doctl kubernetes cluster kubeconfig save CLUSTER_NAME
doctl registry login
doctl kubernetes cluster registry add CLUSTER_NAME

# ============================================================
# Google Cloud (gcloud)
# ============================================================
gcloud container clusters list
gcloud container clusters get-credentials CLUSTER_NAME --zone ZONE
gcloud auth configure-docker
gcloud artifacts docker images list REGISTRY

# ============================================================
# Azure (az)
# ============================================================
az aks list
az aks get-credentials --resource-group RG --name CLUSTER_NAME
az acr login --name ACR_NAME
az acr repository list --name ACR_NAME
```

### Cost Estimation (Monthly)

| Component | DOKS | GKE | AKS |
|-----------|------|-----|-----|
| Control Plane | Free | $72 | Free |
| 3x Small Nodes | $36 | $45 | $45 |
| Load Balancer | $12 | $18 | $15 |
| Container Registry | $5 | $0.10/GB | $0.67/GB |
| **Minimum Total** | **~$53** | **~$140** | **~$65** |

### Security Checklist

- [ ] Enable RBAC
- [ ] Use network policies
- [ ] Enable pod security standards
- [ ] Use managed identities (no static credentials)
- [ ] Enable audit logging
- [ ] Use private clusters (if possible)
- [ ] Rotate secrets regularly
- [ ] Scan images for vulnerabilities
- [ ] Enable encryption at rest
- [ ] Use TLS for all ingress

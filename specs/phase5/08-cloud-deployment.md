# Feature Specification: Cloud Kubernetes Deployment

**Feature Branch**: `phase5-cloud-deployment`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Production deployment to cloud Kubernetes (DOKS, GKE, or AKS) with ingress, TLS, and multi-environment support

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy to DigitalOcean Kubernetes (Priority: P1)

As an operator, I want to deploy the application to DigitalOcean Kubernetes so users can access it in production.

**Why this priority**: Primary deployment target - enables production release.

**Independent Test**: Run deployment commands, verify all pods are running and accessible.

**Acceptance Scenarios**:

1. **Given** DOKS cluster is created, **When** I run `helm install`, **Then** all services deploy successfully.
2. **Given** deployment completes, **When** I check pod status, **Then** all pods show "Running" state.
3. **Given** services are running, **When** I access the frontend URL, **Then** the application loads correctly.
4. **Given** multiple replicas are configured, **When** traffic arrives, **Then** load is distributed across replicas.

---

### User Story 2 - Configure Ingress and Load Balancer (Priority: P1)

As an operator, I want ingress routing configured so external users can access the application via a single domain.

**Why this priority**: Required for external access - users need a URL to reach the application.

**Independent Test**: Configure ingress, access domain, verify routing to frontend and API.

**Acceptance Scenarios**:

1. **Given** ingress is configured, **When** I access `todo.example.com`, **Then** frontend is served.
2. **Given** ingress has API route, **When** I access `todo.example.com/api/...`, **Then** requests route to backend.
3. **Given** DigitalOcean Load Balancer is created, **When** I check resources, **Then** external IP is assigned.
4. **Given** DNS is configured, **When** users access the domain, **Then** they reach the application.

---

### User Story 3 - Enable TLS/HTTPS (Priority: P1)

As a user, I want secure HTTPS access so my data is encrypted in transit.

**Why this priority**: Security requirement - all production traffic must be encrypted.

**Independent Test**: Access application via HTTPS, verify valid certificate.

**Acceptance Scenarios**:

1. **Given** cert-manager is installed, **When** ingress requests certificate, **Then** Let's Encrypt issues it.
2. **Given** certificate is issued, **When** I access `https://todo.example.com`, **Then** browser shows secure connection.
3. **Given** HTTP request arrives, **When** ingress processes it, **Then** user is redirected to HTTPS.
4. **Given** certificate expires, **When** renewal period arrives, **Then** cert-manager auto-renews.

---

### User Story 4 - Push Images to Container Registry (Priority: P1)

As a CI/CD pipeline, I want to push Docker images to a container registry so Kubernetes can pull them.

**Why this priority**: Deployment dependency - images must be accessible from cluster.

**Independent Test**: Build and push image, verify registry contains it.

**Acceptance Scenarios**:

1. **Given** images are built, **When** I push to DigitalOcean Container Registry, **Then** images are available.
2. **Given** images are in registry, **When** Kubernetes pulls them, **Then** pods start successfully.
3. **Given** registry authentication is configured, **When** pulling, **Then** credentials work correctly.
4. **Given** new image version is pushed, **When** deployment is updated, **Then** Kubernetes pulls the new version.

---

### User Story 5 - Manage Multi-Environment Configuration (Priority: P2)

As an operator, I want separate configurations for staging and production so I can test safely before production release.

**Why this priority**: Best practice - prevents accidental production changes.

**Independent Test**: Deploy to staging with staging values, verify different from production.

**Acceptance Scenarios**:

1. **Given** `values-staging.yaml` exists, **When** I deploy to staging, **Then** staging configuration is applied.
2. **Given** staging and production are separate, **When** I deploy to staging, **Then** production is unaffected.
3. **Given** I want to promote staging to production, **When** I deploy with `values-prod.yaml`, **Then** production uses correct settings.
4. **Given** resources differ by environment, **When** deploying, **Then** each environment gets appropriate resource limits.

---

### Edge Cases

- What if cluster creation fails? (Retry with different region or size)
- What if DNS propagation is slow? (Wait up to 48 hours, verify with dig)
- What if certificate issuance fails? (Check DNS, Let's Encrypt rate limits)
- What if registry credentials expire? (Refresh token, update Kubernetes secret)
- What if load balancer doesn't get IP? (Check cloud quotas and billing)

## Requirements *(mandatory)*

### Functional Requirements

**Cluster Setup**:
- **FR-001**: System MUST deploy to DigitalOcean Kubernetes (DOKS) as primary provider
- **FR-002**: System SHOULD support Google Kubernetes Engine (GKE) as alternative
- **FR-003**: System SHOULD support Azure Kubernetes Service (AKS) as alternative
- **FR-004**: Cluster MUST run Kubernetes version 1.28 or later
- **FR-005**: Cluster MUST have minimum 3 nodes for high availability

**Container Registry**:
- **FR-006**: Images MUST be stored in cloud container registry (DOCR, GCR, or ACR)
- **FR-007**: Registry MUST support private image access with authentication
- **FR-008**: Kubernetes MUST be configured with registry pull secrets
- **FR-009**: Images MUST be tagged with commit SHA for traceability

**Ingress Configuration**:
- **FR-010**: System MUST use nginx-ingress controller for routing
- **FR-011**: Ingress MUST route `/` to frontend service
- **FR-012**: Ingress MUST route `/api/*` to backend service
- **FR-013**: Ingress MUST support path-based routing for multiple services
- **FR-014**: Ingress MUST create cloud load balancer automatically

**TLS/HTTPS**:
- **FR-015**: System MUST use cert-manager for certificate management
- **FR-016**: Certificates MUST be issued by Let's Encrypt
- **FR-017**: Ingress MUST redirect HTTP to HTTPS
- **FR-018**: Certificates MUST auto-renew before expiration
- **FR-019**: System MUST use production Let's Encrypt issuer (not staging)

**DNS Configuration**:
- **FR-020**: Domain MUST point to load balancer IP (A record) or CNAME
- **FR-021**: DNS TTL SHOULD be set to 300 seconds for faster updates

**Multi-Environment**:
- **FR-022**: System MUST support separate staging and production environments
- **FR-023**: Each environment MUST have separate namespace
- **FR-024**: Each environment MUST have separate configuration (values-staging.yaml, values-prod.yaml)
- **FR-025**: Production MUST have stricter resource limits than staging

**Dapr in Cloud**:
- **FR-026**: Dapr MUST be installed in cloud cluster (`dapr init -k`)
- **FR-027**: Dapr components MUST be deployed to each namespace
- **FR-028**: Pub/Sub MUST connect to production Kafka (Redpanda Cloud or managed)

### Key Entities

- **Kubernetes Cluster**: Managed cloud Kubernetes with node pool
- **Container Registry**: Cloud image storage with authentication
- **Ingress Controller**: nginx-ingress for routing
- **Load Balancer**: Cloud-provided external load balancer
- **Certificate**: TLS certificate from Let's Encrypt
- **Namespace**: Kubernetes namespace per environment

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cluster creation completes in under 15 minutes
- **SC-002**: Application deployment completes in under 10 minutes
- **SC-003**: TLS certificate is issued within 5 minutes of ingress creation
- **SC-004**: Frontend loads within 3 seconds from any geographic region
- **SC-005**: Application achieves 99.9% uptime (measured over 30 days)
- **SC-006**: Zero-downtime deployments during rolling updates
- **SC-007**: Staging environment costs less than $50/month
- **SC-008**: Production environment costs less than $150/month (baseline 3 nodes)

## Assumptions

- DigitalOcean account with billing enabled
- Domain name registered and DNS manageable
- kubectl configured to access cluster
- Helm 3.x installed locally
- GitHub Actions or equivalent CI/CD access

## Deployment Configuration Reference

### DigitalOcean Cluster Creation
```bash
doctl kubernetes cluster create todo-cluster \
  --region nyc1 \
  --node-pool "name=default;size=s-2vcpu-4gb;count=3" \
  --version latest

# Get kubeconfig
doctl kubernetes cluster kubeconfig save todo-cluster
```

### Install Prerequisites
```bash
# Install nginx-ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true

# Install Dapr
dapr init -k
```

### Cluster Issuer for Let's Encrypt
```yaml
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

### Ingress Configuration
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - todo.example.com
      secretName: todo-tls
  rules:
    - host: todo.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

### Environment-Specific Values

**values-staging.yaml**:
```yaml
replicaCount:
  frontend: 1
  backend: 1
  notification: 1
  recurring: 1

resources:
  frontend:
    requests: { cpu: 100m, memory: 128Mi }
    limits: { cpu: 250m, memory: 256Mi }
```

**values-prod.yaml**:
```yaml
replicaCount:
  frontend: 2
  backend: 2
  notification: 1
  recurring: 1

resources:
  frontend:
    requests: { cpu: 250m, memory: 256Mi }
    limits: { cpu: 500m, memory: 512Mi }
```

# Feature Specification: Phase IV Local Kubernetes Deployment

**Feature Branch**: `004-k8s-local-deployment`
**Created**: 2026-01-20
**Status**: Draft
**Input**: Phase IV Local Kubernetes Deployment with AI-assisted DevOps tools

## Overview

Deploy the Phase III Todo Chatbot application (Next.js frontend, FastAPI backend) to a local Kubernetes cluster using Minikube, with containerization via Docker and package management via Helm. AI-assisted DevOps tools (Gordon, kubectl-ai, Kagent) enhance the deployment workflow while maintaining standard CLI fallbacks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Containerize Application (Priority: P1)

As a developer, I want to containerize the Phase III Todo Chatbot frontend and backend applications so that they can run consistently in any environment.

**Why this priority**: Containerization is the foundational prerequisite for all Kubernetes deployment. Without working container images, no subsequent deployment steps are possible.

**Independent Test**: Can be fully tested by building Docker images locally and running containers with `docker run`, verifying the application responds correctly on designated ports.

**Acceptance Scenarios**:

1. **Given** the Phase III frontend source code exists, **When** I run `docker build` in the frontend directory, **Then** a container image is created successfully with no build errors.
2. **Given** the Phase III backend source code exists, **When** I run `docker build` in the backend directory, **Then** a container image is created successfully with no build errors.
3. **Given** a built frontend image, **When** I run the container and access port 3000, **Then** the application loads and displays the login page.
4. **Given** a built backend image with environment variables set, **When** I run the container and access `/health`, **Then** a successful health check response is returned.
5. **Given** built images, **When** I inspect the running containers, **Then** they run as non-root users.

---

### User Story 2 - Deploy to Local Kubernetes (Priority: P2)

As a developer, I want to deploy the containerized applications to a local Minikube cluster so that I can test the full Kubernetes deployment workflow before moving to production environments.

**Why this priority**: Kubernetes deployment validates the cloud-native architecture and provides a realistic testing environment for orchestration, scaling, and service discovery.

**Independent Test**: Can be fully tested by applying Kubernetes manifests to Minikube and verifying all pods reach Running state with services accessible via Minikube's networking.

**Acceptance Scenarios**:

1. **Given** Minikube is installed and started, **When** I load the container images into Minikube, **Then** the images are available for pod creation.
2. **Given** container images are loaded, **When** I apply the Kubernetes deployment manifests, **Then** all pods transition to Running state within 2 minutes.
3. **Given** pods are running, **When** I check pod health probes, **Then** all liveness and readiness probes pass.
4. **Given** services are created, **When** I access the frontend via Minikube service URL, **Then** the application loads in a browser.
5. **Given** the frontend is loaded, **When** I attempt to use the chat functionality, **Then** the frontend successfully communicates with the backend service.

---

### User Story 3 - Manage Deployment with Helm (Priority: P3)

As a developer, I want to package the Kubernetes deployment as a Helm chart so that I can easily install, upgrade, and rollback the application with customizable configuration.

**Why this priority**: Helm provides versioned, repeatable deployments and simplifies configuration management, but is an enhancement over raw manifests which can work independently.

**Independent Test**: Can be fully tested by running `helm install` and verifying the same successful deployment as raw manifests, then testing `helm upgrade` and `helm rollback` operations.

**Acceptance Scenarios**:

1. **Given** a valid Helm chart structure, **When** I run `helm lint`, **Then** no errors or warnings are reported.
2. **Given** a valid Helm chart, **When** I run `helm install`, **Then** all Kubernetes resources are created and pods reach Running state.
3. **Given** a deployed Helm release, **When** I modify values and run `helm upgrade`, **Then** the deployment updates with the new configuration.
4. **Given** a deployed Helm release with history, **When** I run `helm rollback`, **Then** the deployment reverts to the previous version.
5. **Given** a Helm chart, **When** I run `helm template`, **Then** valid Kubernetes YAML is rendered with no template errors.

---

### User Story 4 - Use AI DevOps Tools (Priority: P4)

As a developer, I want to use AI-assisted DevOps tools (Gordon, kubectl-ai, Kagent) to simplify container and Kubernetes operations so that I can work more efficiently with natural language commands.

**Why this priority**: AI tools are productivity enhancers but not required for successful deployment. The system must work with standard CLI commands as fallback.

**Independent Test**: Can be tested by attempting AI tool commands and verifying they produce valid outputs, with fallback to standard CLI commands if AI tools are unavailable.

**Acceptance Scenarios**:

1. **Given** Docker Desktop 4.53+ with Gordon enabled, **When** I run `docker ai "Create Dockerfile for Next.js"`, **Then** a valid Dockerfile is generated or suggested.
2. **Given** kubectl-ai is installed with OPENAI_API_KEY set, **When** I run `kubectl ai "deploy frontend with 2 replicas"`, **Then** a valid deployment command or manifest is generated.
3. **Given** Kagent is installed, **When** I run `kagent "analyze cluster health"`, **Then** a cluster health report is returned.
4. **Given** Gordon is unavailable, **When** I use standard Docker CLI commands, **Then** the same containerization outcomes are achieved.
5. **Given** kubectl-ai is unavailable, **When** I use standard kubectl commands, **Then** the same Kubernetes deployment outcomes are achieved.

---

### Edge Cases

- What happens when Minikube runs out of allocated resources (CPU/memory)?
  - Pods fail to schedule with "Insufficient resources" events; user must increase Minikube resource allocation via `minikube start --cpus=X --memory=YGB`
- What happens when container images fail to build due to missing dependencies?
  - Build fails with clear error messages; user must fix Dockerfile or source code issues
- What happens when health probes fail repeatedly?
  - Kubernetes restarts the container (liveness) or removes from service (readiness); logs indicate probe failure reason
- What happens when secrets are not configured before deployment?
  - Pods fail to start with "secret not found" errors; user must create secrets first
- What happens when AI tools are not available or API keys are missing?
  - Fallback to standard CLI commands; all functionality achievable without AI tools
- What happens when Minikube cluster fails to start?
  - Clear error message indicating issue (virtualization disabled, insufficient resources, etc.); troubleshooting guide provides resolution steps

## Requirements *(mandatory)*

### Functional Requirements

#### Containerization

- **FR-D01**: System MUST build a frontend Docker image from Phase III Next.js source code using multi-stage build
- **FR-D02**: System MUST build a backend Docker image from Phase III FastAPI source code using multi-stage build
- **FR-D03**: Container images MUST use minimal base images (node:20-alpine for frontend, python:3.11-slim for backend)
- **FR-D04**: Containers MUST run as non-root users for security
- **FR-D05**: Frontend container MUST respond to health checks on the root path (/)
- **FR-D06**: Backend container MUST respond to health checks on /health endpoint
- **FR-D07**: Containers MUST accept configuration via environment variables
- **FR-D08**: Images MUST exclude unnecessary files via .dockerignore

#### Kubernetes Deployment

- **FR-K01**: System MUST deploy frontend with 2 replicas for high availability
- **FR-K02**: System MUST deploy backend with 2 replicas for high availability
- **FR-K03**: Frontend service MUST be accessible externally via NodePort
- **FR-K04**: Backend service MUST be accessible internally via ClusterIP for frontend-to-backend communication
- **FR-K05**: Non-sensitive configuration MUST be stored in ConfigMap resources
- **FR-K06**: Sensitive data (API keys, database URL, auth secret) MUST be stored in Secret resources
- **FR-K07**: Deployments MUST include liveness probes to detect container failures
- **FR-K08**: Deployments MUST include readiness probes to control traffic routing
- **FR-K09**: Containers MUST define resource requests and limits for CPU and memory
- **FR-K10**: All resources MUST be deployed to a dedicated namespace (todo-app)

#### Helm Charts

- **FR-H01**: System MUST provide a Helm chart that installs all Kubernetes resources
- **FR-H02**: Helm chart MUST pass `helm lint` validation without errors
- **FR-H03**: Helm chart MUST support customization via values.yaml
- **FR-H04**: Helm chart MUST support upgrade operations with rolling updates
- **FR-H05**: Helm chart MUST support rollback to previous revisions

#### AI DevOps Tools

- **FR-A01**: Documentation MUST include Gordon commands for Dockerfile generation (if available)
- **FR-A02**: Documentation MUST include kubectl-ai commands for common Kubernetes operations
- **FR-A03**: Documentation MUST include Kagent commands for cluster health analysis
- **FR-A04**: All AI tool operations MUST have documented standard CLI fallback commands

### Key Entities

- **Container Image**: Packaged application with all dependencies; attributes include name, tag, base image, exposed ports, health check configuration
- **Deployment**: Kubernetes resource managing pod replicas; attributes include replica count, container spec, resource limits, probe configuration, environment variables
- **Service**: Kubernetes resource for network access; attributes include type (NodePort/ClusterIP), ports, selector labels
- **ConfigMap**: Non-sensitive configuration data; attributes include key-value pairs for environment variables
- **Secret**: Sensitive configuration data; attributes include base64-encoded values for API keys, database URLs, auth secrets
- **Helm Chart**: Package containing Kubernetes manifests and configuration; attributes include Chart.yaml metadata, values.yaml defaults, template files

### Assumptions

- Phase III application code is complete and functional
- Docker Desktop 4.53+ is available on Windows (for Gordon AI support)
- Minikube is compatible with the user's system (virtualization enabled)
- Neon PostgreSQL database remains cloud-hosted (not containerized)
- Users have basic familiarity with command-line tools
- OPENAI_API_KEY is available for kubectl-ai usage (optional)

### Dependencies

- Phase III Todo Chatbot application (frontend and backend source code)
- Docker Desktop with Docker Engine
- Minikube for local Kubernetes cluster
- Helm v3+ for chart management
- kubectl CLI for Kubernetes operations
- Neon PostgreSQL database (external, cloud-hosted)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Docker images build successfully in under 5 minutes each
- **SC-002**: Container startup time is under 30 seconds
- **SC-003**: Application response time matches Phase III performance (chat responses under 3 seconds)
- **SC-004**: All pods reach Running state within 2 minutes of deployment
- **SC-005**: Health probes pass for all containers within 60 seconds of startup
- **SC-006**: Frontend is accessible via browser within 30 seconds of service creation
- **SC-007**: Chat functionality works end-to-end through Kubernetes services
- **SC-008**: Helm install completes without errors
- **SC-009**: Helm upgrade and rollback operations complete successfully
- **SC-010**: 100% of sensitive data is stored in Secrets (none in ConfigMaps or images)
- **SC-011**: 100% of containers run as non-root users
- **SC-012**: All AI tool commands have documented CLI fallbacks

### Verification Methods

- **Build Verification**: Run `docker build` and verify exit code 0 with image created
- **Container Test**: Run container locally with `docker run` and curl health endpoints
- **Deployment Test**: Apply manifests and verify `kubectl get pods` shows all Running
- **Service Test**: Access application via `minikube service` URL in browser
- **E2E Test**: Complete a chat conversation through the deployed application
- **Security Test**: Verify container user with `docker exec whoami` returns non-root user
- **Helm Test**: Run `helm lint`, `helm install`, `helm upgrade`, `helm rollback` commands

## Scope Boundaries

### In Scope

- Frontend Dockerfile creation (Next.js multi-stage build)
- Backend Dockerfile creation (FastAPI multi-stage build)
- .dockerignore files for both applications
- Kubernetes Deployment manifests for frontend and backend
- Kubernetes Service manifests (NodePort and ClusterIP)
- ConfigMap for non-sensitive environment variables
- Secret for sensitive data (API keys, database URL)
- Namespace definition (todo-app)
- Helm chart packaging all resources
- Documentation for AI DevOps tools usage
- Minikube setup and configuration guide
- Troubleshooting guide for common issues

### Out of Scope

- Modifying Phase III application code
- Database containerization (continue using Neon PostgreSQL)
- Cloud Kubernetes deployment (AWS EKS, GCP GKE, Azure AKS)
- CI/CD pipeline implementation
- Ingress controller setup
- TLS/SSL certificate management
- Persistent volume provisioning
- Horizontal Pod Autoscaler configuration
- Production hardening beyond basic security

## Deliverables

1. **frontend/Dockerfile** - Multi-stage build for Next.js application
2. **frontend/.dockerignore** - Exclusion patterns for frontend build
3. **backend/Dockerfile** - Multi-stage build for FastAPI application
4. **backend/.dockerignore** - Exclusion patterns for backend build
5. **kubernetes/namespace.yaml** - Namespace definition
6. **kubernetes/configmap.yaml** - Non-sensitive configuration
7. **kubernetes/secret.yaml** - Template for sensitive data
8. **kubernetes/frontend-deployment.yaml** - Frontend Deployment manifest
9. **kubernetes/frontend-service.yaml** - Frontend NodePort Service
10. **kubernetes/backend-deployment.yaml** - Backend Deployment manifest
11. **kubernetes/backend-service.yaml** - Backend ClusterIP Service
12. **helm/todo-chatbot/Chart.yaml** - Helm chart metadata
13. **helm/todo-chatbot/values.yaml** - Default configuration values
14. **helm/todo-chatbot/templates/** - Templated Kubernetes manifests
15. **docs/deployment-guide.md** - Step-by-step deployment instructions
16. **docs/ai-tools-guide.md** - AI DevOps tools usage documentation
17. **docs/troubleshooting.md** - Common issues and resolutions

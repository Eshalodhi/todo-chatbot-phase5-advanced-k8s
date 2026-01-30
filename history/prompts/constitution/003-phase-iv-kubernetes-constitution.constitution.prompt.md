---
id: 003
title: Phase IV Kubernetes Constitution Update
stage: constitution
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: /sp.constitution
labels: ["constitution", "phase-iv", "kubernetes", "docker", "helm", "aiops", "gordon", "kubectl-ai", "kagent"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - null
---

## Prompt

/sp.constitution

Project: Phase IV - Local Kubernetes Deployment with AI DevOps

Context:
Deploy Phase III Todo Chatbot on local Kubernetes using Minikube, Helm, Docker with AI-assisted tools (Gordon, kubectl-ai, Kagent).

Existing: Phase III chatbot (Next.js frontend, FastAPI backend, Cohere AI, Neon DB)
Objective: Containerize and deploy locally with cloud-native architecture

---

TECHNOLOGY STACK:

- Containerization: Docker Desktop 4.53+ with Gordon AI
- Orchestration: Kubernetes (Minikube)
- Package Manager: Helm Charts
- AI DevOps: Gordon, kubectl-ai, Kagent
- Application: Phase III Todo Chatbot

---

CONTAINERIZATION:

Frontend (Next.js):
- Base: node:20-alpine
- Multi-stage build
- Port: 3000
- Health check on /
- Non-root user

Backend (FastAPI):
- Base: python:3.11-slim
- Multi-stage build
- Port: 8000
- Health check on /health
- Non-root user

Gordon Usage:
- docker ai "Create Dockerfile for Next.js"
- docker ai "Optimize image size"
- docker ai "Analyze security"
- Fallback to standard Docker if unavailable

---

KUBERNETES DEPLOYMENT:

Minikube Setup:
- Install: choco install minikube
- Start: minikube start
- Enable: metrics-server addon

Components:
- Frontend Deployment: 2 replicas, resources defined, health probes
- Backend Deployment: 2 replicas, resources defined, health probes
- Frontend Service: NodePort (port 3000)
- Backend Service: ClusterIP (port 8000)
- ConfigMap: Non-sensitive environment variables
- Secret: COHERE_API_KEY, DATABASE_URL, BETTER_AUTH_SECRET

Database:
- Use existing Neon PostgreSQL (cloud-hosted)
- Connection via DATABASE_URL in Secret

---

HELM CHARTS:

Structure:
- Chart.yaml (metadata)
- values.yaml (configuration)
- templates/ (Deployment, Service, ConfigMap, Secret)

Generation:
- kubectl-ai "create helm chart for todo frontend"
- kagent "generate deployment manifests"

Commands:
- helm install todo-release ./todo-chatbot
- helm upgrade todo-release ./todo-chatbot
- helm rollback todo-release

---

AI DEVOPS TOOLS:

Gordon (Docker AI):
- Enable in Docker Desktop > Settings > Beta
- docker ai "What can you do?"
- If unavailable: use standard Docker CLI

kubectl-ai:
- Install: kubectl krew install ai
- Requires: OPENAI_API_KEY
- Examples:
  * kubectl ai "deploy frontend with 2 replicas"
  * kubectl ai "scale backend to handle more load"
  * kubectl ai "check why pods are failing"

Kagent:
- Download from GitHub releases
- Examples:
  * kagent "analyze cluster health"
  * kagent "optimize resource allocation"

Strategy: Start with kubectl-ai for operations, use Kagent for analysis

---

DEPLOYMENT WORKFLOW:

1. Containerization:
   - Create Dockerfiles (use Gordon)
   - Build images locally
   - Test with docker run

2. Minikube:
   - Start cluster
   - Load images: minikube image load

3. Deploy:
   - Option A: kubectl apply -f manifests/
   - Option B: helm install todo-release ./chart

4. Access:
   - minikube service todo-frontend --url

5. Monitor:
   - kagent "analyze cluster health"
   - kubectl top pods

---

RESOURCE MANAGEMENT:

Frontend:
- Requests: CPU 250m, Memory 256Mi
- Limits: CPU 500m, Memory 512Mi

Backend:
- Requests: CPU 500m, Memory 512Mi
- Limits: CPU 1000m, Memory 1Gi

Health Probes:
- Liveness: Restart if unhealthy
- Readiness: Remove from service if not ready

---

SECURITY:

- Non-root users in containers
- Minimal base images (alpine, slim)
- Secrets for sensitive data (base64 encoded)
- No hardcoded secrets
- Resource limits

---

DELIVERABLES:

- frontend/Dockerfile
- backend/Dockerfile
- kubernetes/manifests/ (or helm chart)
- README.md (setup instructions)

---

SUCCESS CRITERIA:

- Docker images build successfully
- Minikube cluster running
- All pods in Running state
- Services accessible
- Frontend loads in browser
- Chat functionality works
- Gordon/kubectl-ai/Kagent working (if available)

---

CONSTRAINTS:

Must Use: Docker Desktop, Minikube, Helm, Phase III app
Must NOT: Use cloud providers, change Phase III code, hardcode secrets
Should Use: Gordon, kubectl-ai, Kagent (if available)

---

RESEARCH NOTE:

Explore Spec-Driven infrastructure automation with blueprints and Claude Code Agent Skills for managed services.

---

Generate Phase IV specifications for Kubernetes deployment with AI-assisted DevOps.

## Response snapshot

Updated constitution from version 2.0.0 to 3.0.0 (MAJOR version bump) with comprehensive Phase IV specifications:

**Added 5 New Principles (X-XIV):**
- X. Containerization Standards - Docker multi-stage builds, non-root users, Gordon AI
- XI. Kubernetes Deployment - Minikube setup, components, namespace, probes
- XII. Helm Chart Management - Chart structure, commands, AI-assisted generation
- XIII. AI DevOps Tools - Gordon, kubectl-ai, Kagent with fallback strategies
- XIV. Resource Management - CPU/memory limits, probe configuration

**Added 8 New Non-Negotiables (rules 14-21):**
- Non-root containers, resource limits, health probes, secrets management
- Multi-stage builds, minimal images, namespace isolation, Helm validation

**Added Infrastructure Stack:**
- Docker Desktop 4.53+, Minikube, Helm v3+, Gordon, kubectl-ai, Kagent

**Added Phase IV Success Criteria:**
- 17 verification checkpoints for Kubernetes deployment

**Added New Sections:**
- Deployment Workflow (5-step process)
- Constraints (MUST/MUST NOT/SHOULD Use)
- Health Endpoints (Phase IV)

**Preserved:**
- All Phase II rules (1-7)
- All Phase III rules (8-13)
- All existing principles (I-IX)
- Complete API contract, data model, authentication flow

## Outcome

- Impact: Major constitution update establishing Phase IV Kubernetes/DevOps governance with 5 new principles, 8 new rules, and comprehensive deployment specifications
- Tests: N/A (constitution document)
- Files: 1 file updated (.specify/memory/constitution.md)
- Next prompts: Run /sp.specify for Phase IV feature spec, create Dockerfiles, Kubernetes manifests, Helm charts
- Reflection: Constitution now provides complete governance from application code through containerization to Kubernetes orchestration with AI-assisted DevOps

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Implement Phase IV deliverables following constitution specifications

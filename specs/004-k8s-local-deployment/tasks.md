# Tasks: Phase IV Local Kubernetes Deployment

**Feature Branch**: `004-k8s-local-deployment`
**Date**: 2026-01-20
**Updated**: 2026-01-21
**Input**: Design documents from `/specs/004-k8s-local-deployment/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, infrastructure.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Environment Prerequisites)

**Purpose**: Ensure all required tools are installed and configured before any implementation begins.

- [ ] T001 Verify Docker Desktop 4.53+ installed with `docker --version`
- [ ] T002 [P] Enable Gordon AI in Docker Desktop Settings → Beta features (optional)
- [ ] T003 [P] Install Minikube via `choco install minikube` or equivalent
- [ ] T004 [P] Install Helm v3+ via `choco install kubernetes-helm` or equivalent
- [ ] T005 [P] Verify kubectl installed with `kubectl version --client`
- [ ] T006 [P] (Optional) Install kubectl-ai via `kubectl krew install ai`
- [ ] T007 [P] (Optional) Install Kagent for cluster analysis
- [ ] T008 Test Gordon availability with `docker ai "hello"` (may fail if unavailable)
- [X] T009 Create directory structure: `kubernetes/`, `helm/todo-chatbot/templates/`, `docs/`

**Checkpoint**: Development environment ready - implementation can begin

---

## Phase 2: Foundational (Directory Structure)

**Purpose**: Create project structure that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Create `kubernetes/` directory at repository root
- [X] T011 [P] Create `helm/todo-chatbot/` directory structure at repository root
- [X] T012 [P] Create `helm/todo-chatbot/templates/` subdirectory
- [X] T013 [P] Create `docs/` directory at repository root

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Containerize Application (Priority: P1)

**Goal**: Create Docker images for frontend (Next.js) and backend (FastAPI) applications with multi-stage builds, non-root users, and health checks.

**Independent Test**: Run `docker build` for each image, then `docker run` to verify containers start and respond to health checks.

### Implementation for User Story 1

#### Frontend Containerization

- [X] T014 [P] [US1] Create `frontend/.dockerignore` with node_modules, .git, .next exclusions
- [X] T015 [US1] Create `frontend/Dockerfile` with multi-stage build (deps → build → runner)
- [X] T016 [US1] Configure Next.js standalone output in `frontend/next.config.ts` (if not already set)
- [X] T017 [US1] Verify frontend Dockerfile uses node:20-alpine base image
- [X] T018 [US1] Verify frontend Dockerfile creates non-root user (nextjs:1001)
- [ ] T019 [US1] Build frontend image: `docker build -t todo-frontend:1.0.0 ./frontend`
- [ ] T020 [US1] Test frontend container: `docker run -p 3000:3000 todo-frontend:1.0.0`
- [ ] T021 [US1] Verify frontend health check responds on `/` path

#### Backend Containerization

- [X] T022 [P] [US1] Create `backend/.dockerignore` with __pycache__, .venv, .git exclusions
- [X] T023 [US1] Create `backend/Dockerfile` with multi-stage build (builder → runner)
- [X] T024 [US1] Verify backend Dockerfile uses python:3.11-slim base image
- [X] T025 [US1] Verify backend Dockerfile creates non-root user (appuser:1000)
- [X] T026 [US1] Add HEALTHCHECK instruction to backend Dockerfile for /health endpoint
- [ ] T027 [US1] Build backend image: `docker build -t todo-backend:1.0.0 ./backend`
- [ ] T028 [US1] Test backend container with env vars: `docker run -p 8000:8000 -e DATABASE_URL=... todo-backend:1.0.0`
- [ ] T029 [US1] Verify backend health check responds on `/health` path

#### User Story 1 Verification

- [ ] T030 [US1] Verify both containers run as non-root with `docker exec <container> whoami`
- [ ] T031 [US1] Verify image sizes (frontend <200MB, backend <300MB)

**Checkpoint**: User Story 1 complete - Docker images built and tested locally

---

## Phase 4: User Story 2 - Deploy to Local Kubernetes (Priority: P2)

**Goal**: Deploy containerized applications to Minikube cluster with proper manifests, services, and configuration.

**Independent Test**: Apply manifests to Minikube, verify all pods reach Running state, access frontend via NodePort.

### Kubernetes Manifests

- [X] T032 [P] [US2] Create `kubernetes/namespace.yaml` defining todo-app namespace in `kubernetes/namespace.yaml`
- [X] T033 [P] [US2] Create `kubernetes/configmap.yaml` with API_HOST, API_PORT, LOG_LEVEL, ENVIRONMENT, NEXT_PUBLIC_API_URL in `kubernetes/configmap.yaml`
- [X] T034 [P] [US2] Create `kubernetes/secret.yaml` template for DATABASE_URL, COHERE_API_KEY, BETTER_AUTH_SECRET in `kubernetes/secret.yaml`
- [X] T035 [US2] Create `kubernetes/frontend-deployment.yaml` with 2 replicas, resource limits, probes in `kubernetes/frontend-deployment.yaml`
- [X] T036 [US2] Create `kubernetes/frontend-service.yaml` as NodePort on 30080 in `kubernetes/frontend-service.yaml`
- [X] T037 [US2] Create `kubernetes/backend-deployment.yaml` with 2 replicas, resource limits, probes in `kubernetes/backend-deployment.yaml`
- [X] T038 [US2] Create `kubernetes/backend-service.yaml` as ClusterIP on 8000 in `kubernetes/backend-service.yaml`
- [ ] T039 [US2] Validate all manifests with `kubectl apply -f kubernetes/ --dry-run=client`

### Minikube Deployment

- [ ] T040 [US2] Start Minikube cluster: `minikube start --cpus=4 --memory=8192 --driver=docker`
- [ ] T041 [US2] Enable metrics addon: `minikube addons enable metrics-server`
- [ ] T042 [US2] Load frontend image: `minikube image load todo-frontend:1.0.0`
- [ ] T043 [US2] Load backend image: `minikube image load todo-backend:1.0.0`
- [ ] T044 [US2] Verify images loaded: `minikube image ls | grep todo`
- [ ] T045 [US2] Create namespace: `kubectl create namespace todo-app`
- [ ] T046 [US2] Create secret with actual values: `kubectl create secret generic todo-secrets -n todo-app --from-literal=DATABASE_URL=... --from-literal=COHERE_API_KEY=... --from-literal=BETTER_AUTH_SECRET=...`
- [ ] T047 [US2] Apply ConfigMap: `kubectl apply -f kubernetes/configmap.yaml -n todo-app`
- [ ] T048 [US2] Apply all deployments and services: `kubectl apply -f kubernetes/ -n todo-app`
- [ ] T049 [US2] Wait for pods to be ready: `kubectl wait --for=condition=Ready pods --all -n todo-app --timeout=120s`

### User Story 2 Verification

- [ ] T050 [US2] Verify all pods Running: `kubectl get pods -n todo-app`
- [ ] T051 [US2] Verify services created: `kubectl get svc -n todo-app`
- [ ] T052 [US2] Check pod logs for errors: `kubectl logs -l app=todo-backend -n todo-app`
- [ ] T053 [US2] Access frontend: `minikube service todo-frontend -n todo-app`
- [ ] T054 [US2] Test frontend-to-backend communication through deployed services

**Checkpoint**: User Story 2 complete - Application deployed to Minikube

---

## Phase 5: User Story 3 - Manage Deployment with Helm (Priority: P3)

**Goal**: Package Kubernetes deployment as a Helm chart with templating, values, and release management.

**Independent Test**: Run `helm lint`, `helm install`, `helm upgrade`, and `helm rollback` successfully.

### Helm Chart Structure

- [X] T055 [P] [US3] Create `helm/todo-chatbot/Chart.yaml` with chart metadata in `helm/todo-chatbot/Chart.yaml`
- [X] T056 [P] [US3] Create `helm/todo-chatbot/.helmignore` with exclusion patterns in `helm/todo-chatbot/.helmignore`
- [X] T057 [US3] Create `helm/todo-chatbot/values.yaml` with default configuration in `helm/todo-chatbot/values.yaml`
- [X] T058 [US3] Create `helm/todo-chatbot/values-dev.yaml` for development overrides in `helm/todo-chatbot/values-dev.yaml`

### Helm Templates

- [X] T059 [US3] Create `helm/todo-chatbot/templates/_helpers.tpl` with common helpers in `helm/todo-chatbot/templates/_helpers.tpl`
- [X] T060 [P] [US3] Create `helm/todo-chatbot/templates/namespace.yaml` templated from kubernetes manifest in `helm/todo-chatbot/templates/namespace.yaml`
- [X] T061 [P] [US3] Create `helm/todo-chatbot/templates/configmap.yaml` with .Values references in `helm/todo-chatbot/templates/configmap.yaml`
- [X] T062 [P] [US3] Create `helm/todo-chatbot/templates/secret.yaml` with .Values.secrets references in `helm/todo-chatbot/templates/secret.yaml`
- [X] T063 [US3] Create `helm/todo-chatbot/templates/frontend-deployment.yaml` with .Values.frontend references in `helm/todo-chatbot/templates/frontend-deployment.yaml`
- [X] T064 [US3] Create `helm/todo-chatbot/templates/frontend-service.yaml` with .Values.frontend.service references in `helm/todo-chatbot/templates/frontend-service.yaml`
- [X] T065 [US3] Create `helm/todo-chatbot/templates/backend-deployment.yaml` with .Values.backend references in `helm/todo-chatbot/templates/backend-deployment.yaml`
- [X] T066 [US3] Create `helm/todo-chatbot/templates/backend-service.yaml` with .Values.backend.service references in `helm/todo-chatbot/templates/backend-service.yaml`
- [X] T067 [US3] Create `helm/todo-chatbot/templates/NOTES.txt` with post-install instructions in `helm/todo-chatbot/templates/NOTES.txt`

### Helm Validation and Testing

- [ ] T068 [US3] Lint Helm chart: `helm lint helm/todo-chatbot`
- [ ] T069 [US3] Test template rendering: `helm template todo-release helm/todo-chatbot`
- [ ] T070 [US3] Clean up kubectl deployment: `kubectl delete -f kubernetes/ -n todo-app`
- [ ] T071 [US3] Install with Helm: `helm install todo-release helm/todo-chatbot -n todo-app`
- [ ] T072 [US3] Verify Helm release: `helm list -n todo-app`
- [ ] T073 [US3] Verify pods Running after Helm install: `kubectl get pods -n todo-app`
- [ ] T074 [US3] Test upgrade: `helm upgrade todo-release helm/todo-chatbot -n todo-app --set frontend.replicas=3`
- [ ] T075 [US3] Verify upgrade applied: `kubectl get pods -n todo-app` shows 3 frontend replicas
- [ ] T076 [US3] Test rollback: `helm rollback todo-release -n todo-app`
- [ ] T077 [US3] Verify rollback: `kubectl get pods -n todo-app` shows 2 frontend replicas

**Checkpoint**: User Story 3 complete - Helm chart working with install/upgrade/rollback

---

## Phase 6: User Story 4 - AI DevOps Tools & Documentation (Priority: P4)

**Goal**: Document AI tool usage and create comprehensive deployment guides with CLI fallbacks.

**Independent Test**: Verify documentation completeness, test AI commands if available, verify all fallback commands work.

### AI Tools Documentation

- [X] T078 [P] [US4] Create `docs/ai-tools-guide.md` documenting Gordon commands and fallbacks in `docs/ai-tools-guide.md`
- [X] T079 [US4] Add kubectl-ai commands section to `docs/ai-tools-guide.md`
- [X] T080 [US4] Add Kagent commands section to `docs/ai-tools-guide.md`
- [X] T081 [US4] Verify all AI commands have documented CLI fallbacks in `docs/ai-tools-guide.md`

### Deployment Documentation

- [X] T082 [US4] Create `docs/deployment-guide.md` with step-by-step instructions in `docs/deployment-guide.md`
- [X] T083 [US4] Add prerequisites section to deployment guide
- [X] T084 [US4] Add Docker image build section to deployment guide
- [X] T085 [US4] Add Minikube deployment section to deployment guide
- [X] T086 [US4] Add Helm deployment section to deployment guide
- [X] T087 [US4] Add verification section to deployment guide

### Troubleshooting Documentation

- [X] T088 [US4] Create `docs/troubleshooting.md` with common issues in `docs/troubleshooting.md`
- [X] T089 [US4] Add ImagePullBackOff solutions to troubleshooting guide
- [X] T090 [US4] Add CrashLoopBackOff solutions to troubleshooting guide
- [X] T091 [US4] Add service connectivity issues to troubleshooting guide
- [X] T092 [US4] Add resource exhaustion solutions to troubleshooting guide

### AI Tool Testing (Optional - if tools available)

- [ ] T093 [P] [US4] Test Gordon: `docker ai "Create Dockerfile for Next.js"` (record results)
- [ ] T094 [P] [US4] Test kubectl-ai: `kubectl ai "list pods in todo-app namespace"` (record results)
- [ ] T095 [P] [US4] Test Kagent: `kagent "analyze cluster health"` (record results)

**Checkpoint**: User Story 4 complete - Documentation and AI tools guide ready

---

## Phase 7: Polish & Final Verification

**Purpose**: Final testing, verification of all success criteria, and cleanup

- [ ] T096 Run end-to-end test: complete a chat conversation through deployed application
- [ ] T097 Verify SC-001: Docker images build in under 5 minutes
- [ ] T098 Verify SC-002: Container startup time under 30 seconds
- [ ] T099 Verify SC-004: All pods Running within 2 minutes of deployment
- [ ] T100 Verify SC-005: Health probes pass within 60 seconds
- [ ] T101 Verify SC-006: Frontend accessible via browser within 30 seconds
- [ ] T102 Verify SC-007: Chat functionality works end-to-end
- [ ] T103 Verify SC-010: All sensitive data in Secrets (none in ConfigMaps)
- [ ] T104 Verify SC-011: All containers run as non-root
- [X] T105 Verify SC-012: All AI tool commands have documented CLI fallbacks
- [ ] T106 Run quickstart.md validation to ensure guide is accurate
- [ ] T107 Update quickstart.md with any corrections from validation

**Checkpoint**: All success criteria verified - Phase IV implementation complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies - can start immediately
- **Phase 2: Foundational**: Depends on Setup completion - BLOCKS all user stories
- **Phase 3: US1 (Containerization)**: Depends on Phase 2 - can start after foundational
- **Phase 4: US2 (Kubernetes)**: Depends on Phase 3 (needs images) - sequential
- **Phase 5: US3 (Helm)**: Depends on Phase 4 (needs working manifests) - sequential
- **Phase 6: US4 (Documentation)**: Can start after Phase 3, parallel with Phases 4-5
- **Phase 7: Polish**: Depends on all previous phases

### User Story Dependencies

```
Phase 1 → Phase 2 → US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5)
                                      ↓
                                    US4 (Phase 6) can run in parallel
```

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs container images)
- **User Story 3 (P3)**: Depends on US2 (needs working manifests as reference)
- **User Story 4 (P4)**: Can start after US1, runs parallel to US2/US3

### Within Each Phase

- Tasks marked [P] can run in parallel within their phase
- Dockerfile tasks depend on .dockerignore being created first
- Deployment tasks depend on images being built
- Helm template tasks depend on Chart.yaml and values.yaml

### Parallel Opportunities

```bash
# Phase 1 parallel tasks:
T002, T003, T004, T005, T006, T007

# Phase 2 parallel tasks:
T010, T011, T012, T013

# US1 parallel tasks (different files):
T014 (frontend .dockerignore) || T022 (backend .dockerignore)

# US2 parallel tasks (different manifests):
T032, T033, T034

# US3 parallel tasks (different templates):
T055, T056 then T060, T061, T062

# US4 parallel tasks:
T078, T093, T094, T095
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Containerization)
4. Complete Phase 4: User Story 2 (Kubernetes)
5. **STOP and VALIDATE**: Application running on Minikube
6. Deploy/demo if ready

**MVP Duration**: ~6-8 hours

### Full Implementation

1. Complete MVP (Phases 1-4)
2. Add Phase 5: User Story 3 (Helm)
3. Add Phase 6: User Story 4 (Documentation)
4. Complete Phase 7: Polish
5. All success criteria verified

**Full Duration**: ~10-15 hours

### Quick Path (Minimum Viable - 4 hours)

1. Phase 1: Basic tool install (30 min)
2. Phase 3: Manual Dockerfiles, build (1.5 hours)
3. Phase 4: Deploy with kubectl only (1.5 hours)
4. Basic verification (30 min)

---

## Progress Summary

| Phase | Total | Completed | Remaining |
|-------|-------|-----------|-----------|
| Phase 1: Setup | 9 | 1 | 8 (mostly environment verification) |
| Phase 2: Foundational | 4 | 4 | 0 |
| Phase 3: US1 Containerization | 18 | 12 | 6 (build/test tasks) |
| Phase 4: US2 Kubernetes | 23 | 7 | 16 (deployment tasks) |
| Phase 5: US3 Helm | 23 | 13 | 10 (validation tasks) |
| Phase 6: US4 Documentation | 18 | 15 | 3 (AI tool testing) |
| Phase 7: Polish | 12 | 1 | 11 (verification tasks) |
| **Total** | **107** | **53** | **54** |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate progress
- AI tools (Gordon, kubectl-ai, Kagent) are optional - all tasks achievable with standard CLI
- Secrets must never be committed - use `kubectl create secret` at deploy time

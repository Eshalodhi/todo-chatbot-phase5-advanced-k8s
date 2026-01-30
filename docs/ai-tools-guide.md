# AI DevOps Tools Guide

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-21
**Version**: 1.0.0

## Overview

This guide documents the AI-assisted DevOps tools available for Phase IV Kubernetes deployment. All tools have manual CLI fallbacks for cases where AI tools are unavailable.

---

## Gordon (Docker AI Agent)

### Availability

- **Required**: Docker Desktop 4.53+
- **Enable**: Docker Desktop → Settings → Beta features → "Docker AI Agent (Gordon)"

### Verification

```bash
docker ai "What can you do?"
```

### Commands for Phase IV

| Task | Gordon Command | Manual Fallback |
|------|----------------|-----------------|
| Generate Next.js Dockerfile | `docker ai "Create optimized multi-stage Dockerfile for Next.js 14 production app with standalone output"` | Use `frontend/Dockerfile` template |
| Generate FastAPI Dockerfile | `docker ai "Create multi-stage Dockerfile for FastAPI with Python 3.11, uvicorn, and health check"` | Use `backend/Dockerfile` template |
| Optimize image size | `docker ai "Optimize this Dockerfile for smaller image size"` | Use multi-stage builds, alpine images |
| Security analysis | `docker ai "Analyze security vulnerabilities in this Dockerfile"` | Manual review with security checklist |
| Add health check | `docker ai "Add health check to this Dockerfile"` | Add `HEALTHCHECK` instruction manually |
| Non-root user | `docker ai "Configure this Dockerfile to run as non-root user"` | Add `USER` instruction manually |

### Example Usage

```bash
# Generate Dockerfile for Next.js
docker ai "Create an optimized Dockerfile for a Next.js 14 application with:
- Multi-stage build
- node:20-alpine base image
- Standalone output mode
- Non-root user
- Health check on port 3000"

# Analyze existing Dockerfile
cd frontend
docker ai "Analyze this Dockerfile for security issues and optimization opportunities"
```

### Manual Fallback

If Gordon is unavailable, use the provided Dockerfiles:
- `frontend/Dockerfile` - Next.js multi-stage build
- `backend/Dockerfile` - FastAPI multi-stage build

---

## kubectl-ai

### Installation

```bash
# Install Krew (kubectl plugin manager)
# See: https://krew.sigs.k8s.io/docs/user-guide/setup/install/

# Install kubectl-ai plugin
kubectl krew install ai

# Set OpenAI API key
export OPENAI_API_KEY="sk-your-api-key"
```

### Verification

```bash
kubectl ai --version
```

### Commands for Phase IV

| Task | kubectl-ai Command | Manual Fallback |
|------|-------------------|-----------------|
| Create deployment | `kubectl ai "create deployment for Next.js frontend with 2 replicas and health probes"` | `kubectl apply -f kubernetes/frontend-deployment.yaml` |
| Create NodePort service | `kubectl ai "create NodePort service for frontend exposing port 3000 on nodePort 30080"` | `kubectl apply -f kubernetes/frontend-service.yaml` |
| Create ConfigMap | `kubectl ai "create configmap with API_HOST=0.0.0.0 and LOG_LEVEL=info"` | `kubectl apply -f kubernetes/configmap.yaml` |
| Scale deployment | `kubectl ai "scale frontend deployment to 3 replicas in todo-app namespace"` | `kubectl scale deployment todo-frontend --replicas=3 -n todo-app` |
| Check pod issues | `kubectl ai "check why pods in todo-app namespace are failing"` | `kubectl describe pod <pod-name> -n todo-app` |
| Show resource usage | `kubectl ai "show resource usage for all pods in todo-app"` | `kubectl top pods -n todo-app` |
| Generate YAML | `kubectl ai "create deployment yaml for node app" --raw` | Write YAML manually |

### Example Usage

```bash
# Create deployment with AI
kubectl ai "Create a Kubernetes deployment for a Next.js application with:
- 2 replicas
- Image: todo-frontend:1.0.0
- Container port 3000
- CPU request 250m, limit 500m
- Memory request 256Mi, limit 512Mi
- Liveness probe on / with 30s initial delay
- Readiness probe on / with 5s initial delay"

# Troubleshoot pods
kubectl ai "Why are the pods in todo-app namespace not starting? Check events and logs"

# Preview YAML before applying
kubectl ai "create service for backend on port 8000" --raw
```

### Best Practices

- Use `--require-confirmation` for destructive actions
- Use `--raw` to preview YAML before applying
- Be specific in prompts for better results
- Always include namespace context in prompts

### Manual Fallback

If kubectl-ai is unavailable, use standard kubectl commands:

```bash
# Apply manifests
kubectl apply -f kubernetes/ -n todo-app

# Scale deployment
kubectl scale deployment todo-frontend --replicas=3 -n todo-app

# Check pod status
kubectl get pods -n todo-app
kubectl describe pod <pod-name> -n todo-app
kubectl logs <pod-name> -n todo-app

# Check events
kubectl get events -n todo-app --sort-by='.lastTimestamp'
```

---

## Kagent

### Installation

```bash
# Install via Go
go install github.com/kagent-dev/kagent@latest

# Or download from GitHub releases
```

### Verification

```bash
kagent --version
```

### Commands for Phase IV

| Task | Kagent Command | Manual Fallback |
|------|----------------|-----------------|
| Cluster health | `kagent "analyze cluster health"` | `kubectl get nodes && kubectl top nodes` |
| Resource optimization | `kagent "optimize resource allocation for todo-app namespace"` | Review `kubectl top pods -n todo-app` |
| Performance analysis | `kagent "identify performance bottlenecks"` | `kubectl logs` + manual analysis |
| Security audit | `kagent "audit security posture of todo-app"` | Review security contexts in manifests |
| Cost analysis | `kagent "analyze resource efficiency"` | Compare requests vs actual usage |

### Example Usage

```bash
# Cluster health check
kagent "Analyze the health of my Kubernetes cluster and identify any issues"

# Namespace-specific analysis
kagent "Check the todo-app namespace for:
- Pod health status
- Resource utilization
- Potential issues
- Optimization recommendations"

# Performance troubleshooting
kagent "Why is my application slow? Check todo-app namespace"
```

### Manual Fallback

If Kagent is unavailable:

```bash
# Check cluster health
kubectl get nodes
kubectl top nodes
kubectl get pods --all-namespaces | grep -v Running

# Check resource usage
kubectl top pods -n todo-app
kubectl top nodes

# Check events for issues
kubectl get events -n todo-app --sort-by='.lastTimestamp' | head -20

# Describe problematic resources
kubectl describe deployment todo-backend -n todo-app

# Open dashboard for visual monitoring
minikube dashboard
```

---

## AI Tool Availability Matrix

| Tool | Requirement | Optional API Key | Fallback Available |
|------|-------------|------------------|-------------------|
| Gordon | Docker Desktop 4.53+ | No | Yes (manual Dockerfiles) |
| kubectl-ai | kubectl + krew | Yes (OpenAI) | Yes (standard kubectl) |
| Kagent | Kagent binary | Varies | Yes (kubectl + dashboard) |

---

## Troubleshooting AI Tools

### Gordon Not Working

```bash
# Check Docker Desktop version
docker --version

# Verify Gordon is enabled
# Docker Desktop → Settings → Beta features → Docker AI Agent

# Test with simple command
docker ai "hello"

# If error: "Gordon is not enabled"
# → Enable in Docker Desktop settings and restart
```

### kubectl-ai Not Working

```bash
# Check if installed
kubectl ai --version

# If not found, install krew first
# See: https://krew.sigs.k8s.io/docs/user-guide/setup/install/

# Check API key
echo $OPENAI_API_KEY

# If empty, set it
export OPENAI_API_KEY="sk-your-key"

# Test simple command
kubectl ai "list namespaces"
```

### Kagent Not Working

```bash
# Check if installed
kagent --version

# If not found, install
go install github.com/kagent-dev/kagent@latest

# Add to PATH if needed
export PATH=$PATH:$(go env GOPATH)/bin

# Test simple command
kagent "hello"
```

---

## Summary

All AI tools in Phase IV are **optional enhancements**. The deployment can be completed entirely with standard CLI commands:

- **Dockerfiles**: Provided in `frontend/` and `backend/`
- **Kubernetes manifests**: Provided in `kubernetes/`
- **Helm charts**: Provided in `helm/todo-chatbot/`

AI tools accelerate development but are not required for successful deployment.

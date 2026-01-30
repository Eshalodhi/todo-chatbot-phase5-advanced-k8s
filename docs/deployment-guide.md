# Deployment Guide: Phase IV Local Kubernetes Deployment

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-21
**Version**: 1.0.0

## Overview

This guide provides step-by-step instructions for deploying the Phase III Todo Chatbot application to a local Kubernetes cluster using Minikube and Helm.

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|--------------|
| Docker Desktop | 4.53+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Minikube | Latest | `choco install minikube` or [minikube.sigs.k8s.io](https://minikube.sigs.k8s.io/docs/start/) |
| Helm | v3+ | `choco install kubernetes-helm` or [helm.sh](https://helm.sh/docs/intro/install/) |
| kubectl | Latest | Included with Docker Desktop |

### Verification

```bash
# Verify installations
docker --version      # Docker version 27.x or higher
minikube version      # minikube version: v1.x.x
helm version          # version.BuildInfo{Version:"v3.x.x"...}
kubectl version --client  # Client Version: v1.x.x
```

### Required Credentials

You'll need the following credentials from your Phase III setup:
- **DATABASE_URL**: Neon PostgreSQL connection string
- **COHERE_API_KEY**: Cohere API key for AI chat functionality
- **BETTER_AUTH_SECRET**: JWT signing secret for authentication

## Deployment Options

Choose one of the following deployment methods:

| Method | Description | Best For |
|--------|-------------|----------|
| **Option A: Helm** | Full chart deployment with templating | Production-like deployments |
| **Option B: kubectl** | Direct manifest application | Quick testing |

---

## Option A: Helm Deployment (Recommended)

### Step 1: Start Minikube

```bash
# Start cluster with adequate resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable metrics addon
minikube addons enable metrics-server

# Verify cluster is running
kubectl cluster-info
```

### Step 2: Build Docker Images

```bash
# Build frontend image
docker build -t todo-frontend:1.0.0 ./frontend

# Build backend image
docker build -t todo-backend:1.0.0 ./backend

# Verify images
docker images | grep todo
```

### Step 3: Load Images to Minikube

```bash
# Load images into Minikube's Docker daemon
minikube image load todo-frontend:1.0.0
minikube image load todo-backend:1.0.0

# Verify images are loaded
minikube image ls | grep todo
```

### Step 4: Create Secrets

```bash
# Create namespace first
kubectl create namespace todo-app

# Create secrets with your actual values
kubectl create secret generic todo-release-todo-chatbot-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@host/db' \
  --from-literal=COHERE_API_KEY='your-cohere-api-key' \
  --from-literal=BETTER_AUTH_SECRET='your-auth-secret' \
  -n todo-app
```

### Step 5: Deploy with Helm

```bash
# Lint the chart first
helm lint helm/todo-chatbot

# Install the Helm chart
helm install todo-release ./helm/todo-chatbot -n todo-app

# Watch pods come up
kubectl get pods -n todo-app -w
```

### Step 6: Access Application

```bash
# Get the service URL
minikube service todo-release-todo-chatbot-frontend -n todo-app --url

# Or open directly in browser
minikube service todo-release-todo-chatbot-frontend -n todo-app
```

### Helm Management Commands

```bash
# List releases
helm list -n todo-app

# Upgrade with new values
helm upgrade todo-release ./helm/todo-chatbot -n todo-app --set frontend.replicas=3

# Rollback to previous version
helm rollback todo-release -n todo-app

# Uninstall release
helm uninstall todo-release -n todo-app
```

---

## Option B: kubectl Deployment

### Step 1-3: Same as Helm Deployment

Follow Steps 1-3 from Option A above.

### Step 4: Create Namespace and Secrets

```bash
# Apply namespace
kubectl apply -f kubernetes/namespace.yaml

# Create secrets (update with your values)
kubectl create secret generic todo-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@host/db' \
  --from-literal=COHERE_API_KEY='your-cohere-api-key' \
  --from-literal=BETTER_AUTH_SECRET='your-auth-secret' \
  -n todo-app
```

### Step 5: Deploy with kubectl

```bash
# Apply all manifests
kubectl apply -f kubernetes/configmap.yaml -n todo-app
kubectl apply -f kubernetes/frontend-deployment.yaml -n todo-app
kubectl apply -f kubernetes/frontend-service.yaml -n todo-app
kubectl apply -f kubernetes/backend-deployment.yaml -n todo-app
kubectl apply -f kubernetes/backend-service.yaml -n todo-app

# Or apply all at once
kubectl apply -f kubernetes/ -n todo-app

# Watch pods come up
kubectl get pods -n todo-app -w
```

### Step 6: Access Application

```bash
# Get the service URL
minikube service todo-frontend -n todo-app --url

# Or open directly
minikube service todo-frontend -n todo-app
```

---

## Verification Steps

### Check Pod Status

```bash
# All pods should be Running
kubectl get pods -n todo-app

# Expected output:
# NAME                              READY   STATUS    RESTARTS   AGE
# todo-frontend-xxx-yyy             1/1     Running   0          2m
# todo-frontend-xxx-zzz             1/1     Running   0          2m
# todo-backend-aaa-bbb              1/1     Running   0          2m
# todo-backend-aaa-ccc              1/1     Running   0          2m
```

### Check Services

```bash
kubectl get svc -n todo-app

# Expected output:
# NAME             TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
# todo-frontend    NodePort    10.x.x.x       <none>        80:30080/TCP   2m
# todo-backend     ClusterIP   10.x.x.x       <none>        8000/TCP       2m
```

### Check Pod Logs

```bash
# Frontend logs
kubectl logs -l app=todo-frontend -n todo-app

# Backend logs
kubectl logs -l app=todo-backend -n todo-app
```

### Test Health Endpoints

```bash
# Test backend health
kubectl exec -it deployment/todo-backend -n todo-app -- python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"
```

### End-to-End Test

1. Open the frontend URL in a browser
2. Login or register a user
3. Create a task using the chat interface: "Add a task to test deployment"
4. Verify the task appears in the task list
5. Complete and delete the task

---

## Cleanup

### Helm Cleanup

```bash
# Uninstall Helm release
helm uninstall todo-release -n todo-app

# Delete namespace
kubectl delete namespace todo-app

# Stop Minikube
minikube stop

# (Optional) Delete Minikube cluster
minikube delete
```

### kubectl Cleanup

```bash
# Delete all resources
kubectl delete -f kubernetes/ -n todo-app

# Delete secrets
kubectl delete secret todo-secrets -n todo-app

# Delete namespace
kubectl delete namespace todo-app

# Stop Minikube
minikube stop
```

---

## Environment-Specific Configurations

### Development

```bash
# Use development values file
helm install todo-release ./helm/todo-chatbot -n todo-app -f helm/todo-chatbot/values-dev.yaml
```

### Production-like (Local)

```bash
# Use default values (2 replicas, full resources)
helm install todo-release ./helm/todo-chatbot -n todo-app
```

### Custom Configuration

```bash
# Override specific values
helm install todo-release ./helm/todo-chatbot -n todo-app \
  --set frontend.replicas=3 \
  --set backend.replicas=3 \
  --set config.logLevel=debug
```

---

## Next Steps

- Review [AI Tools Guide](./ai-tools-guide.md) for AI-assisted operations
- Check [Troubleshooting Guide](./troubleshooting.md) for common issues
- See [quickstart.md](../specs/004-k8s-local-deployment/quickstart.md) for a condensed deployment guide

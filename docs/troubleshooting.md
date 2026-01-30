# Troubleshooting Guide

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-21
**Version**: 1.0.0

## Overview

This guide covers common issues encountered during Phase IV Kubernetes deployment and their solutions.

---

## Quick Diagnostics

```bash
# Overall cluster status
kubectl get all -n todo-app

# Check events
kubectl get events -n todo-app --sort-by='.lastTimestamp' | head -20

# Check pod logs
kubectl logs -l app=todo-backend -n todo-app
kubectl logs -l app=todo-frontend -n todo-app

# Describe problematic pod
kubectl describe pod <pod-name> -n todo-app
```

---

## Common Issues

### 1. ImagePullBackOff

**Symptoms:**
```
NAME                            READY   STATUS             RESTARTS   AGE
todo-frontend-xxx-yyy           0/1     ImagePullBackOff   0          1m
```

**Causes:**
- Images not loaded into Minikube
- Image name/tag mismatch

**Solutions:**

```bash
# Verify images exist locally
docker images | grep todo

# Load images into Minikube
minikube image load todo-frontend:1.0.0
minikube image load todo-backend:1.0.0

# Verify images in Minikube
minikube image ls | grep todo

# If still failing, check image name in deployment
kubectl get deployment todo-frontend -n todo-app -o yaml | grep image:
```

---

### 2. CrashLoopBackOff

**Symptoms:**
```
NAME                            READY   STATUS             RESTARTS   AGE
todo-backend-xxx-yyy            0/1     CrashLoopBackOff   5          5m
```

**Causes:**
- Missing environment variables
- Database connection failure
- Application startup error

**Solutions:**

```bash
# Check logs for error messages
kubectl logs <pod-name> -n todo-app
kubectl logs <pod-name> -n todo-app --previous

# Verify secrets exist
kubectl get secret todo-secrets -n todo-app
kubectl get secret todo-secrets -n todo-app -o yaml

# Verify configmap
kubectl get configmap todo-config -n todo-app -o yaml

# Check environment variables in pod
kubectl exec -it <pod-name> -n todo-app -- env | grep -E "DATABASE|COHERE|AUTH"

# If missing secrets, recreate them
kubectl delete secret todo-secrets -n todo-app
kubectl create secret generic todo-secrets \
  --from-literal=DATABASE_URL='your-url' \
  --from-literal=COHERE_API_KEY='your-key' \
  --from-literal=BETTER_AUTH_SECRET='your-secret' \
  -n todo-app

# Restart pods
kubectl rollout restart deployment todo-backend -n todo-app
```

---

### 3. Pending Pods

**Symptoms:**
```
NAME                            READY   STATUS    RESTARTS   AGE
todo-backend-xxx-yyy            0/1     Pending   0          5m
```

**Causes:**
- Insufficient cluster resources
- Node issues

**Solutions:**

```bash
# Check events for scheduling issues
kubectl describe pod <pod-name> -n todo-app | grep -A 10 Events

# Check node resources
kubectl top nodes
kubectl describe node minikube | grep -A 10 "Allocated resources"

# If insufficient resources, increase Minikube resources
minikube stop
minikube delete
minikube start --cpus=4 --memory=8192 --driver=docker
```

---

### 4. Health Probe Failures

**Symptoms:**
```
Warning  Unhealthy  pod/todo-backend-xxx  Liveness probe failed: HTTP probe failed with statuscode: 500
```

**Causes:**
- Application not ready yet (increase initial delay)
- Health endpoint not responding
- Application error

**Solutions:**

```bash
# Check health endpoint manually
kubectl exec -it deployment/todo-backend -n todo-app -- curl localhost:8000/health

# Check application logs
kubectl logs -l app=todo-backend -n todo-app

# If slow startup, increase probe delays
kubectl edit deployment todo-backend -n todo-app
# Change initialDelaySeconds: 30 to initialDelaySeconds: 60

# Or update via Helm
helm upgrade todo-release ./helm/todo-chatbot -n todo-app \
  --set backend.probes.liveness.initialDelaySeconds=60 \
  --set backend.probes.readiness.initialDelaySeconds=30
```

---

### 5. Service Not Accessible

**Symptoms:**
- `minikube service` times out
- Cannot reach frontend in browser

**Causes:**
- Service selector mismatch
- NodePort not exposed
- Minikube network issues

**Solutions:**

```bash
# Verify service endpoints
kubectl get endpoints -n todo-app

# If endpoints are empty, check selectors
kubectl get svc todo-frontend -n todo-app -o yaml | grep -A 5 selector
kubectl get pods -n todo-app --show-labels

# Try port-forward instead
kubectl port-forward svc/todo-frontend 3000:80 -n todo-app

# Check Minikube status
minikube status

# Restart Minikube if needed
minikube stop
minikube start
```

---

### 6. Frontend Cannot Connect to Backend

**Symptoms:**
- Frontend loads but API calls fail
- Network errors in browser console

**Causes:**
- Backend service not running
- Incorrect API URL configuration
- CORS issues

**Solutions:**

```bash
# Verify backend service is running
kubectl get svc todo-backend -n todo-app
kubectl get endpoints todo-backend -n todo-app

# Test backend from frontend pod
kubectl exec -it deployment/todo-frontend -n todo-app -- wget -qO- http://todo-backend:8000/health

# Check ConfigMap API URL
kubectl get configmap todo-config -n todo-app -o yaml | grep NEXT_PUBLIC_API_URL

# If incorrect, update ConfigMap
kubectl edit configmap todo-config -n todo-app
# Set NEXT_PUBLIC_API_URL: "http://todo-backend:8000"

# Restart frontend
kubectl rollout restart deployment todo-frontend -n todo-app
```

---

### 7. Docker Build Failures

**Symptoms:**
```
ERROR: failed to solve: failed to compute cache key
```

**Causes:**
- Missing files
- Build context issues
- .dockerignore excluding required files

**Solutions:**

```bash
# Check .dockerignore isn't excluding important files
cat frontend/.dockerignore
cat backend/.dockerignore

# Build with verbose output
docker build -t todo-frontend:1.0.0 ./frontend --progress=plain

# If Next.js standalone not working
cat frontend/next.config.ts
# Ensure it contains: output: "standalone"

# Rebuild with no cache
docker build --no-cache -t todo-frontend:1.0.0 ./frontend
```

---

### 8. Helm Lint/Install Errors

**Symptoms:**
```
Error: YAML parse error
Error: template: todo-chatbot/templates/...
```

**Causes:**
- YAML syntax errors
- Template variable issues
- Missing values

**Solutions:**

```bash
# Lint the chart
helm lint helm/todo-chatbot

# Debug template rendering
helm template todo-release helm/todo-chatbot --debug

# Check specific template
helm template todo-release helm/todo-chatbot -s templates/backend-deployment.yaml

# Validate YAML syntax
kubectl apply -f kubernetes/ --dry-run=client -n todo-app
```

---

### 9. Minikube Won't Start

**Symptoms:**
```
minikube start fails with various errors
```

**Causes:**
- Virtualization not enabled
- Docker Desktop not running
- Insufficient system resources

**Solutions:**

```bash
# Check Docker is running
docker info

# Delete and recreate Minikube
minikube delete
minikube start --cpus=4 --memory=8192 --driver=docker

# If virtualization issues (Windows)
# Enable Hyper-V or WSL2 in Windows Features

# Try alternative driver
minikube start --driver=hyperv
minikube start --driver=virtualbox

# Check Minikube logs
minikube logs
```

---

### 10. Resource Exhaustion

**Symptoms:**
- Pods evicted
- OOMKilled errors
- Slow performance

**Solutions:**

```bash
# Check resource usage
kubectl top pods -n todo-app
kubectl top nodes

# Increase Minikube resources
minikube stop
minikube start --cpus=6 --memory=12288 --driver=docker

# Or reduce deployment resources
helm upgrade todo-release ./helm/todo-chatbot -n todo-app \
  -f helm/todo-chatbot/values-dev.yaml
```

---

## Debug Commands Reference

| Task | Command |
|------|---------|
| Pod status | `kubectl get pods -n todo-app` |
| Pod details | `kubectl describe pod <name> -n todo-app` |
| Pod logs | `kubectl logs <name> -n todo-app` |
| Previous logs | `kubectl logs <name> -n todo-app --previous` |
| Exec into pod | `kubectl exec -it <name> -n todo-app -- /bin/sh` |
| Events | `kubectl get events -n todo-app --sort-by='.lastTimestamp'` |
| Service endpoints | `kubectl get endpoints -n todo-app` |
| ConfigMap data | `kubectl get configmap todo-config -n todo-app -o yaml` |
| Secret (base64) | `kubectl get secret todo-secrets -n todo-app -o yaml` |
| Resource usage | `kubectl top pods -n todo-app` |
| Helm releases | `helm list -n todo-app` |
| Helm status | `helm status todo-release -n todo-app` |
| Minikube dashboard | `minikube dashboard` |

---

## Getting Help

If issues persist:

1. Check the [deployment guide](./deployment-guide.md) for correct setup
2. Review the [AI tools guide](./ai-tools-guide.md) for AI-assisted troubleshooting
3. Open Minikube dashboard for visual inspection: `minikube dashboard`
4. Collect logs and share with team for assistance

# Quickstart Guide: Phase IV Local Kubernetes Deployment

**Feature**: `004-k8s-local-deployment`
**Date**: 2026-01-20
**Time to Complete**: 30-45 minutes (after prerequisites installed)

## Prerequisites Checklist

Before starting, ensure these tools are installed:

- [ ] Docker Desktop 4.53+ (with Docker Engine running)
- [ ] Minikube (`minikube version`)
- [ ] Helm v3+ (`helm version`)
- [ ] kubectl (`kubectl version --client`)

**Optional AI Tools**:
- [ ] Gordon enabled (Docker Desktop → Settings → Beta features)
- [ ] kubectl-ai (`kubectl ai --version`)
- [ ] Kagent (`kagent --version`)

## Quick Deployment Steps

### Step 1: Start Minikube (2 minutes)

```bash
# Start cluster with adequate resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable metrics addon
minikube addons enable metrics-server

# Verify cluster is running
kubectl cluster-info
```

### Step 2: Build Docker Images (5-10 minutes)

```bash
# Build frontend image
cd frontend
docker build -t todo-frontend:1.0.0 .

# Build backend image
cd ../backend
docker build -t todo-backend:1.0.0 .

# Return to root
cd ..

# Verify images
docker images | grep todo
```

### Step 3: Load Images to Minikube (2 minutes)

```bash
# Load images into Minikube's Docker daemon
minikube image load todo-frontend:1.0.0
minikube image load todo-backend:1.0.0

# Verify images are loaded
minikube image ls | grep todo
```

### Step 4: Create Secrets (1 minute)

```bash
# Create secret with your actual values
kubectl create namespace todo-app

kubectl create secret generic todo-secrets \
  --from-literal=DATABASE_URL='your-neon-database-url' \
  --from-literal=COHERE_API_KEY='your-cohere-api-key' \
  --from-literal=BETTER_AUTH_SECRET='your-auth-secret' \
  -n todo-app
```

### Step 5: Deploy with Helm (2 minutes)

```bash
# Install the Helm chart
helm install todo-release ./helm/todo-chatbot -n todo-app

# Watch pods come up
kubectl get pods -n todo-app -w
```

**Alternative: Deploy with kubectl**
```bash
kubectl apply -f kubernetes/ -n todo-app
```

### Step 6: Access Application (1 minute)

```bash
# Get the service URL
minikube service todo-frontend -n todo-app --url

# Or open directly in browser
minikube service todo-frontend -n todo-app
```

### Step 7: Verify Deployment

```bash
# Check all pods are Running
kubectl get pods -n todo-app

# Check services
kubectl get svc -n todo-app

# Check logs
kubectl logs -l app=todo-backend -n todo-app

# Test health endpoint
kubectl exec -it deployment/todo-backend -n todo-app -- curl localhost:8000/health
```

## Expected Output

After successful deployment:

```
$ kubectl get all -n todo-app

NAME                                READY   STATUS    RESTARTS   AGE
pod/todo-backend-xxx-yyy            1/1     Running   0          2m
pod/todo-backend-xxx-zzz            1/1     Running   0          2m
pod/todo-frontend-aaa-bbb           1/1     Running   0          2m
pod/todo-frontend-aaa-ccc           1/1     Running   0          2m

NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/todo-backend    ClusterIP   10.x.x.x        <none>        8000/TCP       2m
service/todo-frontend   NodePort    10.x.x.x        <none>        80:30080/TCP   2m

NAME                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/todo-backend    2/2     2            2           2m
deployment.apps/todo-frontend   2/2     2            2           2m
```

## Quick Commands Reference

| Task | Command |
|------|---------|
| Check pod status | `kubectl get pods -n todo-app` |
| View pod logs | `kubectl logs -l app=todo-backend -n todo-app` |
| Describe pod | `kubectl describe pod <pod-name> -n todo-app` |
| Exec into pod | `kubectl exec -it <pod-name> -n todo-app -- /bin/sh` |
| Scale deployment | `kubectl scale deployment todo-backend --replicas=3 -n todo-app` |
| Restart deployment | `kubectl rollout restart deployment todo-backend -n todo-app` |
| View Helm releases | `helm list -n todo-app` |
| Upgrade Helm release | `helm upgrade todo-release ./helm/todo-chatbot -n todo-app` |
| Rollback Helm release | `helm rollback todo-release -n todo-app` |
| Delete deployment | `helm uninstall todo-release -n todo-app` |
| Stop Minikube | `minikube stop` |
| Delete Minikube | `minikube delete` |

## Troubleshooting Quick Fixes

### Pods not starting

```bash
# Check events
kubectl get events -n todo-app --sort-by='.lastTimestamp'

# Describe problematic pod
kubectl describe pod <pod-name> -n todo-app
```

### ImagePullBackOff

```bash
# Reload images to Minikube
minikube image load todo-frontend:1.0.0
minikube image load todo-backend:1.0.0
```

### CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n todo-app --previous

# Common causes: missing env vars, database connection issues
```

### Service not accessible

```bash
# Verify service endpoints
kubectl get endpoints -n todo-app

# Try port-forward instead
kubectl port-forward svc/todo-frontend 3000:80 -n todo-app
```

## Clean Up

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

## AI-Assisted Quick Commands

If AI tools are available:

```bash
# Gordon - Optimize Dockerfile
docker ai "Analyze and optimize this Dockerfile for size"

# kubectl-ai - Quick deployment check
kubectl ai "check why pods are failing in todo-app namespace"

# Kagent - Cluster health
kagent "analyze cluster health and identify issues"
```

## Next Steps

1. Test the chat functionality through the frontend
2. Try creating, listing, completing, and deleting tasks
3. Experiment with scaling replicas
4. Review the full deployment guide in `docs/deployment-guide.md`

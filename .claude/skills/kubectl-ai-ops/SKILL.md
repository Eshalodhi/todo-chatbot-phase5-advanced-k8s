# kubectl-ai AI-Assisted Kubernetes Operations Skill

## Overview

This skill teaches Claude how to use kubectl-ai for natural language Kubernetes operations. kubectl-ai is a kubectl plugin that translates natural language commands into Kubernetes operations, making cluster management more intuitive and accessible.

## Installation

### Prerequisites
- kubectl installed and configured
- Krew (kubectl plugin manager) installed
- OpenAI API key (or compatible LLM API)

### Installing Krew (if not installed)
```bash
# macOS/Linux
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

# Add to PATH
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/kubernetes-sigs/krew/releases/latest/download/krew.exe" -OutFile krew.exe
.\krew.exe install krew
```

### Installing kubectl-ai
```bash
# Install via Krew
kubectl krew install ai

# Verify installation
kubectl ai --version
```

### Setting Up API Key
```bash
# Set OpenAI API key (required)
export OPENAI_API_KEY="sk-your-api-key-here"

# Optional: Set in shell profile for persistence
echo 'export OPENAI_API_KEY="sk-your-api-key-here"' >> ~/.bashrc
source ~/.bashrc

# Windows (PowerShell)
$env:OPENAI_API_KEY = "sk-your-api-key-here"

# Or set permanently via System Environment Variables
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-your-api-key-here', 'User')
```

### Alternative LLM Providers
```bash
# Azure OpenAI
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_API_KEY="your-azure-key"

# Local LLM (Ollama)
export KUBECTL_AI_BACKEND="ollama"
export OLLAMA_HOST="http://localhost:11434"
```

## Basic Syntax

### Command Structure
```bash
kubectl ai "<natural language command>"
kubectl ai "<command>" --require-confirmation  # Ask before executing
kubectl ai "<command>" --raw                   # Show YAML without applying
kubectl ai "<command>" -n <namespace>          # Target specific namespace
```

### Interactive Mode
```bash
# Enter interactive mode for multiple commands
kubectl ai --interactive

# In interactive mode:
> deploy a nginx pod
> expose it on port 80
> scale to 3 replicas
> exit
```

## Deployment Commands

### Creating Deployments
```bash
# Basic deployment
kubectl ai "deploy todo frontend with 2 replicas"

# Deployment with image specification
kubectl ai "create deployment for todo-frontend using image myregistry/todo-frontend:v1.0.0 with 3 replicas"

# Deployment with resource limits
kubectl ai "deploy backend api with 2 replicas, 256Mi memory limit and 100m cpu request"

# Deployment with environment variables
kubectl ai "deploy todo-backend with env var DATABASE_URL set to postgres://db:5432/todos"

# Deployment with health checks
kubectl ai "create deployment for api server with liveness probe on /health and readiness probe on /ready"
```

### Updating Deployments
```bash
# Update image
kubectl ai "update todo-frontend deployment to use image version v1.2.0"

# Update replicas
kubectl ai "set replicas for backend deployment to 5"

# Add environment variable
kubectl ai "add environment variable API_KEY to frontend deployment"

# Update resource limits
kubectl ai "increase memory limit for backend to 512Mi"
```

## Scaling Commands

### Manual Scaling
```bash
# Scale specific deployment
kubectl ai "scale backend to handle more load"

# Scale to exact number
kubectl ai "scale todo-frontend to 5 replicas"

# Scale down
kubectl ai "reduce backend replicas to 1 for cost saving"
```

### Autoscaling
```bash
# Create HPA
kubectl ai "create autoscaler for backend that scales between 2 and 10 pods based on 70% CPU"

# Create HPA with memory
kubectl ai "autoscale frontend based on memory usage, min 2 max 8 pods"

# Update HPA
kubectl ai "update autoscaler for backend to max 15 pods"

# Check autoscaler status
kubectl ai "show autoscaling status for all deployments"
```

## Troubleshooting Commands

### Pod Issues
```bash
# Check failing pods
kubectl ai "check why pods are failing"

# Investigate specific pod
kubectl ai "why is the todo-backend-abc123 pod crashing"

# Check pod events
kubectl ai "show recent events for pods in default namespace"

# Debug pending pods
kubectl ai "find out why pods are stuck in pending state"

# Check resource constraints
kubectl ai "are any pods being OOMKilled"
```

### Deployment Issues
```bash
# Check deployment status
kubectl ai "why isn't my deployment progressing"

# Rollout status
kubectl ai "show rollout status for frontend deployment"

# Failed deployments
kubectl ai "find deployments that failed to roll out"
```

### Network Issues
```bash
# Service connectivity
kubectl ai "check if frontend can reach backend service"

# DNS issues
kubectl ai "troubleshoot DNS resolution in the cluster"

# Endpoint issues
kubectl ai "why does my service have no endpoints"
```

## Service Creation

### Exposing Applications
```bash
# ClusterIP service
kubectl ai "expose frontend on port 3000"

# NodePort service
kubectl ai "create NodePort service for backend on port 30080"

# LoadBalancer service
kubectl ai "expose frontend externally using LoadBalancer on port 80"

# Headless service
kubectl ai "create headless service for statefulset database"
```

### Service Configuration
```bash
# Multiple ports
kubectl ai "create service for backend exposing ports 8000 and 8001"

# With specific target port
kubectl ai "expose frontend service port 80 targeting container port 3000"

# Service with selector
kubectl ai "create service that selects pods with label app=api and tier=backend"
```

## Resource Inspection

### Viewing Resources
```bash
# Show resource usage
kubectl ai "show me resource usage"

# CPU/Memory per pod
kubectl ai "display cpu and memory usage for all pods"

# Node resources
kubectl ai "show available resources on each node"

# Resource requests vs limits
kubectl ai "compare requested vs actual resource usage"
```

### Resource Analysis
```bash
# Over-provisioned resources
kubectl ai "find pods using less than 10% of requested CPU"

# Under-provisioned resources
kubectl ai "identify pods frequently hitting memory limits"

# Capacity planning
kubectl ai "how much more capacity do we have in the cluster"
```

### Listing Resources
```bash
# List all resources
kubectl ai "show all resources in production namespace"

# Specific resource types
kubectl ai "list all deployments and their status"

# Resources by label
kubectl ai "find all resources with label team=backend"

# Cross-namespace
kubectl ai "show pods running across all namespaces"
```

## Log Analysis

### Viewing Logs
```bash
# Analyze logs for errors
kubectl ai "analyze logs for errors"

# Specific pod logs
kubectl ai "show last 100 lines of logs from backend pod"

# Logs with errors
kubectl ai "find error messages in frontend pod logs"

# Multi-container logs
kubectl ai "get logs from sidecar container in backend pod"
```

### Log Patterns
```bash
# Search patterns
kubectl ai "find 500 errors in api pod logs from last hour"

# Aggregate analysis
kubectl ai "summarize error types in backend logs"

# Time-based analysis
kubectl ai "show logs around the time pods restarted"
```

## Natural Language to YAML Conversion

### Generating YAML
```bash
# Generate without applying
kubectl ai "create deployment yaml for node.js app with 3 replicas" --raw

# Generate ConfigMap YAML
kubectl ai "generate configmap yaml with database settings" --raw

# Generate complete application YAML
kubectl ai "create full yaml for deploying react app with service and ingress" --raw
```

### YAML Examples
```bash
# Deployment YAML
kubectl ai "show me yaml for a deployment with init container" --raw

# PVC YAML
kubectl ai "generate persistent volume claim yaml for 10Gi storage" --raw

# NetworkPolicy YAML
kubectl ai "create network policy yaml to allow only frontend to reach backend" --raw

# Ingress YAML
kubectl ai "generate ingress yaml for todo app with TLS" --raw
```

## Advanced Operations

### Rollouts
```bash
# Trigger rollout
kubectl ai "restart deployment to pick up new configmap"

# Pause rollout
kubectl ai "pause the ongoing rollout for frontend"

# Resume rollout
kubectl ai "resume paused rollout for frontend"

# Rollback
kubectl ai "rollback backend deployment to previous version"
```

### Jobs and CronJobs
```bash
# Create job
kubectl ai "create one-time job to run database migration"

# Create cronjob
kubectl ai "schedule backup job to run every day at midnight"

# Check job status
kubectl ai "show status of all jobs that ran today"
```

### Secrets and ConfigMaps
```bash
# Create secret
kubectl ai "create secret with database credentials"

# Create configmap
kubectl ai "create configmap from environment file .env"

# Update configmap
kubectl ai "add new key to existing configmap"
```

## Best Practices

### When to Use kubectl-ai

**Use kubectl-ai for:**
- Quick exploratory commands
- Troubleshooting and debugging
- Learning Kubernetes concepts
- Generating boilerplate YAML
- Complex queries about cluster state
- One-off administrative tasks

**Use manual kubectl for:**
- Production deployments (use GitOps)
- Scripted/automated operations
- When exact command control is needed
- Security-sensitive operations
- When API key exposure is a concern

### Safety Practices

```bash
# Always use confirmation for destructive actions
kubectl ai "delete all pods in staging namespace" --require-confirmation

# Preview before applying
kubectl ai "drain node worker-1" --raw

# Use namespaces explicitly
kubectl ai "scale deployment to 0" -n development

# Avoid in production without review
# Bad: kubectl ai "delete failed pods" (in production)
# Good: kubectl ai "show failed pods" --raw  # Review first
```

### Effective Prompts

**Be specific:**
```bash
# Good
kubectl ai "create deployment named todo-api using image myrepo/api:v1.2.3 with 2 replicas and 256Mi memory limit"

# Less effective
kubectl ai "deploy my app"
```

**Include context:**
```bash
# Good
kubectl ai "why are pods in CrashLoopBackOff in the production namespace"

# Less effective
kubectl ai "why are pods failing"
```

**Use domain terminology:**
```bash
# Good
kubectl ai "create HPA for frontend targeting 70% CPU utilization"

# Less effective
kubectl ai "make frontend auto-scale when busy"
```

### Combining with Standard kubectl

```bash
# Generate with AI, review, then apply
kubectl ai "create production-ready deployment for node.js api" --raw > deployment.yaml
# Review deployment.yaml
kubectl apply -f deployment.yaml

# Use AI for discovery, kubectl for action
kubectl ai "find pods using more than 1Gi memory"
# Then manually handle specific pods
kubectl delete pod <identified-pod>
```

## Fallback: Manual kubectl Commands

When kubectl-ai is unavailable, use standard kubectl:

### Common Equivalents
| kubectl-ai | Standard kubectl |
|------------|------------------|
| `kubectl ai "list all pods"` | `kubectl get pods -A` |
| `kubectl ai "show pod logs"` | `kubectl logs <pod>` |
| `kubectl ai "describe failing pod"` | `kubectl describe pod <pod>` |
| `kubectl ai "scale to 3 replicas"` | `kubectl scale deployment/<name> --replicas=3` |
| `kubectl ai "expose on port 80"` | `kubectl expose deployment/<name> --port=80` |
| `kubectl ai "show resource usage"` | `kubectl top pods` |

### Resource Inspection
```bash
kubectl get all -n <namespace>
kubectl describe pod <pod-name>
kubectl logs <pod-name> --tail=100
kubectl top pods
kubectl get events --sort-by=.lastTimestamp
```

### Troubleshooting
```bash
kubectl get pods -o wide
kubectl describe pod <failing-pod>
kubectl logs <pod> --previous
kubectl exec -it <pod> -- /bin/sh
```

## Integration Notes

This skill is used by:
- **AIOps Engineer** - For AI-assisted cluster operations and troubleshooting
- **Helm Engineer** - For generating Kubernetes manifests and debugging deployments

When using kubectl-ai for Phase IV operations:
1. Ensure OPENAI_API_KEY is set in the environment
2. Use `--require-confirmation` for any modifications
3. Use `--raw` to preview YAML before applying
4. Combine with Helm for complex deployments
5. Use manual kubectl for production-critical operations
6. Document generated YAML in version control

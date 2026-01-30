# Kagent Cluster Analysis and Optimization Skill

## Overview

This skill teaches Claude how to use Kagent for Kubernetes cluster health analysis and optimization. Kagent is an AI-powered Kubernetes agent that provides intelligent cluster insights, resource optimization recommendations, security analysis, and proactive issue detection.

## Installation

### Prerequisites
- Kubernetes cluster access (kubectl configured)
- Go 1.21+ (for building from source)
- OpenAI API key or compatible LLM endpoint

### Installation Methods

#### Via Homebrew (macOS/Linux)
```bash
brew tap kagent-dev/kagent
brew install kagent

# Verify installation
kagent --version
```

#### Via Go Install
```bash
go install github.com/kagent-dev/kagent@latest

# Ensure GOPATH/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

#### Via Binary Release
```bash
# Linux/macOS
curl -LO https://github.com/kagent-dev/kagent/releases/latest/download/kagent-$(uname -s)-$(uname -m)
chmod +x kagent-*
sudo mv kagent-* /usr/local/bin/kagent

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/kagent-dev/kagent/releases/latest/download/kagent-windows-amd64.exe" -OutFile kagent.exe
Move-Item kagent.exe C:\Windows\System32\
```

#### Via Kubernetes Deployment
```bash
# Deploy Kagent as a service in cluster
kubectl apply -f https://github.com/kagent-dev/kagent/releases/latest/download/kagent-deployment.yaml

# Access via port-forward
kubectl port-forward svc/kagent 8080:8080 -n kagent-system
```

### Configuration

```bash
# Set API key
export OPENAI_API_KEY="sk-your-api-key"

# Or use config file
cat > ~/.kagent/config.yaml << EOF
llm:
  provider: openai
  apiKey: ${OPENAI_API_KEY}
  model: gpt-4
cluster:
  context: minikube
  namespace: default
analysis:
  depth: comprehensive
  includeMetrics: true
EOF

# Alternative providers
export KAGENT_LLM_PROVIDER="azure"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_API_KEY="your-key"
```

## Cluster Health Analysis

### Comprehensive Health Check
```bash
# Full cluster health analysis
kagent "analyze cluster health"

# Detailed health report
kagent "give me a comprehensive health report of my cluster"

# Health score
kagent "what is my cluster health score"
```

### Component Health
```bash
# Control plane health
kagent "check control plane component health"

# Node health
kagent "analyze health of all nodes"

# Network health
kagent "assess cluster networking health"

# Storage health
kagent "check persistent volume and storage health"
```

### Workload Health
```bash
# Deployment health
kagent "analyze health of all deployments"

# Pod health summary
kagent "summarize pod health across namespaces"

# StatefulSet health
kagent "check statefulset health and readiness"

# DaemonSet coverage
kagent "verify daemonset coverage on all nodes"
```

### Health Monitoring
```bash
# Recent issues
kagent "what issues occurred in the last 24 hours"

# Trending problems
kagent "identify recurring issues in the cluster"

# SLA compliance
kagent "are workloads meeting availability targets"
```

## Resource Optimization

### Resource Analysis
```bash
# Optimize resource allocation
kagent "optimize resource allocation"

# Resource utilization overview
kagent "show resource utilization across the cluster"

# Efficiency analysis
kagent "analyze resource efficiency for all workloads"
```

### CPU Optimization
```bash
# CPU analysis
kagent "identify workloads with inefficient CPU allocation"

# CPU recommendations
kagent "recommend CPU requests and limits for deployments"

# CPU throttling
kagent "find pods being CPU throttled"

# Over-provisioned CPU
kagent "which deployments have significantly over-provisioned CPU"
```

### Memory Optimization
```bash
# Memory analysis
kagent "analyze memory usage patterns"

# Memory recommendations
kagent "suggest optimal memory settings for workloads"

# OOMKilled analysis
kagent "find pods that have been OOMKilled recently"

# Memory leaks
kagent "detect potential memory leak patterns"
```

### Right-Sizing
```bash
# Right-sizing recommendations
kagent "provide right-sizing recommendations for all deployments"

# Specific workload
kagent "right-size the todo-backend deployment based on historical usage"

# Batch recommendations
kagent "generate resource manifests with optimized settings" --output yaml
```

## Performance Analysis

### Latency Analysis
```bash
# Performance overview
kagent "analyze application performance"

# Latency issues
kagent "identify pods with high latency"

# Network performance
kagent "assess network performance between services"
```

### Throughput Analysis
```bash
# Request throughput
kagent "analyze request throughput for services"

# Bottleneck identification
kagent "identify performance bottlenecks"

# Queue analysis
kagent "check for request queuing issues"
```

### Scaling Analysis
```bash
# HPA effectiveness
kagent "evaluate HPA effectiveness for workloads"

# Scaling recommendations
kagent "recommend scaling strategies for todo-frontend"

# Peak load analysis
kagent "analyze behavior during peak load periods"
```

### Performance Recommendations
```bash
# Optimization suggestions
kagent "suggest performance optimizations"

# Priority ranking
kagent "rank performance improvements by impact"

# Quick wins
kagent "identify quick performance wins"
```

## Cost Optimization

### Cost Analysis
```bash
# Cost overview
kagent "analyze cluster cost efficiency"

# Cost breakdown
kagent "break down costs by namespace"

# Cost per workload
kagent "estimate costs for each deployment"
```

### Cost Reduction
```bash
# Cost savings opportunities
kagent "identify cost saving opportunities"

# Idle resources
kagent "find unused or idle resources"

# Over-provisioned resources
kagent "list over-provisioned workloads wasting money"

# Spot instance candidates
kagent "identify workloads suitable for spot instances"
```

### Cost Recommendations
```bash
# Actionable recommendations
kagent "provide actionable cost reduction recommendations"

# Savings estimates
kagent "estimate monthly savings from recommended changes"

# Priority by savings
kagent "rank cost optimizations by potential savings"
```

### Reserved Capacity
```bash
# Reservation recommendations
kagent "recommend reserved capacity purchases"

# Commitment analysis
kagent "analyze savings from committed use discounts"
```

## Capacity Planning

### Current Capacity
```bash
# Capacity overview
kagent "analyze current cluster capacity"

# Available headroom
kagent "how much spare capacity exists in the cluster"

# Node utilization
kagent "show utilization percentage per node"
```

### Growth Projections
```bash
# Capacity forecasting
kagent "project capacity needs for next 30 days"

# Growth trends
kagent "analyze resource usage growth trends"

# Scaling triggers
kagent "when will we need to add more capacity"
```

### Capacity Recommendations
```bash
# Node recommendations
kagent "recommend optimal node configuration"

# Cluster expansion
kagent "plan for 50% workload increase"

# Node pool sizing
kagent "suggest node pool sizes for workload types"
```

### Scheduling Analysis
```bash
# Scheduling constraints
kagent "identify scheduling bottlenecks"

# Pod placement
kagent "analyze pod distribution across nodes"

# Affinity issues
kagent "check for affinity/anti-affinity problems"
```

## Security Posture Analysis

### Security Overview
```bash
# Security assessment
kagent "analyze cluster security posture"

# Security score
kagent "what is my cluster security score"

# Compliance check
kagent "check security compliance status"
```

### Vulnerability Analysis
```bash
# Image vulnerabilities
kagent "scan for container image vulnerabilities"

# CVE analysis
kagent "identify critical CVEs in running containers"

# Outdated images
kagent "find deployments using outdated base images"
```

### Configuration Security
```bash
# Security misconfigurations
kagent "identify security misconfigurations"

# Privileged containers
kagent "find containers running as privileged"

# Security contexts
kagent "audit pod security contexts"

# Network policies
kagent "assess network policy coverage"
```

### RBAC Analysis
```bash
# RBAC audit
kagent "audit RBAC permissions"

# Over-privileged accounts
kagent "identify over-privileged service accounts"

# Unused permissions
kagent "find unused RBAC permissions"
```

### Secrets Management
```bash
# Secrets audit
kagent "audit secrets management practices"

# Exposed secrets
kagent "check for exposed secrets in configs"

# Secret rotation
kagent "identify secrets needing rotation"
```

## Best Practices Analysis

### Kubernetes Best Practices
```bash
# Best practices audit
kagent "audit cluster against Kubernetes best practices"

# Deviation report
kagent "report deviations from best practices"

# Priority fixes
kagent "prioritize best practice violations to fix"
```

### Application Best Practices
```bash
# 12-factor compliance
kagent "check 12-factor app compliance"

# Health check coverage
kagent "audit health check implementation"

# Logging practices
kagent "assess logging best practices"
```

### Operational Best Practices
```bash
# Label compliance
kagent "check labeling standards compliance"

# Resource quotas
kagent "audit resource quota implementation"

# Namespace organization
kagent "evaluate namespace organization"
```

### Recommendations Report
```bash
# Full recommendations
kagent "generate comprehensive best practices report"

# Executive summary
kagent "summarize top 10 improvements needed"

# Implementation plan
kagent "create implementation plan for recommendations"
```

## Proactive Issue Detection

### Anomaly Detection
```bash
# Detect anomalies
kagent "detect anomalies in cluster behavior"

# Unusual patterns
kagent "identify unusual resource consumption patterns"

# Behavior changes
kagent "alert on significant behavior changes"
```

### Predictive Analysis
```bash
# Predict issues
kagent "predict potential issues in next 24 hours"

# Risk assessment
kagent "assess risk of upcoming deployments"

# Failure prediction
kagent "identify workloads likely to fail"
```

### Alerting Recommendations
```bash
# Alert gaps
kagent "identify gaps in alerting coverage"

# Alert tuning
kagent "suggest alert threshold adjustments"

# New alerts
kagent "recommend new alerts to add"
```

### Incident Prevention
```bash
# Preventive actions
kagent "suggest preventive actions to avoid incidents"

# Risk mitigation
kagent "create risk mitigation plan"

# Pre-deployment checks
kagent "check readiness before deploying changes"
```

## Interpreting Kagent Recommendations

### Recommendation Format
Kagent typically provides recommendations in this format:
```
[SEVERITY] Category: Issue Description
  Impact: Description of the impact
  Current: Current state/value
  Recommended: Suggested action/value
  Effort: Low/Medium/High
  Savings: (for cost recommendations)
```

### Severity Levels
- **CRITICAL**: Immediate action required, affects availability/security
- **HIGH**: Should be addressed soon, significant impact
- **MEDIUM**: Plan to address, moderate impact
- **LOW**: Nice to have, minimal impact
- **INFO**: Informational, no action needed

### Acting on Recommendations
```bash
# Get actionable YAML
kagent "generate fix for critical recommendations" --output yaml

# Implementation order
kagent "suggest order for implementing recommendations"

# Validate changes
kagent "validate proposed changes before applying"
```

### Tracking Progress
```bash
# Baseline comparison
kagent "compare current state to last week's baseline"

# Improvement tracking
kagent "show improvement in cluster health over time"

# Recommendation completion
kagent "list completed vs pending recommendations"
```

## Kagent vs kubectl-ai

### When to Use Kagent

**Use Kagent for:**
- Cluster-wide health analysis
- Resource optimization recommendations
- Cost analysis and reduction strategies
- Security posture assessment
- Capacity planning and forecasting
- Best practices audits
- Proactive issue detection
- Trend analysis and reporting

### When to Use kubectl-ai

**Use kubectl-ai for:**
- Executing Kubernetes commands
- Creating/updating resources
- Troubleshooting specific issues
- Interactive cluster operations
- Quick one-off queries
- Generating YAML manifests
- Deployment operations

### Combined Workflow
```bash
# 1. Analyze with Kagent
kagent "analyze cluster health and identify issues"

# 2. Get specific recommendations
kagent "recommend fixes for identified issues"

# 3. Execute fixes with kubectl-ai
kubectl ai "apply recommended resource limits to backend deployment"

# 4. Verify with Kagent
kagent "verify improvements after changes"
```

## Integration Notes

This skill is used by the **AIOps Engineer** agent for:
- Comprehensive cluster health monitoring
- Resource optimization for Todo Chatbot deployments
- Cost analysis and optimization
- Security posture assessment
- Capacity planning for scaling

When the AIOps Engineer encounters cluster analysis tasks:
1. Use Kagent for comprehensive analysis and recommendations
2. Interpret severity levels to prioritize actions
3. Use kubectl-ai to execute recommended changes
4. Verify improvements with follow-up Kagent analysis
5. Document significant recommendations in ADRs when applicable
6. Track cluster health trends over time

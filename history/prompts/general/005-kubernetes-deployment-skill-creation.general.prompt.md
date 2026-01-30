---
id: 005
title: Kubernetes Deployment Skill Creation
stage: general
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: null
labels: ["kubernetes", "deployment", "manifests", "yaml", "skill", "phase-iv"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/kubernetes-deployment/SKILL.md
tests:
  - null
---

## Prompt

Create skill for Kubernetes deployment manifests.

Location: .claude/skills/kubernetes-deployment/SKILL.md

Skill Purpose:
Teach Claude how to create Kubernetes deployment manifests for Phase IV.

Skill Content:
- Deployment YAML structure and syntax
- Service YAML structure (ClusterIP, NodePort, LoadBalancer)
- ConfigMap for environment variables
- Secret for sensitive data (API keys, passwords)
- Environment variables in pod specs
- Resource limits and requests (CPU, memory)
- Liveness and readiness probes
- Labels and selectors for service discovery
- Namespace management
- Applying manifests (kubectl apply -f)
- Viewing resources (kubectl get, describe, logs)
- Debugging (kubectl exec, kubectl port-forward)
Integration: Used by Kubernetes Engineer and Helm Engineer

## Response snapshot

Created comprehensive Kubernetes deployment manifests skill at `.claude/skills/kubernetes-deployment/SKILL.md` containing:
- Deployment YAML: basic and complete structures with all options, deployment strategies (RollingUpdate, Recreate)
- Service YAML: all types (ClusterIP, NodePort, LoadBalancer, Headless, Multi-port) with annotations
- ConfigMap: key-value pairs, multi-line configs, JSON configs, usage as env vars and volume mounts
- Secret: Opaque, Docker registry, TLS types with kubectl creation commands
- Resource management: CPU/memory units table, guidelines by workload type, ResourceQuota, LimitRange
- Health probes: liveness, readiness, startup with HTTP/TCP/exec examples and comparison table
- Labels and selectors: standard Kubernetes labels, equality and set-based selectors, service discovery patterns
- Namespace management: creation, resource limits, kubectl namespace commands
- Applying manifests: kubectl apply variations, dry-run, diff, Kustomize
- Viewing resources: kubectl get, describe, logs with all common options
- Debugging: exec, port-forward, events, troubleshooting checklist
- Complete Todo App manifest example with namespace, configmap, secret, deployments, and services
- Integration notes for Kubernetes Engineer and Helm Engineer agents

## Outcome

- Impact: Added skill documentation enabling Claude to create complete Kubernetes deployment manifests
- Tests: N/A (documentation only)
- Files: 1 file created (.claude/skills/kubernetes-deployment/SKILL.md)
- Next prompts: Begin Phase IV manifest creation for Todo Chatbot deployment
- Reflection: Skill provides comprehensive Kubernetes manifest coverage with practical examples and troubleshooting guidance

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test skill integration with Kubernetes Engineer agent during actual manifest creation

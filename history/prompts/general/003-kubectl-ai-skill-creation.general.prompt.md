---
id: 003
title: kubectl-ai Skill Creation
stage: general
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: null
labels: ["kubectl-ai", "kubernetes", "ai-ops", "skill", "phase-iv", "natural-language"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/kubectl-ai-ops/SKILL.md
tests:
  - null
---

## Prompt

Create skill for kubectl-ai AI-assisted Kubernetes operations.

Location: .claude/skills/kubectl-ai-ops/SKILL.md

Skill Purpose:
Teach Claude how to use kubectl-ai for natural language Kubernetes commands.

Skill Content:
- Installing kubectl-ai (kubectl krew install ai)
- Setting up OpenAI API key (export OPENAI_API_KEY=...)
- Basic kubectl-ai syntax
- Deployment commands: kubectl ai "deploy todo frontend with 2 replicas"
- Scaling commands: kubectl ai "scale backend to handle more load"
- Troubleshooting: kubectl ai "check why pods are failing"
- Service creation: kubectl ai "expose frontend on port 3000"
- Resource inspection: kubectl ai "show me resource usage"
- Log analysis: kubectl ai "analyze logs for errors"
- Natural language to Kubernetes YAML conversion
- Best practices for AI-assisted operations
- When to use kubectl-ai vs manual kubectl
Integration: Used by AIOps Engineer and Helm Engineer

## Response snapshot

Created comprehensive kubectl-ai skill at `.claude/skills/kubectl-ai-ops/SKILL.md` containing:
- Full installation guide including Krew setup for macOS/Linux/Windows
- API key configuration for OpenAI, Azure OpenAI, and local Ollama
- Basic syntax documentation with interactive mode
- Extensive deployment commands: creating, updating, with images/resources/env vars/health checks
- Scaling commands: manual scaling and HPA autoscaling configuration
- Troubleshooting commands for pods, deployments, and network issues
- Service creation for all service types (ClusterIP, NodePort, LoadBalancer, headless)
- Resource inspection and analysis commands
- Log analysis patterns and time-based queries
- Natural language to YAML conversion with --raw flag
- Advanced operations: rollouts, jobs, cronjobs, secrets, configmaps
- Best practices including when to use kubectl-ai vs manual kubectl
- Safety practices with --require-confirmation and namespace targeting
- Effective prompt writing guidelines
- Fallback manual kubectl command equivalents table
- Integration notes for AIOps Engineer and Helm Engineer agents

## Outcome

- Impact: Added skill documentation enabling Claude to use kubectl-ai for natural language Kubernetes operations
- Tests: N/A (documentation only)
- Files: 1 file created (.claude/skills/kubectl-ai-ops/SKILL.md)
- Next prompts: Create Kagent skill, begin Phase IV AIOps operations
- Reflection: Skill provides comprehensive kubectl-ai coverage with appropriate safety guidelines and fallback procedures

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test skill integration with AIOps Engineer agent during actual cluster operations

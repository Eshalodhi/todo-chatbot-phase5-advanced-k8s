---
id: 004
title: Kagent Skill Creation
stage: general
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: null
labels: ["kagent", "kubernetes", "cluster-analysis", "optimization", "skill", "phase-iv", "aiops"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/kagent-analysis/SKILL.md
tests:
  - null
---

## Prompt

Create skill for Kagent cluster analysis and optimization.

Location: .claude/skills/kagent-analysis/SKILL.md

Skill Purpose:
Teach Claude how to use Kagent for Kubernetes cluster health and optimization.

Skill Content:
- Installing Kagent
- Cluster health analysis: kagent "analyze cluster health"
- Resource optimization: kagent "optimize resource allocation"
- Performance analysis and recommendations
- Cost optimization suggestions
- Capacity planning insights
- Security posture analysis
- Best practices recommendations
- Proactive issue detection
- When to use Kagent vs kubectl-ai (Kagent for analysis, kubectl-ai for operations)
- Interpreting Kagent recommendations

Integration: Used by AIOps Engineer for cluster optimization

## Response snapshot

Created comprehensive Kagent skill at `.claude/skills/kagent-analysis/SKILL.md` containing:
- Full installation guide: Homebrew, Go install, binary release, Kubernetes deployment
- Configuration options for OpenAI and Azure providers
- Cluster health analysis: comprehensive checks, component health, workload health, monitoring
- Resource optimization: CPU/memory analysis, right-sizing, efficiency recommendations
- Performance analysis: latency, throughput, scaling, bottleneck identification
- Cost optimization: analysis, reduction strategies, savings estimates, reserved capacity planning
- Capacity planning: current capacity, growth projections, node recommendations, scheduling analysis
- Security posture: vulnerability scanning, configuration security, RBAC audit, secrets management
- Best practices: Kubernetes, application, and operational audits with priority fixes
- Proactive issue detection: anomaly detection, predictive analysis, alerting gaps, incident prevention
- Interpreting recommendations: severity levels, acting on recommendations, tracking progress
- Clear comparison of Kagent vs kubectl-ai with usage guidelines
- Combined workflow example showing Kagent analysis → kubectl-ai execution → Kagent verification
- Integration notes for AIOps Engineer agent usage

## Outcome

- Impact: Added skill documentation enabling Claude to use Kagent for comprehensive Kubernetes cluster analysis and optimization
- Tests: N/A (documentation only)
- Files: 1 file created (.claude/skills/kagent-analysis/SKILL.md)
- Next prompts: Begin Phase IV cluster operations, run health analysis on Todo Chatbot deployments
- Reflection: Skill provides extensive Kagent coverage with clear delineation from kubectl-ai usage and actionable recommendation interpretation

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test skill integration with AIOps Engineer agent during actual cluster analysis tasks

---
id: 002
title: Helm Charts Skill Creation
stage: general
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: null
labels: ["helm", "kubernetes", "charts", "skill", "phase-iv", "package-management"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/helm-charts/SKILL.md
tests:
  - null
---

## Prompt

Create skill for Helm charts creation and deployment.

Location: .claude/skills/helm-charts/SKILL.md

Skill Purpose:
Teach Claude how to create and use Helm charts for Kubernetes package management.

Skill Content:
- Helm chart structure (Chart.yaml, values.yaml, templates/ folder)
- Creating new chart (helm create chart-name)
- Chart.yaml metadata (name, version, description)
- values.yaml for configuration
- Template syntax (Go templates with Helm functions)
- Common templates (Deployment, Service, ConfigMap, Secret)
- Template functions (.Values, .Release, .Chart)
- Installing charts (helm install release-name chart-path)
- Upgrading releases (helm upgrade release-name chart-path)
- Rolling back (helm rollback release-name revision)
- Listing releases (helm list)
- Using kubectl-ai or Kagent to generate charts
- Best practices for chart organization and versioning

Integration: Used by Helm Engineer for packaging Todo Chatbot

## Response snapshot

Created comprehensive Helm charts skill at `.claude/skills/helm-charts/SKILL.md` containing:
- Complete chart structure documentation with directory layout
- Chart.yaml metadata configuration with versioning conventions
- Extensive values.yaml structure covering replicas, images, services, ingress, resources, autoscaling, probes, and security contexts
- Full Go template syntax documentation including accessing values, control structures, and common functions
- Complete template examples for Deployment, Service, ConfigMap, Secret, and _helpers.tpl
- All essential Helm commands: install, upgrade, rollback, list, history, status, lint, template, package
- kubectl-ai and Kagent integration for AI-assisted chart generation and analysis
- Best practices for chart organization, versioning, templating, and security
- Integration notes for Helm Engineer agent usage

## Outcome

- Impact: Added skill documentation enabling Claude to create and manage Helm charts for Kubernetes deployments
- Tests: N/A (documentation only)
- Files: 1 file created (.claude/skills/helm-charts/SKILL.md)
- Next prompts: Create AIOps engineer skill, begin Phase IV Helm chart creation for Todo Chatbot
- Reflection: Skill provides comprehensive Helm coverage from basic chart creation to advanced templating and best practices

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test skill integration with Helm Engineer agent during actual chart creation tasks

---
id: 001
title: Docker Gordon Skill Creation
stage: general
date: 2026-01-20
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: null
user: user
command: /agents
labels: ["docker", "gordon", "skill", "phase-iv", "ai-agent"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/docker-gordon/SKILL.md
tests:
  - null
---

## Prompt

Create skill for Docker AI Agent (Gordon).

Location: .claude/skills/docker-gordon/SKILL.md

Skill Purpose:
Teach Claude how to use Docker AI Agent (Gordon) for intelligent Docker operations in Phase IV.

Skill Content:
- What is Gordon (Docker AI Agent introduced in Docker Desktop 4.53+)
- How to enable Gordon (Docker Desktop → Settings → Beta features → Toggle ON)
- Gordon capabilities and use cases
- Natural language Docker commands
- AI-assisted Dockerfile generation
- AI-assisted image optimization
- Security analysis with Gordon
- Example commands: docker ai "What can you do?"
- Example: docker ai "Create Dockerfile for Next.js production app"
- Example: docker ai "Optimize this Dockerfile for size"
- Example: docker ai "Analyze security vulnerabilities"
- Fallback when Gordon unavailable (standard Docker CLI)
- Best practices for AI-assisted containerization

Integration: Used by Docker Engineer for Phase III app containerization

## Response snapshot

Created comprehensive Docker Gordon skill at `.claude/skills/docker-gordon/SKILL.md` containing:
- Overview of Gordon as Docker's AI assistant (Desktop 4.53+)
- Step-by-step enabling instructions via Docker Desktop settings
- Full capability documentation: natural language commands, Dockerfile generation, optimization, security analysis, troubleshooting
- Extensive example commands for each capability
- Complete fallback procedures using standard Docker CLI when Gordon unavailable
- Manual best practices checklist for optimization
- AI-assisted containerization best practices including prompt specificity, iteration, and verification
- Integration notes for Docker Engineer agent usage in Phase IV

## Outcome

- Impact: Added skill documentation enabling Claude to use Docker AI Agent for intelligent containerization
- Tests: N/A (documentation only)
- Files: 1 file created (.claude/skills/docker-gordon/SKILL.md)
- Next prompts: Create Kubernetes engineer skill, Helm engineer skill, or begin Phase IV containerization
- Reflection: Skill provides comprehensive coverage of Gordon capabilities with appropriate fallbacks for environments where Gordon is unavailable

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test skill integration with Docker Engineer agent during actual containerization tasks

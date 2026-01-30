# Docker AI Agent (Gordon) Skill

## Overview

This skill teaches Claude how to use Docker AI Agent (Gordon) for intelligent Docker operations. Gordon is Docker's built-in AI assistant introduced in Docker Desktop 4.53+ that enables natural language interactions for container operations.

## What is Gordon?

Gordon is Docker's AI-powered assistant that:
- Understands natural language Docker commands
- Generates optimized Dockerfiles
- Analyzes container images for security vulnerabilities
- Provides intelligent troubleshooting assistance
- Suggests performance and size optimizations

## Enabling Gordon

### Prerequisites
- Docker Desktop 4.53 or later
- Active Docker Desktop subscription (Pro, Team, or Business)

### Activation Steps
1. Open Docker Desktop
2. Navigate to **Settings** (gear icon)
3. Select **Beta features** tab
4. Toggle **Docker AI Agent (Gordon)** to ON
5. Restart Docker Desktop if prompted

### Verification
```bash
docker ai "What can you do?"
```

If Gordon responds with its capabilities, it's properly enabled.

## Gordon Capabilities

### 1. Natural Language Docker Commands
Convert plain English to Docker commands:
```bash
docker ai "List all running containers"
docker ai "Stop all containers"
docker ai "Show disk usage by images"
docker ai "Remove all dangling images"
```

### 2. Dockerfile Generation
Generate production-ready Dockerfiles:
```bash
docker ai "Create Dockerfile for Next.js production app"
docker ai "Create Dockerfile for FastAPI with Python 3.11"
docker ai "Create multi-stage Dockerfile for Go application"
```

### 3. Image Optimization
Optimize existing Dockerfiles for size and performance:
```bash
docker ai "Optimize this Dockerfile for size" < Dockerfile
docker ai "Reduce layers in my Dockerfile"
docker ai "Convert to multi-stage build for smaller image"
```

### 4. Security Analysis
Analyze images for vulnerabilities:
```bash
docker ai "Analyze security vulnerabilities in myimage:latest"
docker ai "Check for CVEs in my container"
docker ai "Suggest security improvements for this Dockerfile"
```

### 5. Troubleshooting
Debug container issues:
```bash
docker ai "Why won't my container start?"
docker ai "Debug networking issues between containers"
docker ai "Explain this Docker error: <error message>"
```

### 6. Best Practices
Get recommendations:
```bash
docker ai "Review my Dockerfile for best practices"
docker ai "How should I structure my docker-compose.yml?"
docker ai "What's the best base image for Node.js apps?"
```

## Example Commands for Phase IV

### Creating Dockerfiles for Todo Chatbot

**Frontend (Next.js)**:
```bash
docker ai "Create optimized multi-stage Dockerfile for Next.js 14 app with standalone output"
```

**Backend (FastAPI)**:
```bash
docker ai "Create multi-stage Dockerfile for FastAPI with Python 3.11, uvicorn, and health checks"
```

### Optimization Workflow
```bash
# Generate initial Dockerfile
docker ai "Create Dockerfile for FastAPI production app"

# Build and check size
docker build -t myapp:v1 .
docker images myapp:v1

# Request optimization
docker ai "Optimize this image to be under 200MB" < Dockerfile

# Analyze security
docker ai "Scan myapp:v1 for security issues"
```

### Compose File Generation
```bash
docker ai "Create docker-compose.yml for frontend and backend with shared network"
```

## Fallback: Standard Docker CLI

When Gordon is unavailable (older Docker Desktop, disabled, or no subscription), use standard Docker CLI:

### Dockerfile Best Practices (Manual)
```dockerfile
# Use specific version tags
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency files first (layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### Manual Security Scanning
```bash
# Using Docker Scout (built-in)
docker scout cves myimage:latest

# Using Trivy
trivy image myimage:latest
```

### Manual Optimization Checklist
- [ ] Use multi-stage builds
- [ ] Use alpine or slim base images
- [ ] Combine RUN commands to reduce layers
- [ ] Order COPY commands by change frequency
- [ ] Use .dockerignore file
- [ ] Don't install unnecessary packages
- [ ] Clean up in the same layer as install

## Best Practices for AI-Assisted Containerization

### 1. Be Specific in Prompts
```bash
# Good
docker ai "Create Dockerfile for Python 3.11 FastAPI app with poetry, multi-stage build, non-root user, and health check"

# Less effective
docker ai "Create Python Dockerfile"
```

### 2. Iterate and Refine
```bash
# Start with generation
docker ai "Create Dockerfile for Node.js app"

# Then optimize
docker ai "Make this Dockerfile smaller using alpine"

# Then secure
docker ai "Add non-root user and security best practices"
```

### 3. Verify Generated Content
Always review and test generated Dockerfiles:
```bash
# Build and test
docker build -t test:latest .
docker run --rm test:latest

# Check image size
docker images test:latest

# Scan for vulnerabilities
docker scout cves test:latest
```

### 4. Combine with Existing Knowledge
Use Gordon alongside documentation:
```bash
# Ask for explanations
docker ai "Explain what each line in this Dockerfile does"

# Ask for alternatives
docker ai "What are the tradeoffs between alpine and debian-slim?"
```

## Integration Notes

This skill is used by the **Docker Engineer** agent for:
- Containerizing Phase III Todo Chatbot applications
- Creating optimized multi-stage builds
- Implementing container security best practices
- Generating docker-compose configurations

When the Docker Engineer encounters containerization tasks, it should:
1. Check if Gordon is available (`docker ai "hello"`)
2. Use Gordon for intelligent Dockerfile generation if available
3. Fall back to manual best practices if Gordon is unavailable
4. Always verify and test generated configurations

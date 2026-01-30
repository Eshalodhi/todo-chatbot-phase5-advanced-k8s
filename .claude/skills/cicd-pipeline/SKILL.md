# CI/CD Pipeline Skill

## Purpose

Guide for implementing CI/CD pipelines using GitHub Actions for the Phase II Todo Chatbot application. Covers automated testing, Docker image building, container registry publishing, Kubernetes deployment, and secrets management.

## Technology Stack

- **GitHub Actions** - CI/CD automation
- **Docker** - Container builds with multi-stage
- **Container Registries** - DOCR, GAR, ACR, GHCR
- **kubectl** - Kubernetes deployments
- **Helm** - Package deployments
- **pytest/vitest** - Testing frameworks

---

## Project Structure

```
.github/
├── workflows/
│   ├── ci.yml                    # Continuous Integration
│   ├── cd-staging.yml            # Deploy to staging
│   ├── cd-production.yml         # Deploy to production
│   ├── docker-build.yml          # Build and push images
│   ├── pr-checks.yml             # Pull request checks
│   └── release.yml               # Release workflow
├── actions/
│   └── setup-tools/
│       └── action.yml            # Reusable setup action
└── CODEOWNERS                    # Code review requirements
```

---

## Continuous Integration Workflow

### Complete CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  PYTHON_VERSION: "3.11"
  NODE_VERSION: "20"

jobs:
  # ============================================================
  # Backend Tests (Python/FastAPI)
  # ============================================================
  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run linting
        run: |
          pip install ruff
          ruff check .
          ruff format --check .

      - name: Run type checking
        run: |
          pip install mypy
          mypy . --ignore-missing-imports

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          BETTER_AUTH_SECRET: test-secret-for-ci-minimum-32-chars
          ENVIRONMENT: test
        run: |
          pytest --cov=. --cov-report=xml --cov-report=html -v

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
          flags: backend
          fail_ci_if_error: false

      - name: Upload coverage artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: backend/htmlcov/

  # ============================================================
  # Frontend Tests (Next.js)
  # ============================================================
  frontend-test:
    name: Frontend Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test -- --coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          fail_ci_if_error: false

  # ============================================================
  # E2E Tests
  # ============================================================
  e2e-test:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Playwright
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Start services with Docker Compose
        run: |
          docker compose -f docker-compose.test.yml up -d
          sleep 30  # Wait for services to be ready

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/

      - name: Stop services
        if: always()
        run: docker compose -f docker-compose.test.yml down

  # ============================================================
  # Security Scanning
  # ============================================================
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: "trivy-results.sarif"

      - name: Run Snyk security scan
        uses: snyk/actions/python@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # ============================================================
  # Build Verification
  # ============================================================
  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: false
          tags: task-service:test
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: false
          tags: frontend:test
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Docker Build and Push

### Multi-Registry Build Workflow

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Images

on:
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production

env:
  # Registry configuration
  GHCR_REGISTRY: ghcr.io
  DOCR_REGISTRY: registry.digitalocean.com/todo-chatbot
  GAR_REGISTRY: us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/todo-chatbot
  ACR_REGISTRY: ${{ secrets.ACR_NAME }}.azurecr.io

jobs:
  # ============================================================
  # Determine version and tags
  # ============================================================
  prepare:
    name: Prepare Build
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
      sha_short: ${{ steps.version.outputs.sha_short }}
      tags: ${{ steps.meta.outputs.tags }}
      labels: ${{ steps.meta.outputs.labels }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine version
        id: version
        run: |
          if [[ $GITHUB_REF == refs/tags/v* ]]; then
            VERSION=${GITHUB_REF#refs/tags/v}
          else
            VERSION=$(git describe --tags --always --dirty)
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

  # ============================================================
  # Build Backend Image
  # ============================================================
  build-backend:
    name: Build Backend
    runs-on: ubuntu-latest
    needs: prepare
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Login to multiple registries
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.GHCR_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Login to DigitalOcean Registry
        uses: docker/login-action@v3
        if: secrets.DIGITALOCEAN_ACCESS_TOKEN != ''
        with:
          registry: registry.digitalocean.com
          username: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          password: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Login to Google Artifact Registry
        uses: docker/login-action@v3
        if: secrets.GCP_SA_KEY != ''
        with:
          registry: us-central1-docker.pkg.dev
          username: _json_key
          password: ${{ secrets.GCP_SA_KEY }}

      - name: Login to Azure Container Registry
        uses: docker/login-action@v3
        if: secrets.ACR_USERNAME != ''
        with:
          registry: ${{ env.ACR_REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/task-service:${{ needs.prepare.outputs.version }}
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/task-service:${{ needs.prepare.outputs.sha_short }}
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/task-service:latest
          labels: ${{ needs.prepare.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ needs.prepare.outputs.version }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
            VCS_REF=${{ github.sha }}

      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/task-service:${{ needs.prepare.outputs.sha_short }}
          format: "sarif"
          output: "trivy-backend.sarif"

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: "trivy-backend.sarif"

  # ============================================================
  # Build Frontend Image
  # ============================================================
  build-frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    needs: prepare
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.GHCR_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/frontend:${{ needs.prepare.outputs.version }}
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/frontend:${{ needs.prepare.outputs.sha_short }}
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=${{ vars.API_URL }}

  # ============================================================
  # Build Notification Service
  # ============================================================
  build-notification:
    name: Build Notification Service
    runs-on: ubuntu-latest
    needs: prepare
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.GHCR_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push notification service
        uses: docker/build-push-action@v5
        with:
          context: ./services/notification
          file: ./services/notification/Dockerfile
          push: true
          tags: |
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/notification-service:${{ needs.prepare.outputs.version }}
            ${{ env.GHCR_REGISTRY }}/${{ github.repository }}/notification-service:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Kubernetes Deployment

### Staging Deployment Workflow

```yaml
# .github/workflows/cd-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

env:
  CLUSTER_NAME: todo-chatbot-staging
  NAMESPACE: staging

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.todo-chatbot.example.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Get image tag
        id: tag
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      # ============================================================
      # Option 1: DigitalOcean Kubernetes
      # ============================================================
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Configure kubectl for DOKS
        run: doctl kubernetes cluster kubeconfig save ${{ env.CLUSTER_NAME }}

      # ============================================================
      # Option 2: Google Kubernetes Engine
      # ============================================================
      # - name: Authenticate to Google Cloud
      #   uses: google-github-actions/auth@v2
      #   with:
      #     credentials_json: ${{ secrets.GCP_SA_KEY }}
      #
      # - name: Configure kubectl for GKE
      #   uses: google-github-actions/get-gke-credentials@v2
      #   with:
      #     cluster_name: ${{ env.CLUSTER_NAME }}
      #     location: us-central1

      # ============================================================
      # Option 3: Azure Kubernetes Service
      # ============================================================
      # - name: Azure Login
      #   uses: azure/login@v2
      #   with:
      #     creds: ${{ secrets.AZURE_CREDENTIALS }}
      #
      # - name: Configure kubectl for AKS
      #   uses: azure/aks-set-context@v3
      #   with:
      #     resource-group: todo-chatbot-rg
      #     cluster-name: ${{ env.CLUSTER_NAME }}

      # ============================================================
      # Deploy with kubectl
      # ============================================================
      - name: Create namespace if not exists
        run: |
          kubectl create namespace ${{ env.NAMESPACE }} --dry-run=client -o yaml | kubectl apply -f -

      - name: Update image tags in manifests
        run: |
          cd kubernetes/staging
          kustomize edit set image \
            task-service=ghcr.io/${{ github.repository }}/task-service:${{ steps.tag.outputs.tag }} \
            frontend=ghcr.io/${{ github.repository }}/frontend:${{ steps.tag.outputs.tag }} \
            notification-service=ghcr.io/${{ github.repository }}/notification-service:${{ steps.tag.outputs.tag }}

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -k kubernetes/staging -n ${{ env.NAMESPACE }}

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/task-service -n ${{ env.NAMESPACE }} --timeout=300s
          kubectl rollout status deployment/frontend -n ${{ env.NAMESPACE }} --timeout=300s
          kubectl rollout status deployment/notification-service -n ${{ env.NAMESPACE }} --timeout=300s

      - name: Run smoke tests
        run: |
          # Wait for services to be ready
          sleep 30

          # Get ingress URL
          INGRESS_IP=$(kubectl get ingress -n ${{ env.NAMESPACE }} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')

          # Health check
          curl -f http://$INGRESS_IP/health || exit 1

      - name: Notify on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Staging deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment Successful*\n\nCommit: `${{ steps.tag.outputs.tag }}`\nEnvironment: staging\nURL: https://staging.todo-chatbot.example.com"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "❌ Staging deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment Failed*\n\nCommit: `${{ steps.tag.outputs.tag }}`\nWorkflow: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Production Deployment Workflow

```yaml
# .github/workflows/cd-production.yml
name: Deploy to Production

on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      version:
        description: "Version to deploy"
        required: true

env:
  CLUSTER_NAME: todo-chatbot-production
  NAMESPACE: production

jobs:
  # ============================================================
  # Pre-deployment checks
  # ============================================================
  pre-deploy:
    name: Pre-deployment Checks
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine version
        id: version
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "version=${{ github.event.inputs.version }}" >> $GITHUB_OUTPUT
          else
            echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
          fi

      - name: Verify image exists
        run: |
          # Check if image exists in registry
          docker manifest inspect ghcr.io/${{ github.repository }}/task-service:${{ steps.version.outputs.version }}

  # ============================================================
  # Approval gate
  # ============================================================
  approval:
    name: Approval Required
    runs-on: ubuntu-latest
    needs: pre-deploy
    environment:
      name: production-approval

    steps:
      - name: Approval granted
        run: echo "Deployment approved for version ${{ needs.pre-deploy.outputs.version }}"

  # ============================================================
  # Deploy to production
  # ============================================================
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [pre-deploy, approval]
    environment:
      name: production
      url: https://todo-chatbot.example.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Configure kubectl
        run: doctl kubernetes cluster kubeconfig save ${{ env.CLUSTER_NAME }}

      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: "3.14.0"

      # ============================================================
      # Deploy with Helm
      # ============================================================
      - name: Deploy backend with Helm
        run: |
          helm upgrade --install task-service ./helm/task-service \
            --namespace ${{ env.NAMESPACE }} \
            --set image.tag=${{ needs.pre-deploy.outputs.version }} \
            --set image.repository=ghcr.io/${{ github.repository }}/task-service \
            --set replicaCount=3 \
            --set resources.requests.cpu=200m \
            --set resources.requests.memory=256Mi \
            --set resources.limits.cpu=500m \
            --set resources.limits.memory=512Mi \
            --values ./helm/task-service/values-production.yaml \
            --wait \
            --timeout 10m

      - name: Deploy frontend with Helm
        run: |
          helm upgrade --install frontend ./helm/frontend \
            --namespace ${{ env.NAMESPACE }} \
            --set image.tag=${{ needs.pre-deploy.outputs.version }} \
            --set image.repository=ghcr.io/${{ github.repository }}/frontend \
            --set replicaCount=3 \
            --values ./helm/frontend/values-production.yaml \
            --wait \
            --timeout 10m

      - name: Deploy notification service with Helm
        run: |
          helm upgrade --install notification-service ./helm/notification-service \
            --namespace ${{ env.NAMESPACE }} \
            --set image.tag=${{ needs.pre-deploy.outputs.version }} \
            --set image.repository=ghcr.io/${{ github.repository }}/notification-service \
            --values ./helm/notification-service/values-production.yaml \
            --wait \
            --timeout 10m

      # ============================================================
      # Post-deployment verification
      # ============================================================
      - name: Verify deployment
        run: |
          # Check all pods are running
          kubectl get pods -n ${{ env.NAMESPACE }} -l app.kubernetes.io/managed-by=Helm

          # Run health checks
          kubectl exec -n ${{ env.NAMESPACE }} deploy/task-service -- curl -f http://localhost:8000/health

      - name: Run smoke tests
        run: |
          # Run production smoke tests
          npm run test:smoke -- --env production
        working-directory: ./tests/smoke

      # ============================================================
      # Rollback on failure
      # ============================================================
      - name: Rollback on failure
        if: failure()
        run: |
          echo "Deployment failed, initiating rollback..."
          helm rollback task-service -n ${{ env.NAMESPACE }}
          helm rollback frontend -n ${{ env.NAMESPACE }}
          helm rollback notification-service -n ${{ env.NAMESPACE }}

      # ============================================================
      # Create GitHub Release
      # ============================================================
      - name: Create Release
        if: success() && startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify deployment status
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment ${{ job.status }}*\n\nVersion: `${{ needs.pre-deploy.outputs.version }}`\nEnvironment: production\nURL: https://todo-chatbot.example.com"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Testing Workflows

### Pull Request Checks

```yaml
# .github/workflows/pr-checks.yml
name: Pull Request Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  # ============================================================
  # Code Quality
  # ============================================================
  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Run Ruff
        run: |
          pip install ruff
          ruff check --output-format=github .
          ruff format --check .

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run ESLint
        run: |
          cd frontend
          npm ci
          npm run lint

  # ============================================================
  # Unit Tests
  # ============================================================
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Run backend tests
        if: matrix.component == 'backend'
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt
          pytest --tb=short -q

      - name: Run frontend tests
        if: matrix.component == 'frontend'
        run: |
          cd frontend
          npm ci
          npm run test -- --passWithNoTests

  # ============================================================
  # Integration Tests
  # ============================================================
  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [lint, test]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: --health-cmd pg_isready

    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d

      - name: Run integration tests
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt
          pytest tests/integration -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/test

      - name: Stop services
        if: always()
        run: docker compose -f docker-compose.test.yml down

  # ============================================================
  # PR Size Check
  # ============================================================
  pr-size:
    name: PR Size Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR size
        run: |
          ADDITIONS=$(gh pr view ${{ github.event.pull_request.number }} --json additions -q .additions)
          DELETIONS=$(gh pr view ${{ github.event.pull_request.number }} --json deletions -q .deletions)
          TOTAL=$((ADDITIONS + DELETIONS))

          echo "PR size: +$ADDITIONS -$DELETIONS (total: $TOTAL)"

          if [ $TOTAL -gt 1000 ]; then
            echo "::warning::Large PR detected ($TOTAL lines). Consider breaking it into smaller PRs."
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================
  # Preview Deployment
  # ============================================================
  preview:
    name: Preview Deployment
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.event.pull_request.draft == false

    steps:
      - uses: actions/checkout@v4

      - name: Deploy preview
        id: preview
        run: |
          # Deploy to preview environment
          # This could use Vercel, Netlify, or a Kubernetes preview namespace
          echo "preview_url=https://pr-${{ github.event.pull_request.number }}.preview.example.com" >> $GITHUB_OUTPUT

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment ready!\n\nURL: ${{ steps.preview.outputs.preview_url }}'
            })
```

### Test Configuration Files

```yaml
# pytest.ini or pyproject.toml [tool.pytest.ini_options]
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
filterwarnings =
    ignore::DeprecationWarning
```

```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## Secrets Management

### GitHub Secrets Configuration

```yaml
# Required secrets for CI/CD
# Configure in: Settings > Secrets and variables > Actions

# ============================================================
# Container Registries
# ============================================================
# GITHUB_TOKEN - Automatic for GHCR
DIGITALOCEAN_ACCESS_TOKEN: "dop_v1_..."
GCP_SA_KEY: '{"type":"service_account",...}'
ACR_USERNAME: "acr-username"
ACR_PASSWORD: "acr-password"

# ============================================================
# Kubernetes Clusters
# ============================================================
KUBECONFIG_STAGING: "base64-encoded-kubeconfig"
KUBECONFIG_PRODUCTION: "base64-encoded-kubeconfig"

# ============================================================
# Application Secrets
# ============================================================
DATABASE_URL: "postgresql://..."
BETTER_AUTH_SECRET: "your-secret"
OPENAI_API_KEY: "sk-..."
SENDGRID_API_KEY: "SG...."

# ============================================================
# Monitoring & Notifications
# ============================================================
SLACK_WEBHOOK_URL: "https://hooks.slack.com/..."
SENTRY_DSN: "https://...@sentry.io/..."
SNYK_TOKEN: "snyk-token"
CODECOV_TOKEN: "codecov-token"
```

### Using Secrets in Workflows

```yaml
# Secrets in environment variables
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

    steps:
      - name: Deploy with secrets
        run: |
          # Secrets are masked in logs
          echo "Deploying with database: $DATABASE_URL"

      # Pass to kubectl
      - name: Create Kubernetes secret
        run: |
          kubectl create secret generic app-secrets \
            --from-literal=DATABASE_URL=${{ secrets.DATABASE_URL }} \
            --from-literal=BETTER_AUTH_SECRET=${{ secrets.BETTER_AUTH_SECRET }} \
            --dry-run=client -o yaml | kubectl apply -f -
```

### Environment-Specific Secrets

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    # Environment secrets are loaded based on selected environment

    steps:
      - name: Deploy
        env:
          # These come from the environment's secrets
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh
```

### Secrets from External Managers

```yaml
# Using HashiCorp Vault
- name: Import secrets from Vault
  uses: hashicorp/vault-action@v2
  with:
    url: https://vault.example.com
    method: jwt
    role: github-actions
    secrets: |
      secret/data/app/database url | DATABASE_URL ;
      secret/data/app/auth secret | AUTH_SECRET

# Using AWS Secrets Manager
- name: Get secrets from AWS
  uses: aws-actions/aws-secretsmanager-get-secrets@v1
  with:
    secret-ids: |
      APP_SECRETS, todo-chatbot/production
    parse-json-secrets: true

# Using Google Secret Manager
- name: Get secrets from GCP
  id: secrets
  uses: google-github-actions/get-secretmanager-secrets@v2
  with:
    secrets: |-
      database-url:${{ secrets.GCP_PROJECT_ID }}/database-url
      auth-secret:${{ secrets.GCP_PROJECT_ID }}/auth-secret
```

---

## Reusable Workflows

### Composite Action for Setup

```yaml
# .github/actions/setup-tools/action.yml
name: Setup Tools
description: Set up common tools for CI/CD

inputs:
  python-version:
    description: Python version
    default: "3.11"
  node-version:
    description: Node.js version
    default: "20"
  install-kubectl:
    description: Install kubectl
    default: "true"
  install-helm:
    description: Install Helm
    default: "true"

runs:
  using: composite
  steps:
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: ${{ inputs.python-version }}
        cache: pip

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm

    - name: Install kubectl
      if: inputs.install-kubectl == 'true'
      uses: azure/setup-kubectl@v3
      shell: bash

    - name: Install Helm
      if: inputs.install-helm == 'true'
      uses: azure/setup-helm@v3
      shell: bash

    - name: Install doctl
      uses: digitalocean/action-doctl@v2
      with:
        token: ${{ env.DIGITALOCEAN_ACCESS_TOKEN }}
      shell: bash
```

### Reusable Workflow

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy Workflow

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      version:
        required: true
        type: string
      cluster-name:
        required: true
        type: string
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN:
        required: true
      SLACK_WEBHOOK_URL:
        required: false

jobs:
  deploy:
    name: Deploy to ${{ inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          doctl kubernetes cluster kubeconfig save ${{ inputs.cluster-name }}
        env:
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Deploy
        run: |
          helm upgrade --install app ./helm/app \
            --set image.tag=${{ inputs.version }} \
            --namespace ${{ inputs.environment }} \
            --wait

      - name: Notify
        if: always() && secrets.SLACK_WEBHOOK_URL != ''
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text": "Deployment to ${{ inputs.environment }}: ${{ job.status }}"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

```yaml
# .github/workflows/deploy-all.yml
name: Deploy All Environments

on:
  push:
    tags: ["v*"]

jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      version: ${{ github.ref_name }}
      cluster-name: todo-chatbot-staging
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
      version: ${{ github.ref_name }}
      cluster-name: todo-chatbot-production
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Rollback Strategies

### Manual Rollback Workflow

```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Environment to rollback"
        required: true
        type: choice
        options:
          - staging
          - production
      revision:
        description: "Helm revision to rollback to (leave empty for previous)"
        required: false
      service:
        description: "Service to rollback (leave empty for all)"
        required: false
        type: choice
        options:
          - ""
          - task-service
          - frontend
          - notification-service

jobs:
  rollback:
    name: Rollback ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Configure kubectl
        run: |
          doctl kubernetes cluster kubeconfig save todo-chatbot-${{ github.event.inputs.environment }}
        env:
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Get current revision
        id: current
        run: |
          if [ -n "${{ github.event.inputs.service }}" ]; then
            SERVICES="${{ github.event.inputs.service }}"
          else
            SERVICES="task-service frontend notification-service"
          fi

          for svc in $SERVICES; do
            echo "Current revision for $svc:"
            helm history $svc -n ${{ github.event.inputs.environment }} --max 5
          done

      - name: Perform rollback
        run: |
          if [ -n "${{ github.event.inputs.service }}" ]; then
            SERVICES="${{ github.event.inputs.service }}"
          else
            SERVICES="task-service frontend notification-service"
          fi

          REVISION="${{ github.event.inputs.revision }}"

          for svc in $SERVICES; do
            echo "Rolling back $svc..."
            if [ -n "$REVISION" ]; then
              helm rollback $svc $REVISION -n ${{ github.event.inputs.environment }} --wait
            else
              helm rollback $svc -n ${{ github.event.inputs.environment }} --wait
            fi
          done

      - name: Verify rollback
        run: |
          kubectl get pods -n ${{ github.event.inputs.environment }}
          kubectl get deployments -n ${{ github.event.inputs.environment }}

      - name: Notify
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠️ Rollback executed on ${{ github.event.inputs.environment }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Rollback Executed*\n\nEnvironment: ${{ github.event.inputs.environment }}\nService: ${{ github.event.inputs.service || 'all' }}\nRevision: ${{ github.event.inputs.revision || 'previous' }}\nTriggered by: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Quick Reference

### GitHub Actions Syntax Cheat Sheet

```yaml
# Triggers
on:
  push:
    branches: [main]
    tags: ["v*"]
    paths: ["src/**"]
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: "0 0 * * *"  # Daily at midnight
  workflow_dispatch:
    inputs:
      name:
        required: true
        type: string

# Job dependencies
jobs:
  build:
    runs-on: ubuntu-latest
  test:
    needs: build
  deploy:
    needs: [build, test]
    if: github.ref == 'refs/heads/main'

# Matrix strategy
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest]
    node: [18, 20]
  fail-fast: false

# Caching
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# Artifacts
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: dist/

# Concurrency
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Workflow Status Badges

```markdown
![CI](https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/owner/repo/actions/workflows/cd-production.yml/badge.svg)
```

### Required Secrets Checklist

- [ ] `DIGITALOCEAN_ACCESS_TOKEN` - DOKS access
- [ ] `GCP_SA_KEY` - GKE service account
- [ ] `AZURE_CREDENTIALS` - AKS access
- [ ] `DATABASE_URL` - Production database
- [ ] `BETTER_AUTH_SECRET` - Auth secret
- [ ] `OPENAI_API_KEY` - OpenAI API
- [ ] `SENDGRID_API_KEY` - Email service
- [ ] `SLACK_WEBHOOK_URL` - Notifications
- [ ] `SNYK_TOKEN` - Security scanning
- [ ] `CODECOV_TOKEN` - Coverage reports

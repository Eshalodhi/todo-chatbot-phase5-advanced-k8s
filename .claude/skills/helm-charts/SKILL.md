# Helm Charts Creation and Deployment Skill

## Overview

This skill teaches Claude how to create and use Helm charts for Kubernetes package management. Helm is the package manager for Kubernetes, enabling you to define, install, and upgrade complex Kubernetes applications.

## Helm Chart Structure

A Helm chart is organized with the following structure:

```
mychart/
├── Chart.yaml          # Chart metadata (name, version, description)
├── values.yaml         # Default configuration values
├── charts/             # Dependency charts
├── templates/          # Kubernetes manifest templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl    # Template helpers/partials
│   ├── NOTES.txt       # Post-install notes
│   └── tests/          # Test templates
├── .helmignore         # Patterns to ignore when packaging
└── README.md           # Chart documentation
```

## Creating a New Chart

### Basic Chart Creation
```bash
# Create new chart with default templates
helm create mychart

# Create chart in specific directory
helm create charts/mychart
```

### Chart.yaml Metadata

```yaml
apiVersion: v2
name: todo-chatbot-frontend
description: A Helm chart for the Todo Chatbot Frontend application
type: application
version: 0.1.0           # Chart version (SemVer)
appVersion: "1.0.0"      # Application version
keywords:
  - todo
  - chatbot
  - frontend
  - nextjs
maintainers:
  - name: Team Name
    email: team@example.com
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

### Version Conventions
- **version**: Chart version, increment on any chart change
- **appVersion**: Version of the application being deployed
- Follow SemVer: MAJOR.MINOR.PATCH

## values.yaml Configuration

### Basic Structure
```yaml
# Application configuration
replicaCount: 1

image:
  repository: myregistry/todo-frontend
  pullPolicy: IfNotPresent
  tag: ""  # Defaults to appVersion

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

# Service account configuration
serviceAccount:
  create: true
  annotations: {}
  name: ""

# Pod security context
podSecurityContext:
  fsGroup: 1000

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL

# Service configuration
service:
  type: ClusterIP
  port: 80
  targetPort: 3000

# Ingress configuration
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []

# Resource limits
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Autoscaling
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

# Node selection
nodeSelector: {}
tolerations: []
affinity: {}

# Health checks
livenessProbe:
  httpGet:
    path: /api/health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5

# Environment variables
env:
  - name: NODE_ENV
    value: "production"

# ConfigMap data
config:
  apiUrl: "http://backend:8000"

# Secrets (use external secrets in production)
secrets:
  enabled: false
```

## Template Syntax

### Go Template Basics

Helm templates use Go templating with Helm-specific functions.

#### Accessing Values
```yaml
# From values.yaml
{{ .Values.replicaCount }}
{{ .Values.image.repository }}
{{ .Values.image.tag | default .Chart.AppVersion }}

# Release information
{{ .Release.Name }}
{{ .Release.Namespace }}
{{ .Release.IsUpgrade }}
{{ .Release.IsInstall }}

# Chart information
{{ .Chart.Name }}
{{ .Chart.Version }}
{{ .Chart.AppVersion }}
```

#### Control Structures
```yaml
# Conditionals
{{- if .Values.ingress.enabled }}
# ingress content
{{- end }}

{{- if and .Values.autoscaling.enabled (gt .Values.autoscaling.minReplicas 0) }}
# autoscaling content
{{- end }}

# Loops
{{- range .Values.env }}
- name: {{ .name }}
  value: {{ .value | quote }}
{{- end }}

# With (changes scope)
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 8 }}
{{- end }}
```

#### Common Functions
```yaml
# String functions
{{ .Values.name | quote }}           # Quote string
{{ .Values.name | upper }}           # Uppercase
{{ .Values.name | lower }}           # Lowercase
{{ .Values.name | title }}           # Title case
{{ .Values.name | trim }}            # Trim whitespace
{{ printf "%s-%s" .Release.Name .Chart.Name }}  # Format string

# Default values
{{ .Values.tag | default "latest" }}
{{ .Values.port | default 8080 }}

# Required values
{{ required "image.repository is required" .Values.image.repository }}

# Type conversion
{{ .Values.port | int }}
{{ .Values.enabled | toString }}

# YAML/JSON handling
{{ toYaml .Values.resources | nindent 12 }}
{{ toJson .Values.config }}

# Indentation
{{ include "mychart.labels" . | nindent 4 }}
```

## Common Templates

### Deployment Template
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "mychart.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "mychart.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          {{- if .Values.livenessProbe }}
          livenessProbe:
            {{- toYaml .Values.livenessProbe | nindent 12 }}
          {{- end }}
          {{- if .Values.readinessProbe }}
          readinessProbe:
            {{- toYaml .Values.readinessProbe | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.env }}
          env:
            {{- toYaml .Values.env | nindent 12 }}
          {{- end }}
          envFrom:
            - configMapRef:
                name: {{ include "mychart.fullname" . }}-config
            {{- if .Values.secrets.enabled }}
            - secretRef:
                name: {{ include "mychart.fullname" . }}-secret
            {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Service Template
```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort }}
      protocol: TCP
      name: http
  selector:
    {{- include "mychart.selectorLabels" . | nindent 4 }}
```

### ConfigMap Template
```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.fullname" . }}-config
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

### Secret Template
```yaml
# templates/secret.yaml
{{- if .Values.secrets.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "mychart.fullname" . }}-secret
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
type: Opaque
data:
  {{- range $key, $value := .Values.secrets.data }}
  {{ $key }}: {{ $value | b64enc | quote }}
  {{- end }}
{{- end }}
```

### Helpers Template
```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "mychart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "mychart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "mychart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mychart.labels" -}}
helm.sh/chart: {{ include "mychart.chart" . }}
{{ include "mychart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mychart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mychart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "mychart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "mychart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

## Helm Commands

### Installing Charts
```bash
# Install from local chart
helm install myrelease ./mychart

# Install with custom values file
helm install myrelease ./mychart -f values-production.yaml

# Install with value overrides
helm install myrelease ./mychart --set replicaCount=3 --set image.tag=v1.2.0

# Install in specific namespace
helm install myrelease ./mychart -n mynamespace --create-namespace

# Dry run (preview without installing)
helm install myrelease ./mychart --dry-run --debug

# Wait for resources to be ready
helm install myrelease ./mychart --wait --timeout 5m
```

### Upgrading Releases
```bash
# Upgrade with new values
helm upgrade myrelease ./mychart

# Upgrade with specific values file
helm upgrade myrelease ./mychart -f values-production.yaml

# Upgrade or install if not exists
helm upgrade --install myrelease ./mychart

# Upgrade with atomic (rollback on failure)
helm upgrade myrelease ./mychart --atomic --timeout 5m

# Force resource updates
helm upgrade myrelease ./mychart --force
```

### Rolling Back
```bash
# Rollback to previous revision
helm rollback myrelease

# Rollback to specific revision
helm rollback myrelease 2

# Rollback with wait
helm rollback myrelease 2 --wait --timeout 5m
```

### Managing Releases
```bash
# List all releases
helm list

# List releases in all namespaces
helm list -A

# List releases with status
helm list --all

# Get release history
helm history myrelease

# Get release status
helm status myrelease

# Get release values
helm get values myrelease

# Get all release info
helm get all myrelease

# Uninstall release
helm uninstall myrelease

# Uninstall but keep history
helm uninstall myrelease --keep-history
```

### Chart Development
```bash
# Lint chart for errors
helm lint ./mychart

# Template locally (render templates)
helm template myrelease ./mychart

# Template with values
helm template myrelease ./mychart -f values.yaml --debug

# Package chart
helm package ./mychart

# Package with specific version
helm package ./mychart --version 1.0.0 --app-version 2.0.0

# Update dependencies
helm dependency update ./mychart

# Build dependencies
helm dependency build ./mychart
```

## Using kubectl-ai for Chart Generation

kubectl-ai can generate Helm charts using natural language:

```bash
# Generate basic chart
kubectl-ai "Create a Helm chart for a Node.js web application"

# Generate chart with specific requirements
kubectl-ai "Create Helm chart for FastAPI backend with PostgreSQL dependency, health checks, and HPA"

# Generate values file
kubectl-ai "Create values.yaml for production deployment with 3 replicas and resource limits"
```

## Using Kagent for Chart Analysis

Kagent can analyze and optimize existing charts:

```bash
# Analyze chart for best practices
kagent analyze ./mychart

# Suggest optimizations
kagent optimize ./mychart

# Security scan
kagent security-scan ./mychart
```

## Best Practices

### Chart Organization
1. **One chart per application** - Keep charts focused on a single application
2. **Use subcharts for dependencies** - Manage related services as subcharts
3. **Separate values by environment** - Use `values-dev.yaml`, `values-staging.yaml`, `values-prod.yaml`
4. **Document everything** - Include README.md and NOTES.txt

### Versioning
1. **Follow SemVer** - MAJOR.MINOR.PATCH for chart version
2. **Track appVersion separately** - Application version independent of chart
3. **Tag releases** - Use git tags matching chart versions
4. **Changelog** - Maintain CHANGELOG.md for chart changes

### Template Best Practices
1. **Use _helpers.tpl** - Define reusable template functions
2. **Validate required values** - Use `required` function for mandatory values
3. **Provide sensible defaults** - Use `default` function for optional values
4. **Quote strings** - Always quote string values in templates
5. **Handle whitespace** - Use `{{-` and `-}}` for clean YAML

### Security
1. **Never hardcode secrets** - Use external secret management
2. **Set security contexts** - Define pod and container security contexts
3. **Use RBAC** - Include ServiceAccount and RBAC templates when needed
4. **Scan images** - Reference only verified container images

### Values File Structure
```yaml
# Group related values
image:
  repository: myapp
  tag: latest

# Use descriptive names
service:
  type: ClusterIP
  port: 80

# Include comments for clarity
# Number of pod replicas
replicaCount: 1
```

## Integration Notes

This skill is used by the **Helm Engineer** agent for:
- Creating Helm charts for Todo Chatbot frontend and backend
- Managing deployments to Minikube
- Packaging applications for distribution
- Performing rolling updates and rollbacks

When the Helm Engineer encounters chart creation tasks, it should:
1. Use `helm create` for initial chart scaffolding
2. Customize templates based on application requirements
3. Create environment-specific values files
4. Validate with `helm lint` and `helm template`
5. Test installation with `--dry-run` before actual deployment

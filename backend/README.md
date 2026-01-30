# TaskFlow Backend API

FastAPI backend for the TaskFlow multi-user task management application.

## Features

- JWT-based authentication (shared secret with Better Auth frontend)
- User isolation - users can only access their own tasks
- Full CRUD operations for tasks
- Neon PostgreSQL database with SQLModel ORM
- OpenAPI documentation at `/docs`

## Tech Stack

- **Framework**: FastAPI 0.115+
- **ORM**: SQLModel 0.0.22+
- **Database**: Neon Serverless PostgreSQL
- **Auth**: PyJWT 2.9+
- **Server**: Uvicorn 0.34+

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Shared JWT secret with frontend (must match!)
- `CORS_ORIGINS`: Allowed frontend origins (comma-separated)
- `ENVIRONMENT`: `development` or `production`

### 4. Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/{user_id}/tasks | List user's tasks |
| POST | /api/{user_id}/tasks | Create task |
| GET | /api/{user_id}/tasks/{id} | Get single task |
| PATCH | /api/{user_id}/tasks/{id} | Update task |
| DELETE | /api/{user_id}/tasks/{id} | Delete task |

## Authentication

All `/api/*` endpoints require JWT Bearer token:

```
Authorization: Bearer <jwt_token>
```

The token must be signed with `BETTER_AUTH_SECRET` using HS256.

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Testing

```bash
pytest
```

## Deployment

See `Dockerfile` for containerized deployment to Render/Railway.

## Security

- All queries filtered by authenticated user_id
- URL user_id must match JWT user_id
- Invalid tokens return 401 Unauthorized
- Cross-user access returns 403 Forbidden

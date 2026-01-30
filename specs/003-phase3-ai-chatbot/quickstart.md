# Quickstart: Phase III AI Chatbot Development

**Feature Branch**: `003-phase3-ai-chatbot`
**Created**: 2026-01-17
**Prerequisites**: Phase II fully operational

## Environment Setup

### 1. Get Cohere API Key

1. Visit [cohere.com](https://cohere.com) and create an account
2. Navigate to Dashboard > API Keys
3. Create a new API key or copy existing one
4. Add to backend `.env` file:

```bash
# Backend .env
COHERE_API_KEY=your-cohere-api-key-here
```

### 2. Install Python Dependencies

```bash
cd backend

# Add new dependencies
pip install cohere>=5.20.0 tenacity>=8.2.0

# Or update requirements.txt and install
echo "cohere>=5.20.0" >> requirements.txt
echo "tenacity>=8.2.0" >> requirements.txt
pip install -r requirements.txt
```

### 3. Verify Cohere Connection

Create a quick test script to verify API connectivity:

```python
# backend/test_cohere.py
import os
import cohere
from dotenv import load_dotenv

load_dotenv()

co = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))

response = co.chat(
    model="command-r-plus-08-2024",
    messages=[{"role": "user", "content": "Hello! Can you help me manage tasks?"}]
)

print("Connection successful!")
print(f"Response: {response.message.content[0].text}")
```

Run: `python test_cohere.py`

### 4. Database Migration

Apply the Phase III schema additions:

```bash
cd backend

# Using SQLModel auto-create (development)
python -c "from app.database import create_db_and_tables; create_db_and_tables()"

# Or apply migration script manually to Neon:
# psql $DATABASE_URL < specs/003-phase3-ai-chatbot/data-model.sql
```

## Project Structure

After Phase III implementation, the backend should have:

```
backend/
├── app/
│   ├── main.py                 # Add chat router
│   ├── models.py               # Add Conversation, Message models
│   ├── schemas.py              # Add chat DTOs
│   ├── config.py               # Add COHERE_API_KEY
│   ├── routers/
│   │   ├── tasks.py            # Existing (unchanged)
│   │   └── chat.py             # NEW: Chat endpoint
│   └── services/
│       └── chat/               # NEW: Chat service
│           ├── __init__.py
│           ├── service.py      # Main chat orchestration
│           ├── cohere_client.py # Cohere API wrapper
│           └── tools/          # MCP tool implementations
│               ├── __init__.py
│               ├── base.py     # ToolResult dataclass
│               ├── executor.py # Tool routing
│               ├── add_task.py
│               ├── list_tasks.py
│               ├── complete_task.py
│               ├── delete_task.py
│               └── update_task.py
└── requirements.txt            # Add cohere, tenacity
```

## Development Workflow

### Phase-by-Phase Implementation

**Phase 1: Database Models**
```bash
# 1. Add Conversation and Message models to models.py
# 2. Add chat schemas to schemas.py
# 3. Run migration to create tables
# 4. Test with sample data insertion
```

**Phase 2: MCP Tools**
```bash
# 1. Create tools/ directory structure
# 2. Implement add_task tool first (simplest)
# 3. Test add_task in isolation
# 4. Implement remaining 4 tools
# 5. Create tool executor for routing
```

**Phase 3: Cohere Integration**
```bash
# 1. Create cohere_client.py with tool definitions
# 2. Create chat service orchestrating the 9-step flow
# 3. Create chat router with POST endpoint
# 4. Test with curl/Postman
```

**Phase 4: Frontend Chat UI**
```bash
# 1. Create chat page component
# 2. Build message list and input components
# 3. Connect to backend API
# 4. Add navigation link
```

## Testing Commands

### Test Chat Endpoint (curl)

```bash
# Get JWT token first (from login)
TOKEN="your-jwt-token"
USER_ID="your-user-id"

# Start new conversation
curl -X POST "http://localhost:8000/api/${USER_ID}/chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Add a task to buy groceries"}'

# Continue conversation
curl -X POST "http://localhost:8000/api/${USER_ID}/chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my tasks?", "conversation_id": 1}'
```

### Test Individual Tools

```python
# backend/test_tools.py
import asyncio
from app.database import get_session
from app.services.chat.tools.executor import ToolExecutor

async def test_add_task():
    session = next(get_session())
    executor = ToolExecutor(session)

    result = await executor.execute(
        tool_name="add_task",
        user_id="test-user-id",
        parameters={"title": "Test task from tool"}
    )

    print(f"Success: {result.success}")
    print(f"Message: {result.message}")
    print(f"Data: {result.data}")

asyncio.run(test_add_task())
```

## Configuration Reference

### Backend Environment Variables

```bash
# Existing (Phase II)
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# New (Phase III)
COHERE_API_KEY=your-cohere-api-key
COHERE_MODEL=command-r-plus-08-2024
COHERE_TEMPERATURE=0.3
COHERE_MAX_HISTORY=20
```

### Frontend Environment Variables

```bash
# Existing (no changes needed for Phase III)
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret
```

## Debugging Tips

### 1. Log Cohere Requests

```python
# In cohere_client.py
import logging

logger = logging.getLogger(__name__)

async def chat(self, messages, tools):
    logger.debug(f"Cohere request: {len(messages)} messages, {len(tools)} tools")
    response = self.client.chat(...)
    logger.debug(f"Cohere response: {response.message.content[0].text[:100]}...")
    return response
```

### 2. Inspect Tool Calls

```python
# Log tool calls for debugging
if response.message.tool_calls:
    for tc in response.message.tool_calls:
        logger.info(f"Tool call: {tc.function.name}({tc.function.arguments})")
```

### 3. Test Cohere Without Backend

Use Cohere Playground to test tool definitions before implementing handlers:
1. Go to [dashboard.cohere.com/playground](https://dashboard.cohere.com/playground)
2. Select Chat mode
3. Paste tool definitions
4. Test natural language inputs

## Common Issues

### Issue: Cohere returns no tool calls

**Cause**: Preamble or tool descriptions may not be clear enough.

**Solution**: Improve tool descriptions with specific trigger phrases.

### Issue: User isolation failure

**Cause**: Missing `user_id` filter in database query.

**Solution**: Audit all queries to include `.where(Model.user_id == user_id)`.

### Issue: Token limit exceeded

**Cause**: Sending too many messages to Cohere.

**Solution**: Limit history to 20 messages as specified in constitution.

### Issue: JWT verification failing

**Cause**: BETTER_AUTH_SECRET mismatch between frontend and backend.

**Solution**: Ensure identical secret in both `.env` files.

## Next Steps

After completing this quickstart:

1. Review `data-model.md` for database schema details
2. Review `contracts/chat-api.yaml` for API specification
3. Review `contracts/mcp-tools.md` for tool implementation details
4. Follow the implementation plan in `plan.md`
5. Run `/sp.tasks` to generate task list

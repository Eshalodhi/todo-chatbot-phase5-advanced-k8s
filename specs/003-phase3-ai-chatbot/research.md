# Research: Phase III AI Chatbot Integration

**Feature Branch**: `003-phase3-ai-chatbot`
**Created**: 2026-01-17
**Status**: Complete

## Research Questions

### 1. Cohere API Tool Calling Implementation

**Question**: How does Cohere API v2 implement tool/function calling?

**Findings**:

The Cohere API v2 uses a tool definition schema with three required fields:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "add_task",
            "description": "Creates a new task for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the task to create"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description for the task"
                    }
                },
                "required": ["title"]
            }
        }
    }
]
```

**Decision**: Use Cohere API v2 with `cohere.ClientV2()` and structured tool definitions.

**Rationale**: V2 API provides type-safe tool calls via `ToolCallV2` objects and better error handling.

**Alternatives Considered**:
- V1 API: Deprecated and uses different `conversation_id` pattern
- LangChain wrapper: Adds unnecessary complexity for this use case

---

### 2. Chat History Management

**Question**: How should chat history be stored and passed to Cohere?

**Findings**:

Cohere V2 API requires the full message history in each request:

```python
messages = [
    {"role": "system", "content": "You are a task management assistant..."},
    {"role": "user", "content": "Add a task to buy groceries"},
    {"role": "assistant", "content": "I've created a task..."},
    {"role": "user", "content": "What are my tasks?"}
]

response = co.chat(
    model="command-a-03-2025",
    messages=messages,
    tools=tools
)
```

**Decision**: Store messages in PostgreSQL, load last 20 messages per request, build `messages` array dynamically.

**Rationale**:
- V2 API no longer manages `conversation_id` server-side
- Developer must manage chat history
- Database storage enables stateless architecture
- 20 message limit balances context vs. token costs

**Alternatives Considered**:
- In-memory storage: Loses state on restart
- Redis cache: Adds operational complexity
- Full history: May hit token limits (128k context window)

---

### 3. Tool Execution Flow

**Question**: How are tool calls executed and results returned to Cohere?

**Findings**:

The flow is:
1. Send user message with tools to Cohere
2. Check `response.message.tool_calls` for any tool requests
3. Execute each tool and collect results
4. Append tool results to messages with role "tool"
5. Call Cohere again to get final response

```python
# Check for tool calls
if response.message.tool_calls:
    messages.append(response.message)  # Append assistant's tool call request

    # Execute each tool
    for tc in response.message.tool_calls:
        tool_result = functions_map[tc.function.name](
            **json.loads(tc.function.arguments)
        )

        # Append tool result
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": [
                {
                    "type": "document",
                    "document": {"data": json.dumps(tool_result)}
                }
            ]
        })

    # Get final response from Cohere
    response = co.chat(model="command-a-03-2025", messages=messages, tools=tools)
```

**Decision**: Implement synchronous tool execution with single Cohere API call per tool result.

**Rationale**: Simpler to implement and debug; parallel execution adds complexity without significant benefit for 5 simple tools.

**Alternatives Considered**:
- Parallel tool execution: More complex, overkill for CRUD operations
- Async streaming: Adds complexity, not needed for MVP

---

### 4. Cohere Model Selection

**Question**: Which Cohere model should be used for task understanding?

**Findings**:

Available models:
- `command-a-03-2025`: Latest model, best performance
- `command-r-plus-08-2024`: Previous generation, still very capable
- `command-r`: Faster but less capable

**Decision**: Use `command-r-plus-08-2024` as specified in constitution, with fallback to `command-a-03-2025` if needed.

**Rationale**: Constitution specifies `command-r-plus` for task understanding; exact version may need adjustment based on availability.

**Alternatives Considered**:
- `command-r`: Too lightweight for complex task interpretation
- `command-a-03-2025`: Newer but may have different behavior

---

### 5. Python SDK Version

**Question**: Which version of the Cohere Python SDK should be used?

**Findings**:

Current version: `5.20.1` (Released Dec 2025)

Installation:
```bash
pip install cohere>=5.20.0
```

Key features:
- `cohere.ClientV2()` for V2 API
- Type-safe tool calls
- Streaming support
- Environment variable support: `CO_API_KEY`

**Decision**: Use `cohere>=5.20.0` with `ClientV2`.

**Rationale**: Latest SDK with full V2 API support and type safety.

---

### 6. Error Handling Strategy

**Question**: How should Cohere API errors be handled?

**Findings**:

Common errors:
- Rate limiting (429)
- Invalid API key (401)
- Model unavailable (503)
- Token limit exceeded (400)

**Decision**: Implement retry with exponential backoff for transient errors (429, 503), immediate failure for auth errors (401).

**Rationale**: Transient errors are recoverable; auth errors indicate configuration problems.

**Implementation**:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(CohereRateLimitError)
)
async def call_cohere(messages, tools):
    return await co.chat(...)
```

---

### 7. Message Role Types

**Question**: What message roles does Cohere V2 support?

**Findings**:

Supported roles:
- `system`: System instructions (first message, optional)
- `user`: User messages
- `assistant`: Model responses
- `tool`: Tool execution results

**Decision**: Use all four roles as appropriate:
- System message for preamble/instructions
- User messages for user input
- Assistant messages for AI responses
- Tool messages for tool execution results

---

### 8. System Preamble Best Practices

**Question**: How should the system preamble be structured?

**Findings**:

Cohere recommends structured preambles with:
- Task and Context section
- Style Guide section
- Tool usage instructions

**Decision**: Use the preamble defined in constitution:

```
You are a helpful task management assistant that helps users manage their
todo tasks through natural language conversation.

When users want to:
- Add, create, or remember something → use add_task tool
- Show, list, or see their tasks → use list_tasks tool
- Mark something as done or complete → use complete_task tool
- Delete, remove, or cancel a task → use delete_task tool
- Change, update, or modify a task → use update_task tool

Always:
- Confirm actions with friendly messages
- Be concise but helpful
- Use emojis sparingly for positive feedback
- Handle errors gracefully with helpful explanations
- Remember conversation context from history
```

---

## Implementation Implications

### Database Schema

Based on research, the Message model needs:
- `role`: enum ("user", "assistant", "tool")
- `content`: text (message content)
- `tool_calls`: JSON (nullable, for assistant messages with tool calls)
- `tool_call_id`: string (nullable, for tool role messages)

### API Integration Pattern

```python
import cohere
import os

class CohereService:
    def __init__(self):
        self.client = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
        self.model = "command-r-plus-08-2024"

    async def chat(self, messages: list, tools: list) -> dict:
        response = self.client.chat(
            model=self.model,
            messages=messages,
            tools=tools
        )
        return response
```

### Tool Definition Format

All 5 MCP tools must follow this schema:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "tool_name",
            "description": "What the tool does",
            "parameters": {
                "type": "object",
                "properties": {
                    "param1": {"type": "string", "description": "..."},
                    "param2": {"type": "integer", "description": "..."}
                },
                "required": ["param1"]
            }
        }
    }
]
```

---

## References

- [Cohere Tool Use Quickstart](https://docs.cohere.com/v2/docs/tool-use-quickstart)
- [Cohere Chat API](https://docs.cohere.com/v2/reference/chat)
- [Building a Chatbot with Cohere](https://docs.cohere.com/v2/docs/building-a-chatbot-with-cohere)
- [Cohere Python SDK on PyPI](https://pypi.org/project/cohere/)
- [Cohere GitHub Repository](https://github.com/cohere-ai/cohere-python)

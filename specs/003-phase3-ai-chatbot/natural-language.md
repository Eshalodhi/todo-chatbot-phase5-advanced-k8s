# Natural Language Mapping Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

This specification defines how natural language user inputs are mapped to task management intents. The Cohere `command-r-plus` model handles intent recognition natively through its tool-calling capabilities, but this document specifies expected patterns and edge cases.

## Intent Taxonomy

### Primary Intents

| Intent | Tool | Description |
|--------|------|-------------|
| `ADD_TASK` | `add_task` | Create a new task |
| `LIST_TASKS` | `list_tasks` | View tasks (all or filtered) |
| `COMPLETE_TASK` | `complete_task` | Mark task as done |
| `DELETE_TASK` | `delete_task` | Remove a task |
| `UPDATE_TASK` | `update_task` | Modify a task |
| `GENERAL_CHAT` | None | General conversation, help |

## Pattern Recognition

### ADD_TASK Intent

**Trigger Phrases**:
```
- "Add [task]"
- "Create [task]"
- "New task: [task]"
- "I need to [task]"
- "Remind me to [task]"
- "Don't forget to [task]"
- "Put [task] on my list"
- "Schedule [task]"
- "Add to my todos: [task]"
```

**Examples with Expected Extraction**:

| Input | Extracted Title |
|-------|-----------------|
| "Add a task to buy groceries" | "Buy groceries" |
| "Create task: Review project proposal" | "Review project proposal" |
| "I need to call mom tomorrow" | "Call mom tomorrow" |
| "Remind me to submit the report" | "Submit the report" |
| "Don't forget to water the plants" | "Water the plants" |
| "New task - finish homework" | "Finish homework" |

**Edge Cases**:
- Empty task: "Add task" → Ask for task details
- Very long: >500 chars → Truncate with ellipsis
- Special chars: Preserve quotes, emojis
- Multiple tasks: "Add buy milk and eggs" → Single task or clarify

---

### LIST_TASKS Intent

**Trigger Phrases**:
```
- "Show my tasks"
- "List tasks"
- "What are my tasks?"
- "What's on my todo list?"
- "Display my todos"
- "Show me what I have to do"
- "What do I need to do?"
- "Any pending tasks?"
- "Show completed tasks"
- "What have I finished?"
```

**Filter Variations**:

| Input | Filter |
|-------|--------|
| "Show all tasks" | status: "all" |
| "Show pending tasks" | status: "pending" |
| "Show incomplete tasks" | status: "pending" |
| "What haven't I done?" | status: "pending" |
| "Show completed tasks" | status: "completed" |
| "What have I finished?" | status: "completed" |
| "Show done tasks" | status: "completed" |

**Edge Cases**:
- No tasks: Respond with helpful message, suggest adding
- Many tasks: Format as numbered list, consider pagination mention
- Ambiguous filter: Default to "all"

---

### COMPLETE_TASK Intent

**Trigger Phrases**:
```
- "Complete [task]"
- "Mark [task] as done"
- "Finish [task]"
- "Done with [task]"
- "I finished [task]"
- "Check off [task]"
- "[Task] is done"
- "Completed [task]"
```

**Task Identification Patterns**:

| Input | Identifier |
|-------|------------|
| "Complete the groceries task" | "groceries" |
| "Mark 'buy milk' as done" | "buy milk" |
| "I finished calling mom" | "calling mom" |
| "Done with task 3" | "3" (position) or UUID |
| "Check off the first task" | First in list |

**Edge Cases**:
- Ambiguous match: "Complete the task" with multiple → List and ask
- No match: "Complete xyz" not found → List similar or all tasks
- Already done: Inform user, no error

---

### DELETE_TASK Intent

**Trigger Phrases**:
```
- "Delete [task]"
- "Remove [task]"
- "Cancel [task]"
- "Get rid of [task]"
- "I don't need [task] anymore"
- "Take [task] off my list"
```

**Task Identification**: Same as COMPLETE_TASK

**Edge Cases**:
- Confirmation: Consider "Are you sure?" for delete (optional UX)
- No match: Same as complete
- Bulk delete: "Delete all tasks" → Require explicit confirmation

---

### UPDATE_TASK Intent

**Trigger Phrases**:
```
- "Update [task] to [new]"
- "Change [task] to [new]"
- "Rename [task] to [new]"
- "Modify [task] to say [new]"
- "Edit [task]: [new]"
```

**Examples**:

| Input | Old | New |
|-------|-----|-----|
| "Update groceries to organic groceries" | "groceries" | "organic groceries" |
| "Change 'call mom' to 'video call mom'" | "call mom" | "video call mom" |
| "Rename task 1 to 'urgent review'" | task 1 | "urgent review" |

**Edge Cases**:
- Missing new title: "Update groceries" → Ask what to change to
- Same title: No change needed, inform user
- No match: Same as complete/delete

---

### GENERAL_CHAT Intent

**Trigger Phrases**:
```
- "Hello" / "Hi"
- "Help"
- "What can you do?"
- "How do I..."
- Random unrelated input
```

**Response Strategy**:
- Greeting: Friendly response + brief capabilities
- Help: List available commands with examples
- Off-topic: Redirect to task management politely

**Help Response Template**:
```
I can help you manage your tasks! Here's what I can do:

- **Add a task**: "Add task to buy groceries"
- **View tasks**: "Show my tasks" or "What's on my list?"
- **Complete a task**: "Mark groceries as done"
- **Delete a task**: "Delete the groceries task"
- **Update a task**: "Change groceries to organic groceries"

Just tell me what you'd like to do!
```

## System Prompt for Cohere

The system prompt (preamble) instructs Cohere on intent recognition:

```python
SYSTEM_PROMPT = """You are a helpful task management assistant for a todo application.

Your capabilities:
1. add_task - Create new tasks from user descriptions
2. list_tasks - Show user's tasks, optionally filtered by status
3. complete_task - Mark tasks as done
4. delete_task - Remove tasks
5. update_task - Modify task titles

Intent Recognition Guidelines:
- When users express something they need to do, use add_task
- When users ask about their tasks/todos/list, use list_tasks
- When users indicate completion (done, finished, completed), use complete_task
- When users want to remove/delete/cancel, use delete_task
- When users want to change/update/rename, use update_task

Task Matching:
- Match tasks by partial title (case-insensitive)
- If ambiguous, ask for clarification listing possible matches
- Use most recent match if multiple identical titles

Response Style:
- Be concise and helpful
- Confirm actions after completion
- Use friendly but professional tone
- Don't repeat the user's full message back

Error Handling:
- If task not found, suggest checking spelling or list tasks
- If action fails, apologize and offer alternatives
- Never expose technical errors to user
"""
```

## Parameter Extraction

### Title Extraction Rules

1. Remove intent trigger words ("add task", "create", etc.)
2. Remove articles ("a", "an", "the") at start
3. Preserve meaningful content
4. Trim whitespace
5. Capitalize first letter

```python
def extract_task_title(message: str, intent: str) -> str:
    """Extract task title from user message."""

    # Remove common prefixes
    prefixes = [
        "add task", "add a task", "create task", "new task",
        "remind me to", "don't forget to", "i need to"
    ]

    title = message.lower()
    for prefix in prefixes:
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
            break

    # Remove leading articles
    for article in ["a ", "an ", "the "]:
        if title.startswith(article):
            title = title[len(article):]

    # Clean up
    title = title.strip(" :-")

    # Capitalize
    return title.capitalize() if title else ""
```

### Task Identifier Extraction

```python
def extract_task_identifier(message: str) -> str:
    """Extract task identifier from completion/deletion/update messages."""

    # Check for quoted string
    quote_match = re.search(r'["\']([^"\']+)["\']', message)
    if quote_match:
        return quote_match.group(1)

    # Check for "task X" pattern
    task_num_match = re.search(r'task\s+(\d+)', message, re.IGNORECASE)
    if task_num_match:
        return task_num_match.group(1)

    # Remove intent words and extract remainder
    patterns = [
        r'complete\s+(?:the\s+)?(.+?)(?:\s+task)?$',
        r'delete\s+(?:the\s+)?(.+?)(?:\s+task)?$',
        r'mark\s+(.+?)\s+as\s+done',
        r'finish\s+(.+?)$'
    ]

    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return message  # Fallback to full message
```

## Confidence & Fallback

### Low Confidence Scenarios

When intent is unclear:

1. **Multiple possible intents**:
   - "Groceries" → Could be add, complete, or list
   - Response: "What would you like to do with groceries? Add it as a task, mark it complete, or something else?"

2. **Incomplete information**:
   - "Add task" (no title)
   - Response: "What task would you like to add?"

3. **Ambiguous task reference**:
   - "Complete the task" (multiple tasks)
   - Response: "Which task would you like to complete? [list tasks]"

### Fallback Strategy

```python
def handle_low_confidence(message: str, possible_intents: List[str]) -> str:
    """Generate clarification request for ambiguous input."""

    if len(possible_intents) == 0:
        return (
            "I'm not sure what you'd like to do. I can help you:\n"
            "- Add new tasks\n"
            "- View your task list\n"
            "- Mark tasks as complete\n"
            "- Delete or update tasks\n\n"
            "What would you like to do?"
        )

    if len(possible_intents) > 1:
        options = "\n".join(f"- {intent}" for intent in possible_intents)
        return f"Did you want to:\n{options}\n\nPlease clarify."

    return "Could you tell me more about what you'd like to do?"
```

## Testing Requirements

### Intent Recognition Tests

For each intent, test with:
- [ ] Standard trigger phrases
- [ ] Variations and synonyms
- [ ] Mixed case input
- [ ] With extra words/noise
- [ ] Minimal input
- [ ] Edge cases listed above

### Extraction Tests

- [ ] Title extraction preserves important words
- [ ] Title extraction removes trigger words
- [ ] Task identifier matches partial titles
- [ ] Quoted strings extracted correctly
- [ ] Numeric identifiers handled

### Integration Tests

- [ ] Full flow: input → intent → tool call → response
- [ ] Ambiguous input → clarification → correct action
- [ ] Error recovery for misunderstood inputs

## Acceptance Criteria

- [ ] All 5 intents recognized from natural language
- [ ] Common variations handled (10+ per intent)
- [ ] Task titles extracted accurately
- [ ] Task identifiers match flexibly
- [ ] Ambiguous inputs trigger clarification
- [ ] Off-topic inputs handled gracefully
- [ ] Help/greeting responses are helpful
- [ ] Error messages are user-friendly

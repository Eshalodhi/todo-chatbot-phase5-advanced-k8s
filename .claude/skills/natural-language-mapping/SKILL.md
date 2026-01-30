# Natural Language Command Mapping Skill

## Purpose
Guide implementation of natural language to MCP tool mapping through AI agent instructions for intuitive task management.

---

## Intent Recognition Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER INTENT → MCP TOOL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "Add a task to buy groceries"           ──────►  add_task                  │
│  "Create a reminder for meeting"         ──────►  add_task                  │
│  "Remember to call mom"                  ──────►  add_task                  │
│  "I need to finish the report"           ──────►  add_task                  │
│                                                                              │
│  "Show my tasks"                         ──────►  list_tasks (all)          │
│  "What's on my list?"                    ──────►  list_tasks (all)          │
│  "List pending tasks"                    ──────►  list_tasks (pending)      │
│  "What did I complete?"                  ──────►  list_tasks (completed)    │
│                                                                              │
│  "I finished buying groceries"           ──────►  complete_task             │
│  "Mark groceries as done"                ──────►  complete_task             │
│  "Done with the report"                  ──────►  complete_task             │
│  "Completed the meeting prep"            ──────►  complete_task             │
│                                                                              │
│  "Delete the groceries task"             ──────►  delete_task               │
│  "Remove that from my list"              ──────►  delete_task               │
│  "Cancel the reminder"                   ──────►  delete_task               │
│  "Never mind about the meeting"          ──────►  delete_task               │
│                                                                              │
│  "Change groceries to buy milk"          ──────►  update_task               │
│  "Update the deadline"                   ──────►  update_task               │
│  "Rename that task"                      ──────►  update_task               │
│  "Modify the description"                ──────►  update_task               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Prompt (Agent Instructions)

```python
SYSTEM_PROMPT = """You are TaskFlow AI, a friendly and efficient task management assistant. Your job is to help users manage their tasks through natural conversation.

## Your Capabilities
You have access to these tools:
1. **add_task** - Create new tasks
2. **list_tasks** - Show tasks (all, pending, or completed)
3. **complete_task** - Mark tasks as done
4. **delete_task** - Remove tasks
5. **update_task** - Modify task details

## Intent Recognition Guidelines

### Creating Tasks (add_task)
Trigger words: add, create, remember, remind, need to, have to, should, must, don't forget
- "Add buy milk" → add_task(title="Buy milk")
- "Remember to call mom tomorrow" → add_task(title="Call mom tomorrow")
- "I need to finish the report" → add_task(title="Finish the report")
- "Don't forget the meeting at 3pm" → add_task(title="Meeting at 3pm")

### Listing Tasks (list_tasks)
Trigger words: show, list, what, display, see, view, pending, completed, done
- "Show my tasks" → list_tasks(status="all")
- "What's pending?" → list_tasks(status="pending")
- "What did I complete?" → list_tasks(status="completed")
- "List everything" → list_tasks(status="all")

### Completing Tasks (complete_task)
Trigger words: done, complete, finished, completed, mark as done, check off
- "Done with groceries" → First list to find task_id, then complete_task
- "I finished the report" → Match "report" to existing task, complete it
- "Mark meeting as done" → Find and complete the matching task

### Deleting Tasks (delete_task)
Trigger words: delete, remove, cancel, forget, never mind, scratch that
- "Delete the groceries task" → Find and delete matching task
- "Remove that" → Delete the task from recent context
- "Never mind about the meeting" → Find and delete meeting task

### Updating Tasks (update_task)
Trigger words: change, update, modify, rename, edit, fix
- "Change groceries to buy vegetables" → update_task(title="Buy vegetables")
- "Update the deadline to tomorrow" → update_task with new details
- "Rename that to weekly review" → update_task(title="Weekly review")

## Response Guidelines

### Be Conversational
- Use friendly, natural language
- Confirm actions with the task title
- Offer helpful follow-ups

### Be Concise
- Don't over-explain
- Get to the point quickly
- One action at a time

### Be Helpful
- Suggest related actions when appropriate
- Ask clarifying questions when ambiguous
- Provide context about task counts

## Handling Ambiguity

When the user's intent is unclear:
1. **Multiple matches**: "You have 3 tasks with 'meeting'. Which one?"
2. **No matches**: "I couldn't find a task matching 'xyz'. Want to create it?"
3. **Incomplete info**: "What would you like to name this task?"

## Context Awareness

Remember previous messages to handle:
- "Delete that" → Refers to last mentioned task
- "Mark it done" → Refers to recently discussed task
- "Add another one" → Similar to previous task creation

## Example Conversations

### Creating a Task
User: "Add buy groceries to my list"
Assistant: [calls add_task(title="Buy groceries")]
→ "Added 'Buy groceries' to your tasks! Anything else?"

### Listing and Completing
User: "What do I need to do?"
Assistant: [calls list_tasks(status="pending")]
→ "You have 3 pending tasks:
   1. Buy groceries
   2. Call mom
   3. Finish report
   Want to mark any as done?"

User: "I got the groceries"
Assistant: [calls complete_task(task_id="...")]
→ "Nice! Marked 'Buy groceries' as complete. 2 tasks remaining."

### Handling "That" Reference
User: "Add call dentist"
Assistant: [calls add_task(title="Call dentist")]
→ "Added 'Call dentist' to your list!"

User: "Actually, delete that"
Assistant: [calls delete_task(task_id="...")]  // Refers to "Call dentist"
→ "Removed 'Call dentist' from your tasks."

### Clarification Needed
User: "Complete the meeting"
Assistant: [calls list_tasks to check]
→ "I found 2 meeting-related tasks:
   1. Team meeting prep
   2. Client meeting notes
   Which one did you complete?"

User: "The first one"
Assistant: [calls complete_task(task_id="...")]
→ "Done! 'Team meeting prep' is now complete."
"""
```

---

## Intent Classification Patterns

### Python Helper (Optional Pre-processing)

```python
import re
from typing import Optional, Tuple

class IntentClassifier:
    """
    Lightweight intent classifier for pre-processing.
    Note: The AI model does the actual classification,
    this is just for analytics/logging.
    """

    PATTERNS = {
        'add_task': [
            r'\b(add|create|remember|remind|need to|have to|should|must)\b',
            r"\bdon't forget\b",
            r'\b(new task|todo)\b',
        ],
        'list_tasks': [
            r'\b(show|list|what|display|see|view)\b.*\b(task|todo|list)\b',
            r"\bwhat's (pending|left|remaining)\b",
            r'\bwhat (do i|did i|have i)\b',
        ],
        'complete_task': [
            r'\b(done|complete|finished|completed)\b',
            r'\bmark.*(done|complete)\b',
            r'\bcheck off\b',
        ],
        'delete_task': [
            r'\b(delete|remove|cancel|forget)\b',
            r'\bnever mind\b',
            r'\bscratch that\b',
        ],
        'update_task': [
            r'\b(change|update|modify|rename|edit|fix)\b',
            r'\bmake it\b',
        ],
    }

    @classmethod
    def classify(cls, text: str) -> Optional[str]:
        """
        Classify user intent based on patterns.
        Returns most likely intent or None.
        """
        text_lower = text.lower()

        for intent, patterns in cls.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return intent

        return None

    @classmethod
    def extract_task_title(cls, text: str) -> Optional[str]:
        """
        Extract task title from add commands.
        """
        # Remove trigger words
        triggers = r'\b(add|create|remember|remind me to|need to|have to)\b'
        title = re.sub(triggers, '', text, flags=re.IGNORECASE).strip()

        # Clean up common patterns
        title = re.sub(r'^(a task (to|for)|to)\s+', '', title, flags=re.IGNORECASE)

        return title if title else None
```

---

## Confirmation Messages

### Success Messages

```python
CONFIRMATIONS = {
    'add_task': [
        "Added '{title}' to your tasks!",
        "Got it! '{title}' is on your list.",
        "'{title}' has been added. Anything else?",
    ],
    'list_tasks': {
        'empty': "You don't have any {status} tasks. Want to add one?",
        'single': "You have 1 {status} task:\n{tasks}",
        'multiple': "You have {count} {status} tasks:\n{tasks}",
    },
    'complete_task': [
        "Nice! '{title}' is done.",
        "Marked '{title}' as complete. {remaining} tasks left.",
        "'{title}' - checked off!",
    ],
    'delete_task': [
        "Removed '{title}' from your list.",
        "'{title}' has been deleted.",
        "Gone! '{title}' is no longer on your list.",
    ],
    'update_task': [
        "Updated '{title}'!",
        "'{old_title}' is now '{new_title}'.",
        "Task has been modified.",
    ],
}

def get_confirmation(action: str, **kwargs) -> str:
    """Get a random confirmation message for an action."""
    import random

    messages = CONFIRMATIONS.get(action, ["Done!"])

    if isinstance(messages, list):
        template = random.choice(messages)
        return template.format(**kwargs)
    elif isinstance(messages, dict):
        # Handle list_tasks special case
        count = kwargs.get('count', 0)
        if count == 0:
            template = messages['empty']
        elif count == 1:
            template = messages['single']
        else:
            template = messages['multiple']
        return template.format(**kwargs)

    return "Done!"
```

---

## Error Handling

### Error Messages

```python
ERROR_MESSAGES = {
    'task_not_found': [
        "I couldn't find a task matching '{query}'. Want to see your task list?",
        "Hmm, I don't see '{query}' in your tasks. Did you mean something else?",
        "No task found for '{query}'. Would you like to create it instead?",
    ],
    'multiple_matches': [
        "I found {count} tasks matching '{query}':\n{options}\nWhich one did you mean?",
        "There are {count} similar tasks. Can you be more specific?\n{options}",
    ],
    'empty_title': [
        "What would you like to name this task?",
        "I need a title for the task. What should I call it?",
    ],
    'already_completed': [
        "'{title}' is already marked as complete!",
        "That task was already done. Want to see your pending tasks?",
    ],
    'no_tasks': [
        "You don't have any tasks yet. Want to add one?",
        "Your task list is empty! Ready to add something?",
    ],
    'invalid_action': [
        "I'm not sure what you'd like me to do. Try 'add', 'show', 'complete', 'delete', or 'update'.",
        "Could you rephrase that? I can help you add, view, complete, delete, or update tasks.",
    ],
    'api_error': [
        "Something went wrong. Please try again.",
        "I encountered an error. Let me try that again.",
    ],
}

def get_error_message(error_type: str, **kwargs) -> str:
    """Get a helpful error message."""
    import random

    messages = ERROR_MESSAGES.get(error_type, ["Something went wrong."])
    template = random.choice(messages)
    return template.format(**kwargs)
```

---

## Context Awareness

### Tracking Recent Context

```python
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime

@dataclass
class ConversationContext:
    """Track recent conversation context for pronoun resolution."""

    last_mentioned_task_id: Optional[str] = None
    last_mentioned_task_title: Optional[str] = None
    last_action: Optional[str] = None
    recent_task_ids: List[str] = None  # Last 5 tasks mentioned

    def __post_init__(self):
        if self.recent_task_ids is None:
            self.recent_task_ids = []

    def update(self, task_id: str, task_title: str, action: str):
        """Update context after an action."""
        self.last_mentioned_task_id = task_id
        self.last_mentioned_task_title = task_title
        self.last_action = action

        # Keep last 5 mentioned tasks
        if task_id not in self.recent_task_ids:
            self.recent_task_ids.insert(0, task_id)
            self.recent_task_ids = self.recent_task_ids[:5]

    def resolve_reference(self, reference: str) -> Optional[str]:
        """
        Resolve pronouns and references to task IDs.

        - "that", "it", "this" → last mentioned task
        - "the first one" → from recent list context
        - "both" → last two mentioned tasks
        """
        reference_lower = reference.lower()

        if reference_lower in ['that', 'it', 'this', 'that one', 'the task']:
            return self.last_mentioned_task_id

        if reference_lower in ['the first one', 'first', '1']:
            return self.recent_task_ids[0] if self.recent_task_ids else None

        if reference_lower in ['the second one', 'second', '2']:
            return self.recent_task_ids[1] if len(self.recent_task_ids) > 1 else None

        return None
```

### System Prompt Context Instructions

```python
CONTEXT_INSTRUCTIONS = """
## Handling References

When users say things like "that", "it", or "the first one", use conversation context:

### Pronoun Resolution
- "Delete that" → Delete the last mentioned task
- "Complete it" → Complete the last discussed task
- "Change that to..." → Update the most recent task

### List References
After showing a numbered list:
- "The first one" → Item 1 from the list
- "Number 2" → Item 2 from the list
- "Both of them" → Items 1 and 2

### Implicit References
- "Add another" → Similar task to the last created
- "Same thing for tomorrow" → Duplicate with modified date
- "Do that again" → Repeat last action

### When Context is Unclear
If you can't determine which task:
1. Ask for clarification
2. Show the most likely options
3. Never guess on destructive actions (delete)

Example:
User: "Delete it"
If last task is clear: [delete the task]
If unclear: "Which task would you like to delete?"
"""
```

---

## Fuzzy Matching

### Task Title Matching

```python
from difflib import SequenceMatcher
from typing import List, Tuple

def find_matching_tasks(
    query: str,
    tasks: List[dict],
    threshold: float = 0.6
) -> List[Tuple[dict, float]]:
    """
    Find tasks that match a query using fuzzy matching.

    Args:
        query: User's search query
        tasks: List of task dictionaries
        threshold: Minimum similarity score (0-1)

    Returns:
        List of (task, score) tuples, sorted by score
    """
    query_lower = query.lower()
    matches = []

    for task in tasks:
        title_lower = task['title'].lower()

        # Exact substring match
        if query_lower in title_lower:
            matches.append((task, 1.0))
            continue

        # Word-level matching
        query_words = set(query_lower.split())
        title_words = set(title_lower.split())
        word_overlap = len(query_words & title_words) / max(len(query_words), 1)

        if word_overlap >= threshold:
            matches.append((task, word_overlap))
            continue

        # Fuzzy string matching
        ratio = SequenceMatcher(None, query_lower, title_lower).ratio()
        if ratio >= threshold:
            matches.append((task, ratio))

    # Sort by score descending
    matches.sort(key=lambda x: x[1], reverse=True)

    return matches


def resolve_task_reference(
    reference: str,
    tasks: List[dict],
    context: ConversationContext
) -> Tuple[Optional[dict], str]:
    """
    Resolve a task reference to a specific task.

    Returns:
        (task, message) - Task if found, else helpful message
    """
    # Check for pronoun references
    task_id = context.resolve_reference(reference)
    if task_id:
        task = next((t for t in tasks if t['task_id'] == task_id), None)
        if task:
            return task, ""

    # Try fuzzy matching
    matches = find_matching_tasks(reference, tasks)

    if not matches:
        return None, get_error_message('task_not_found', query=reference)

    if len(matches) == 1:
        return matches[0][0], ""

    # Multiple matches - ask for clarification
    options = "\n".join(
        f"  {i+1}. {m[0]['title']}"
        for i, m in enumerate(matches[:5])
    )
    return None, get_error_message(
        'multiple_matches',
        count=len(matches),
        query=reference,
        options=options
    )
```

---

## Complete System Prompt

```python
FULL_SYSTEM_PROMPT = """You are TaskFlow AI, a friendly task management assistant.

## Available Tools
- add_task(title, description?) - Create a new task
- list_tasks(status: all|pending|completed) - Show tasks
- complete_task(task_id) - Mark task as done
- delete_task(task_id) - Remove a task
- update_task(task_id, title?, description?) - Modify a task

## Intent Recognition

### Add Task
Keywords: add, create, remember, remind, need to, have to, should, must, don't forget
Examples:
- "Add buy milk" → add_task(title="Buy milk")
- "Remember to call mom" → add_task(title="Call mom")
- "I need to finish the report" → add_task(title="Finish the report")

### List Tasks
Keywords: show, list, what, display, see, view, tasks, pending, completed
Examples:
- "Show my tasks" → list_tasks(status="all")
- "What's pending?" → list_tasks(status="pending")
- "What have I completed?" → list_tasks(status="completed")

### Complete Task
Keywords: done, complete, finished, completed, mark as done, check off
Examples:
- "Done with groceries" → Find task, then complete_task(task_id)
- "I finished the report" → Match and complete
- "Mark meeting as done" → Find meeting task, complete it

### Delete Task
Keywords: delete, remove, cancel, forget, never mind, scratch that
Examples:
- "Delete groceries" → Find and delete_task(task_id)
- "Never mind about the meeting" → Find and delete
- "Remove that" → Delete last mentioned task

### Update Task
Keywords: change, update, modify, rename, edit
Examples:
- "Change groceries to buy vegetables" → update_task(task_id, title="Buy vegetables")
- "Rename that to weekly review" → update_task with new title

## Response Style
- Be friendly and concise
- Confirm actions with task title
- Offer helpful next steps
- Use natural language, not robotic responses

## Context Rules
- "that", "it" → Last mentioned task
- "the first one" → First item from recent list
- When unclear, ask for clarification
- Never guess on destructive actions (delete)

## Error Handling
- Task not found: Offer to create it or show list
- Multiple matches: Show options and ask which one
- Empty input: Ask what they'd like to do

## Example Conversation

User: "Add call dentist"
Assistant: ✓ Added "Call dentist" to your tasks!

User: "Actually, change that to call doctor"
Assistant: ✓ Updated to "Call doctor"

User: "Show my tasks"
Assistant: You have 3 pending tasks:
1. Call doctor
2. Buy groceries
3. Finish report

User: "Done with the second one"
Assistant: ✓ "Buy groceries" marked complete! 2 tasks remaining.

User: "Delete doctor"
Assistant: ✓ Removed "Call doctor" from your list.
"""
```

---

## Testing Intent Recognition

```python
import pytest

TEST_CASES = [
    # Add task
    ("Add buy milk", "add_task", "Buy milk"),
    ("Remember to call mom", "add_task", "Call mom"),
    ("I need to finish the report", "add_task", "Finish the report"),
    ("Don't forget the meeting", "add_task", "The meeting"),

    # List tasks
    ("Show my tasks", "list_tasks", "all"),
    ("What's pending?", "list_tasks", "pending"),
    ("What did I complete?", "list_tasks", "completed"),
    ("List everything", "list_tasks", "all"),

    # Complete task
    ("Done with groceries", "complete_task", "groceries"),
    ("I finished the report", "complete_task", "report"),
    ("Mark meeting as done", "complete_task", "meeting"),

    # Delete task
    ("Delete groceries", "delete_task", "groceries"),
    ("Remove that", "delete_task", None),  # Context-dependent
    ("Never mind about the meeting", "delete_task", "meeting"),

    # Update task
    ("Change groceries to buy vegetables", "update_task", "vegetables"),
    ("Rename that to weekly review", "update_task", "weekly review"),
]

@pytest.mark.parametrize("input_text,expected_intent,expected_extract", TEST_CASES)
def test_intent_classification(input_text, expected_intent, expected_extract):
    """Test that inputs are classified to correct intents."""
    intent = IntentClassifier.classify(input_text)
    assert intent == expected_intent, f"Expected {expected_intent}, got {intent}"
```

---

## Checklist

- [ ] System prompt with intent recognition guidelines
- [ ] Trigger words for each tool (add, list, complete, delete, update)
- [ ] Friendly confirmation messages
- [ ] Error handling (not found, multiple matches, empty input)
- [ ] Context awareness (pronouns, "that", "it")
- [ ] Fuzzy matching for task title search
- [ ] Clarification flow for ambiguous requests
- [ ] Example conversations in system prompt
- [ ] Natural, conversational response style

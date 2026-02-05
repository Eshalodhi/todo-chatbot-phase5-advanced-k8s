"""
Cohere API client wrapper for chat functionality.

This module provides a wrapper around the Cohere SDK with
tool calling support and retry logic for transient errors.
"""

import json
import logging
from typing import Any

import cohere
from cohere.core import ApiError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception
)

from app.config import COHERE_API_KEY, COHERE_MODEL, COHERE_TEMPERATURE
from app.services.chat.tools.definitions import get_tool_definitions

logger = logging.getLogger(__name__)


# System preamble for the AI assistant
SYSTEM_PREAMBLE = """You are a helpful task management assistant that helps users manage their todo tasks through natural language conversation.

When users want to:
- Add, create, or remember something → use add_task tool
- Show, list, or see their tasks → use list_tasks tool
- Mark something as done or complete → use complete_task tool
- Delete, remove, or cancel a task → use delete_task tool
- Change, update, or modify a task → use update_task tool

Always:
- Confirm actions with friendly messages
- Be concise but helpful
- Use emojis sparingly for positive feedback (like checkmarks for completed tasks)
- Handle errors gracefully with helpful explanations
- Remember conversation context from history
- If the user asks something unrelated to task management, politely explain what you can help with

When referencing tasks, try to use the task title rather than IDs when possible for a more natural conversation."""


class CohereClient:
    """
    Wrapper for Cohere API v2 with tool calling support.

    Handles:
    - Client initialization with API key
    - Chat requests with tool definitions
    - Retry logic for transient errors
    - Response parsing
    """

    def __init__(self):
        """Initialize the Cohere client with configuration."""
        if not COHERE_API_KEY:
            raise ValueError("COHERE_API_KEY environment variable is not set")

        self.client = cohere.ClientV2(api_key=COHERE_API_KEY)
        self.model = COHERE_MODEL
        self.temperature = COHERE_TEMPERATURE
        self.tools = get_tool_definitions()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(lambda e: isinstance(e, ApiError) and e.status_code in (429, 503)),
        reraise=True
    )
    def chat(
        self,
        messages: list[dict[str, Any]],
        include_tools: bool = True
    ) -> cohere.ChatResponse:
        """
        Send a chat request to Cohere API.

        Args:
            messages: List of message dictionaries with role and content
            include_tools: Whether to include tool definitions

        Returns:
            Cohere ChatResponse object

        Raises:
            cohere.errors.CohereError: On API errors after retries
        """
        logger.debug(f"Sending chat request with {len(messages)} messages")

        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
        }

        if include_tools:
            kwargs["tools"] = self.tools

        response = self.client.chat(**kwargs)

        content_count = len(response.message.content) if response.message.content else 0
        logger.debug(f"Received response with {content_count} content blocks")

        return response

    def build_messages(
        self,
        history: list[dict[str, Any]],
        user_message: str
    ) -> list[dict[str, Any]]:
        """
        Build the messages array for Cohere API.

        Args:
            history: Previous messages from database
            user_message: Current user message

        Returns:
            List of message dictionaries formatted for Cohere
        """
        messages = [
            {"role": "system", "content": SYSTEM_PREAMBLE}
        ]

        # Add history messages
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })

        return messages

    def format_tool_result(
        self,
        tool_call_id: str,
        result: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Format a tool result for sending back to Cohere.

        Args:
            tool_call_id: The ID from the tool call
            result: The tool execution result

        Returns:
            Message dictionary formatted for Cohere tool result
        """
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": [
                {
                    "type": "document",
                    "document": {
                        "data": json.dumps(result)
                    }
                }
            ]
        }

    def get_response_text(self, response: cohere.ChatResponse) -> str:
        """
        Extract text content from Cohere response.

        Args:
            response: Cohere ChatResponse object

        Returns:
            Text content from the response
        """
        if response.message.content:
            for block in response.message.content:
                if hasattr(block, 'text'):
                    return block.text
        return ""

    def has_tool_calls(self, response: cohere.ChatResponse) -> bool:
        """Check if the response contains tool calls."""
        return bool(response.message.tool_calls)

    def get_tool_calls(
        self,
        response: cohere.ChatResponse
    ) -> list[tuple[str, str, dict[str, Any]]]:
        """
        Extract tool calls from Cohere response.

        Args:
            response: Cohere ChatResponse object

        Returns:
            List of (tool_call_id, tool_name, parameters) tuples
        """
        tool_calls = []

        if response.message.tool_calls:
            for tc in response.message.tool_calls:
                tool_call_id = tc.id
                tool_name = tc.function.name
                # Parse arguments from JSON string
                parameters = json.loads(tc.function.arguments) if tc.function.arguments else {}
                tool_calls.append((tool_call_id, tool_name, parameters))

        return tool_calls

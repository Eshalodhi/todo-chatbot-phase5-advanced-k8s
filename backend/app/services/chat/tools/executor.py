"""
Tool executor for routing Cohere tool calls to appropriate handlers.

The executor receives tool calls from the Cohere API response and
routes them to the appropriate handler functions with user isolation.
"""

import logging
from typing import Any, Callable, Awaitable

from sqlmodel import Session

from app.services.chat.tools.base import ToolResult

logger = logging.getLogger(__name__)


# Type alias for tool handler functions
ToolHandler = Callable[..., Awaitable[ToolResult]]


class ToolExecutor:
    """
    Routes tool calls to their handlers with user isolation.

    Each tool handler receives the user_id as its first argument
    to ensure all database operations are scoped to the current user.
    """

    def __init__(self, session: Session):
        """
        Initialize the executor with a database session.

        Args:
            session: SQLModel database session for tool operations
        """
        self.session = session
        self._handlers: dict[str, ToolHandler] = {}
        self._register_handlers()

    def _register_handlers(self) -> None:
        """Register all available tool handlers."""
        # Import handlers here to avoid circular imports
        from app.services.chat.tools.add_task import handle_add_task
        from app.services.chat.tools.list_tasks import handle_list_tasks
        from app.services.chat.tools.complete_task import handle_complete_task
        from app.services.chat.tools.delete_task import handle_delete_task
        from app.services.chat.tools.update_task import handle_update_task
        from app.services.chat.tools.set_reminder import handle_set_reminder
        from app.services.chat.tools.list_reminders import handle_list_reminders

        self._handlers = {
            "add_task": handle_add_task,
            "list_tasks": handle_list_tasks,
            "complete_task": handle_complete_task,
            "delete_task": handle_delete_task,
            "update_task": handle_update_task,
            "set_reminder": handle_set_reminder,
            "list_reminders": handle_list_reminders,
        }

    async def execute(
        self,
        tool_name: str,
        user_id: str,
        parameters: dict[str, Any]
    ) -> ToolResult:
        """
        Execute a tool by name with the given parameters.

        Args:
            tool_name: Name of the tool to execute
            user_id: User ID for isolation (from JWT)
            parameters: Tool-specific parameters from Cohere

        Returns:
            ToolResult with success status, message, and optional data
        """
        handler = self._handlers.get(tool_name)

        if not handler:
            logger.warning(f"Unknown tool requested: {tool_name}")
            return ToolResult(
                success=False,
                message=f"Unknown tool: {tool_name}"
            )

        try:
            logger.info(f"Executing tool {tool_name} for user {user_id}")
            result = await handler(
                session=self.session,
                user_id=user_id,
                **parameters
            )
            logger.info(f"Tool {tool_name} completed: success={result.success}")
            return result

        except Exception as e:
            logger.error(f"Tool {tool_name} failed: {e}", exc_info=True)
            return ToolResult(
                success=False,
                message="An error occurred while executing the tool. Please try again."
            )

    def get_available_tools(self) -> list[str]:
        """Return list of available tool names."""
        return list(self._handlers.keys())

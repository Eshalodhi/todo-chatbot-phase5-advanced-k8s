"""MCP tools package for task management via chat."""

from app.services.chat.tools.base import ToolResult
from app.services.chat.tools.executor import ToolExecutor

__all__ = ["ToolResult", "ToolExecutor"]

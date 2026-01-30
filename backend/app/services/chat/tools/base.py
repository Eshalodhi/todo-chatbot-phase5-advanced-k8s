"""Base classes and utilities for MCP tools."""

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ToolResult:
    """
    Standardized result format for all MCP tools.

    All tools must return this structure to ensure consistent
    handling by the chat service and Cohere API.

    Attributes:
        success: Whether the tool execution succeeded
        message: Human-readable result or error message
        data: Optional structured data from the tool execution
    """

    success: bool
    message: str
    data: Optional[dict[str, Any]] = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }

    def to_cohere_format(self) -> dict[str, Any]:
        """
        Convert to Cohere tool result format.

        Format required by Cohere API v2 for tool execution results.
        """
        return {
            "type": "document",
            "document": {
                "data": self.to_dict()
            }
        }

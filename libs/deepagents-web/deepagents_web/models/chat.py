"""Pydantic models for chat WebSocket messages."""

from typing import Any, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """A chat message."""

    role: Literal["user", "assistant", "system"]
    content: str


class WebSocketMessage(BaseModel):
    """A WebSocket message sent to the client."""

    type: Literal["text", "tool_call", "tool_result", "interrupt", "todo", "error", "done"]
    data: Any


class InterruptRequest(BaseModel):
    """HITL interrupt request sent to client for approval."""

    interrupt_id: str
    tool_name: str
    description: str
    args: dict[str, Any]


class InterruptResponse(BaseModel):
    """HITL interrupt response from client."""

    interrupt_id: str
    decision: Literal["approve", "reject"]
    message: str | None = None


class UserMessage(BaseModel):
    """User message received from WebSocket."""

    type: Literal["message", "interrupt_response", "stop"]
    content: str | None = None
    data: dict[str, Any] | None = None

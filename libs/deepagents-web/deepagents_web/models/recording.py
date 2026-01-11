"""Pydantic models for browser recording."""

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel


class ActionType(str, Enum):
    """Supported browser action types."""

    NAVIGATE = "navigate"
    CLICK = "click"
    FILL = "fill"
    SELECT = "select"
    CHECK = "check"
    UNCHECK = "uncheck"
    PRESS = "press"
    SCREENSHOT = "screenshot"
    WAIT = "wait"
    ASSERT_VISIBLE = "assert_visible"
    ASSERT_TEXT = "assert_text"


class RecordedAction(BaseModel):
    """Single recorded browser action."""

    type: ActionType
    selector: str | None = None
    value: str | None = None
    timestamp: float
    screenshot: str | None = None
    x: int | None = None
    y: int | None = None


class RecordingSession(BaseModel):
    """Active recording session state."""

    session_id: str
    status: Literal["idle", "recording", "stopped"]
    actions: list[RecordedAction] = []
    start_url: str | None = None


class RecordingStartRequest(BaseModel):
    """Request to start recording."""

    start_url: str = "about:blank"
    headless: bool = False


class RecordingStopRequest(BaseModel):
    """Request to stop recording."""

    session_id: str


class RecordingWebSocketMessage(BaseModel):
    """WebSocket message for recording events."""

    type: Literal["action", "screenshot", "error", "status", "session"]
    data: Any

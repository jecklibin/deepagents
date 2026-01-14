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
    SCROLL = "scroll"
    HOVER = "hover"
    DRAG = "drag"
    # AI-powered actions
    EXTRACT = "extract"  # Extract data using CSS selector
    EXTRACT_TEXT = "extract_text"  # Extract text content
    EXTRACT_HTML = "extract_html"  # Extract HTML content
    EXTRACT_ATTRIBUTE = "extract_attribute"  # Extract attribute value
    AI_EXTRACT = "ai_extract"  # Extract data using AI prompt
    AI_FILL = "ai_fill"  # Fill form using AI-generated content
    EXECUTE_JS = "execute_js"  # Execute AI-generated JavaScript


class ActionIntent(BaseModel):
    """Operation intent for self-healing selectors."""

    verb: str  # click, input, select, extract
    object: str  # accessible name or description


class ActionAccessibility(BaseModel):
    """ARIA/accessibility info for element."""

    role: str  # button, textbox, link, etc.
    name: str  # accessible name
    value: str | None = None


class ActionContext(BaseModel):
    """Surrounding context for element location."""

    nearby_text: list[str] = []
    ancestor_tags: list[str] = []
    form_hint: str | None = None  # login, search, checkout


class ActionEvidence(BaseModel):
    """Recording confidence metadata."""

    confidence: float = 0.5  # 0-1 selector reliability


class RecordedAction(BaseModel):
    """Single recorded browser action."""

    type: ActionType
    selector: str | None = None
    xpath: str | None = None  # XPath selector for dual strategy
    value: str | None = None
    timestamp: float
    screenshot: str | None = None
    x: int | None = None
    y: int | None = None
    screenshot_b64: str | None = None
    dom_snapshot: str | None = None
    robust_selector: str | None = None
    tag_name: str | None = None
    text: str | None = None
    # AI action fields
    prompt: str | None = None  # AI prompt for ai_extract/ai_fill
    output_key: str | None = None  # Key to store extracted data
    # Extract-specific fields
    extract_type: str | None = None  # text, html, attribute
    variable_name: str | None = None
    attribute_name: str | None = None
    # AI-generated code
    js_code: str | None = None
    # Semantic fields for self-healing
    intent: ActionIntent | None = None
    accessibility: ActionAccessibility | None = None
    context: ActionContext | None = None
    evidence: ActionEvidence | None = None


class RecordingSession(BaseModel):
    """Active recording session state."""

    session_id: str
    status: Literal["idle", "recording", "stopped"]
    actions: list[RecordedAction] = []
    start_url: str | None = None
    profile_id: str | None = None


class RecordingStartRequest(BaseModel):
    """Request to start recording."""

    start_url: str = "about:blank"
    headless: bool = False
    profile_id: str | None = None


class RecordingStopRequest(BaseModel):
    """Request to stop recording."""

    session_id: str


class RecordingWebSocketMessage(BaseModel):
    """WebSocket message for recording events."""

    type: Literal["action", "screenshot", "error", "status", "session"]
    data: Any

"""Pydantic models for RPA workflow definition and execution."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RPAActionType(str, Enum):
    """RPA atomic operation types."""

    # Browser operations
    BROWSER_OPEN = "browser_open"
    BROWSER_NAVIGATE = "browser_navigate"
    BROWSER_CLICK = "browser_click"
    BROWSER_FILL = "browser_fill"
    BROWSER_EXTRACT = "browser_extract"
    BROWSER_CLOSE = "browser_close"
    BROWSER_WAIT = "browser_wait"
    BROWSER_SCREENSHOT = "browser_screenshot"
    # File operations
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_EXISTS = "file_exists"
    FILE_DELETE = "file_delete"
    FILE_COPY = "file_copy"
    FILE_MOVE = "file_move"
    # System operations
    SYSTEM_RUN = "system_run"
    SYSTEM_WAIT = "system_wait"
    SYSTEM_ENV_GET = "system_env_get"
    SYSTEM_ENV_SET = "system_env_set"
    # Keyboard/Mouse operations
    KEYBOARD_TYPE = "keyboard_type"
    KEYBOARD_PRESS = "keyboard_press"
    MOUSE_CLICK = "mouse_click"
    MOUSE_MOVE = "mouse_move"
    # Control flow
    FLOW_IF = "flow_if"
    FLOW_LOOP = "flow_loop"
    FLOW_TRY = "flow_try"
    # Variable operations
    VAR_SET = "var_set"
    VAR_GET = "var_get"


class RPAActionParam(BaseModel):
    """Action parameter definition."""

    key: str
    value: Any
    type: str = "string"  # string, int, float, bool, list, dict


class RPAAction(BaseModel):
    """Single RPA action."""

    id: str
    type: RPAActionType
    params: list[RPAActionParam] = Field(default_factory=list)
    # Advanced parameters (reference AstronRPA)
    delay_before: float = 0
    delay_after: float = 0
    skip_on_error: bool = False
    retry_count: int = 0
    retry_interval: float = 1.0
    # Output variable
    output_var: str | None = None
    # Nested actions for control flow
    children: list["RPAAction"] = Field(default_factory=list)
    # Condition for flow_if
    condition: str | None = None
    # Else branch for flow_if
    else_children: list["RPAAction"] = Field(default_factory=list)


class RPAWorkflow(BaseModel):
    """RPA workflow definition."""

    name: str
    description: str = ""
    version: str = "1.0"
    # Input parameters
    input_params: list[RPAActionParam] = Field(default_factory=list)
    # Action sequence
    actions: list[RPAAction] = Field(default_factory=list)
    # Output parameters
    output_params: list[str] = Field(default_factory=list)


class RPAExecutionResult(BaseModel):
    """RPA execution result."""

    success: bool
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    duration: float = 0
    action_results: list[dict[str, Any]] = Field(default_factory=list)


class RPASkillCreate(BaseModel):
    """Request model for creating an RPA skill."""

    name: str
    workflow: RPAWorkflow


class RPASkillExecute(BaseModel):
    """Request model for executing an RPA skill."""

    params: dict[str, Any] = Field(default_factory=dict)


class RPAActionMetadata(BaseModel):
    """Metadata for an RPA action type."""

    type: str
    name: str
    description: str
    category: str
    params: list[dict[str, Any]] = Field(default_factory=list)
    output_type: str | None = None

"""Pydantic models for hybrid skill definition and execution."""

import re
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator

# Agent Skills spec constraint
MAX_SKILL_NAME_LENGTH = 64


class HybridStepType(str, Enum):
    """Types of steps in a hybrid skill."""

    RECORDING = "recording"  # Browser recording step
    NL = "nl"  # Natural language description step
    RPA = "rpa"  # RPA workflow step
    SKILL_REF = "skill_ref"  # Reference to existing skill


class VariableMapping(BaseModel):
    """Mapping from context variable to step input."""

    source_var: str  # Variable name in context
    target_param: str  # Parameter name in step


class HybridStepBase(BaseModel):
    """Base model for hybrid skill steps."""

    id: str
    type: HybridStepType
    name: str
    description: str = ""
    # Variable mappings
    input_mappings: list[VariableMapping] = Field(default_factory=list)
    output_var: str | None = None  # Variable name to store result
    # Execution control
    skip_on_error: bool = False
    retry_count: int = 0
    retry_interval: float = 1.0
    delay_before: float = 0
    delay_after: float = 0


class RecordingStep(HybridStepBase):
    """Step that executes a browser recording."""

    type: HybridStepType = HybridStepType.RECORDING
    # Recording data
    session_id: str | None = None  # Reference to recording session
    script_path: str | None = None  # Path to generated script
    # Recorded actions (stored directly in the step)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    # Start URL for recording
    start_url: str | None = None


class NaturalLanguageStep(HybridStepBase):
    """Step that executes based on natural language instructions."""

    type: HybridStepType = HybridStepType.NL
    # NL instructions
    instructions: str = ""
    # Optional context hints
    context_hints: list[str] = Field(default_factory=list)


class RPAStep(HybridStepBase):
    """Step that executes an RPA workflow."""

    type: HybridStepType = HybridStepType.RPA
    # Inline workflow definition (stored directly in the step)
    workflow: dict[str, Any] | None = None
    # Or reference to workflow file path
    workflow_path: str | None = None


class SkillRefStep(HybridStepBase):
    """Step that references and executes an existing skill."""

    type: HybridStepType = HybridStepType.SKILL_REF
    # Reference to existing skill
    skill_name: str = ""
    # Parameter overrides
    param_overrides: dict[str, Any] = Field(default_factory=dict)


# Union type for all step types
HybridStep = RecordingStep | NaturalLanguageStep | RPAStep | SkillRefStep


class HybridSkillDefinition(BaseModel):
    """Complete hybrid skill definition."""

    name: str
    description: str = ""
    version: str = "1.0"
    # Input parameters for the skill
    input_params: list[dict[str, Any]] = Field(default_factory=list)
    # Steps to execute
    steps: list[HybridStep] = Field(default_factory=list)
    # Output parameters
    output_params: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate skill name per Agent Skills spec."""
        if not v or not v.strip():
            msg = "name cannot be empty"
            raise ValueError(msg)
        if len(v) > MAX_SKILL_NAME_LENGTH:
            msg = "name cannot exceed 64 characters"
            raise ValueError(msg)
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", v):
            msg = "name must be lowercase alphanumeric with single hyphens only"
            raise ValueError(msg)
        return v


class HybridStepResult(BaseModel):
    """Result of executing a single hybrid step."""

    step_id: str
    step_type: HybridStepType
    success: bool
    output: Any = None
    error: str | None = None
    duration: float = 0
    skipped: bool = False


class HybridExecutionResult(BaseModel):
    """Result of executing a hybrid skill."""

    success: bool
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    duration: float = 0
    step_results: list[HybridStepResult] = Field(default_factory=list)


# Request/Response models for API


class HybridSkillCreate(BaseModel):
    """Request model for creating a hybrid skill."""

    name: str
    description: str = ""
    input_params: list[dict[str, Any]] = Field(default_factory=list)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    output_params: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate skill name per Agent Skills spec."""
        if not v or not v.strip():
            msg = "name cannot be empty"
            raise ValueError(msg)
        if len(v) > MAX_SKILL_NAME_LENGTH:
            msg = "name cannot exceed 64 characters"
            raise ValueError(msg)
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", v):
            msg = "name must be lowercase alphanumeric with single hyphens only"
            raise ValueError(msg)
        return v


class HybridSkillUpdate(BaseModel):
    """Request model for updating a hybrid skill."""

    description: str | None = None
    input_params: list[dict[str, Any]] | None = None
    steps: list[dict[str, Any]] | None = None
    output_params: list[str] | None = None


class HybridStepCreate(BaseModel):
    """Request model for adding a step to a hybrid skill."""

    type: HybridStepType
    name: str
    description: str = ""
    # Step-specific data
    data: dict[str, Any] = Field(default_factory=dict)
    # Variable mappings
    input_mappings: list[dict[str, str]] = Field(default_factory=list)
    output_var: str | None = None
    # Execution control
    skip_on_error: bool = False
    retry_count: int = 0
    # Position in step list (None = append)
    position: int | None = None


class HybridSkillExecute(BaseModel):
    """Request model for executing a hybrid skill."""

    params: dict[str, Any] = Field(default_factory=dict)


class HybridSkillResponse(BaseModel):
    """Response model for a hybrid skill."""

    name: str
    description: str
    path: str
    version: str
    input_params: list[dict[str, Any]]
    steps: list[dict[str, Any]]
    output_params: list[str]


class HybridSkillListResponse(BaseModel):
    """Response model for listing hybrid skills."""

    skills: list[HybridSkillResponse]

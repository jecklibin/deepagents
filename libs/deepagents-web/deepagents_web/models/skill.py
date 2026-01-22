"""Pydantic models for skill management."""

import re
from typing import Any, Literal

from pydantic import BaseModel, field_validator

# Agent Skills spec constraint
MAX_SKILL_NAME_LENGTH = 64


class SkillCreateFromNL(BaseModel):
    """Create skill from natural language description."""

    name: str
    goal: str
    steps: str

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


class SkillCreateFromRecording(BaseModel):
    """Create skill from recorded browser actions."""

    name: str
    description: str
    session_id: str

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


class SkillTestRequest(BaseModel):
    """Request to test a skill."""

    test_input: dict[str, Any] | None = None


class SkillTestResult(BaseModel):
    """Result of skill test execution."""

    success: bool
    duration_ms: float
    output: str | None = None
    error: str | None = None
    screenshots: list[str] = []


class SkillCreate(BaseModel):
    """Request model for creating a skill."""

    name: str
    description: str
    content: str | None = None

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


class SkillUpdate(BaseModel):
    """Request model for updating a skill."""

    description: str | None = None
    content: str


class SkillResponse(BaseModel):
    """Response model for a skill."""

    name: str
    description: str
    path: str
    source: Literal["user", "project"]
    type: str | None = None
    content: str | None = None


class SkillListResponse(BaseModel):
    """Response model for listing skills."""

    skills: list[SkillResponse]

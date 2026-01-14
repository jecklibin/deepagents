"""Pydantic models for browser profile management."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

MAX_PROFILE_NAME_LENGTH = 64


class BrowserProfile(BaseModel):
    """Browser profile for session persistence."""

    id: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None
    storage_state_path: str | None = None


class BrowserSession(BaseModel):
    """Active browser session."""

    session_id: str
    profile_id: str | None = None
    status: Literal["idle", "recording", "connected"]
    current_url: str | None = None


class BrowserProfileCreate(BaseModel):
    """Request to create a browser profile."""

    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate profile name."""
        if not v or not v.strip():
            msg = "name cannot be empty"
            raise ValueError(msg)
        if len(v) > MAX_PROFILE_NAME_LENGTH:
            msg = "name cannot exceed 64 characters"
            raise ValueError(msg)
        return v.strip()


class BrowserProfileResponse(BaseModel):
    """Response for browser profile."""

    id: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None


class BrowserProfileListResponse(BaseModel):
    """Response for listing browser profiles."""

    profiles: list[BrowserProfileResponse]


class BrowserSessionCreate(BaseModel):
    """Request to create a browser session."""

    profile_id: str | None = None
    start_url: str = "about:blank"

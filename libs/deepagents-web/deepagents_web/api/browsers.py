"""REST API endpoints for browser profile management."""

from fastapi import APIRouter, HTTPException

from deepagents_web.models.browser import (
    BrowserProfileCreate,
    BrowserProfileListResponse,
    BrowserProfileResponse,
)
from deepagents_web.services.browser_service import BrowserService

router = APIRouter(prefix="/browsers", tags=["browsers"])


def get_browser_service() -> BrowserService:
    """Get browser service instance."""
    return BrowserService()


@router.get("/profiles")
async def list_profiles() -> BrowserProfileListResponse:
    """List all browser profiles."""
    service = get_browser_service()
    profiles = service.list_profiles()
    return BrowserProfileListResponse(profiles=profiles)


@router.post("/profiles", status_code=201)
async def create_profile(profile: BrowserProfileCreate) -> BrowserProfileResponse:
    """Create a new browser profile."""
    service = get_browser_service()
    try:
        return service.create_profile(name=profile.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: str) -> BrowserProfileResponse:
    """Get a browser profile by ID."""
    service = get_browser_service()
    profile = service.get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return BrowserProfileResponse(
        id=profile.id,
        name=profile.name,
        created_at=profile.created_at,
        last_used_at=profile.last_used_at,
    )


@router.delete("/profiles/{profile_id}", status_code=204)
async def delete_profile(profile_id: str) -> None:
    """Delete a browser profile."""
    service = get_browser_service()
    if not service.delete_profile(profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")

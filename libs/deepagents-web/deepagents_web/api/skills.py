"""REST API endpoints for skill management."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from deepagents_web.models.skill import (
    SkillCreate,
    SkillListResponse,
    SkillResponse,
    SkillUpdate,
)
from deepagents_web.services.skill_service import SkillService

router = APIRouter(prefix="/skills", tags=["skills"])


def get_skill_service(agent_name: str = "agent") -> SkillService:
    """Get skill service instance."""
    return SkillService(agent_name=agent_name)


@router.get("")
async def list_skills(
    agent: str = "agent",
    project_only: Annotated[bool, Query()] = False,
) -> SkillListResponse:
    """List all available skills."""
    service = get_skill_service(agent)
    skills = service.list_skills(project_only=project_only)
    return SkillListResponse(skills=skills)


@router.post("", status_code=201)
async def create_skill(
    skill: SkillCreate,
    agent: str = "agent",
    project: Annotated[bool, Query()] = False,
) -> SkillResponse:
    """Create a new skill."""
    service = get_skill_service(agent)
    try:
        return service.create_skill(
            name=skill.name,
            description=skill.description,
            content=skill.content,
            project=project,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{name}")
async def get_skill(name: str, agent: str = "agent") -> SkillResponse:
    """Get a skill by name with full content."""
    service = get_skill_service(agent)
    skill = service.get_skill(name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    return skill


@router.put("/{name}")
async def update_skill(name: str, skill: SkillUpdate, agent: str = "agent") -> SkillResponse:
    """Update an existing skill."""
    service = get_skill_service(agent)
    try:
        return service.update_skill(
            name=name,
            content=skill.content,
            description=skill.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{name}", status_code=204)
async def delete_skill(name: str, agent: str = "agent") -> None:
    """Delete a skill."""
    service = get_skill_service(agent)
    try:
        service.delete_skill(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

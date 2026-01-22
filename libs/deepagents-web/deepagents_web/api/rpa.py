"""REST API endpoints for RPA skill management."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from deepagents_web.models.rpa import (
    RPAActionMetadata,
    RPAExecutionResult,
    RPASkillCreate,
    RPASkillExecute,
    RPAWorkflow,
)
from deepagents_web.models.skill import SkillResponse
from deepagents_web.rpa.actions.base import ActionRegistry
from deepagents_web.services.rpa_service import RPASkillService

router = APIRouter(prefix="/rpa", tags=["rpa"])


def get_rpa_service(agent_name: str = "agent") -> RPASkillService:
    """Get RPA skill service instance."""
    return RPASkillService(agent_name=agent_name)


@router.get("/actions")
async def list_actions() -> list[RPAActionMetadata]:
    """List all available RPA actions."""
    # Import action modules to ensure they're registered
    from deepagents_web.rpa.actions import (
        browser,  # noqa: F401
        file,  # noqa: F401
        keyboard,  # noqa: F401
        system,  # noqa: F401
        variable,  # noqa: F401
    )

    actions = ActionRegistry.list_actions()
    return [RPAActionMetadata(**action) for action in actions]


@router.post("/skills", status_code=201)
async def create_rpa_skill(
    skill: RPASkillCreate,
    agent: str = "agent",
    project: Annotated[bool, Query()] = False,
) -> SkillResponse:
    """Create a new RPA skill."""
    service = get_rpa_service(agent)
    try:
        return service.create_rpa_skill(
            name=skill.name,
            workflow=skill.workflow,
            project=project,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/skills/{name}")
async def get_rpa_skill(
    name: str,
    agent: str = "agent",
) -> dict:
    """Get an RPA skill by name with workflow."""
    service = get_rpa_service(agent)
    skill, workflow = service.get_rpa_skill(name)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")

    return {
        "skill": skill.model_dump(),
        "workflow": workflow.model_dump() if workflow else None,
    }


@router.put("/skills/{name}")
async def update_rpa_skill(
    name: str,
    workflow: RPAWorkflow,
    agent: str = "agent",
) -> SkillResponse:
    """Update an existing RPA skill."""
    service = get_rpa_service(agent)
    try:
        return service.update_rpa_skill(name=name, workflow=workflow)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/skills/{name}/execute")
async def execute_rpa_skill(
    name: str,
    request: RPASkillExecute,
    agent: str = "agent",
) -> RPAExecutionResult:
    """Execute an RPA skill."""
    service = get_rpa_service(agent)
    result = service.execute_rpa_skill(name=name, params=request.params)

    if not result.success and "not found" in (result.error or "").lower():
        raise HTTPException(status_code=404, detail=result.error)

    return result

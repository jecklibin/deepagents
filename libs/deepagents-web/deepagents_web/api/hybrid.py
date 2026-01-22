"""REST API endpoints for hybrid skill management."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from deepagents_web.models.hybrid import (
    HybridExecutionResult,
    HybridSkillCreate,
    HybridSkillExecute,
    HybridSkillListResponse,
    HybridSkillResponse,
    HybridSkillUpdate,
    HybridStepCreate,
    HybridStepType,
)
from deepagents_web.services.hybrid_executor import HybridSkillExecutor
from deepagents_web.services.hybrid_service import HybridSkillService

router = APIRouter(prefix="/hybrid", tags=["hybrid"])


def get_hybrid_service(agent_name: str = "agent") -> HybridSkillService:
    """Get hybrid skill service instance."""
    return HybridSkillService(agent_name=agent_name)


@router.get("/skills")
async def list_hybrid_skills(
    agent: str = "agent",
    project_only: Annotated[bool, Query()] = False,
) -> HybridSkillListResponse:
    """List all hybrid skills."""
    service = get_hybrid_service(agent)
    skills = service.list_hybrid_skills(project_only=project_only)
    return HybridSkillListResponse(skills=skills)


@router.post("/skills", status_code=201)
async def create_hybrid_skill(
    skill: HybridSkillCreate,
    agent: str = "agent",
    project: Annotated[bool, Query()] = False,
) -> HybridSkillResponse:
    """Create a new hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        return service.create_hybrid_skill(
            name=skill.name,
            description=skill.description,
            input_params=skill.input_params,
            steps=skill.steps,
            output_params=skill.output_params,
            project=project,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/skills/{name}")
async def get_hybrid_skill(
    name: str,
    agent: str = "agent",
) -> HybridSkillResponse:
    """Get a hybrid skill by name with definition."""
    service = get_hybrid_service(agent)
    skill, definition = service.get_hybrid_skill(name)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")

    if not definition:
        raise HTTPException(
            status_code=400, detail=f"Skill '{name}' is not a hybrid skill"
        )

    return HybridSkillResponse(
        name=definition.name,
        description=definition.description,
        path=skill.path,
        version=definition.version,
        input_params=definition.input_params,
        steps=[s.model_dump() for s in definition.steps],
        output_params=definition.output_params,
    )


@router.put("/skills/{name}")
async def update_hybrid_skill(
    name: str,
    update: HybridSkillUpdate,
    agent: str = "agent",
) -> HybridSkillResponse:
    """Update an existing hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        return service.update_hybrid_skill(
            name=name,
            description=update.description,
            input_params=update.input_params,
            steps=update.steps,
            output_params=update.output_params,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/skills/{name}", status_code=204)
async def delete_hybrid_skill(
    name: str,
    agent: str = "agent",
) -> None:
    """Delete a hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        service.delete_hybrid_skill(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/skills/{name}/execute")
async def execute_hybrid_skill(
    name: str,
    request: HybridSkillExecute,
    agent: str = "agent",
) -> HybridExecutionResult:
    """Execute a hybrid skill."""
    service = get_hybrid_service(agent)
    skill, definition = service.get_hybrid_skill(name)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")

    if not definition:
        raise HTTPException(
            status_code=400, detail=f"Skill '{name}' is not a hybrid skill"
        )

    executor = HybridSkillExecutor()
    result = await executor.execute(definition, request.params, skill.path)

    return result


@router.post("/skills/{name}/steps")
async def add_step(
    name: str,
    step: HybridStepCreate,
    agent: str = "agent",
) -> HybridSkillResponse:
    """Add a step to a hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        return service.add_step(
            skill_name=name,
            step_type=step.type,
            step_name=step.name,
            description=step.description,
            data=step.data,
            input_mappings=step.input_mappings,
            output_var=step.output_var,
            skip_on_error=step.skip_on_error,
            retry_count=step.retry_count,
            position=step.position,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/skills/{name}/steps/{step_id}")
async def remove_step(
    name: str,
    step_id: str,
    agent: str = "agent",
) -> HybridSkillResponse:
    """Remove a step from a hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        return service.remove_step(skill_name=name, step_id=step_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/skills/{name}/steps/reorder")
async def reorder_steps(
    name: str,
    step_ids: list[str],
    agent: str = "agent",
) -> HybridSkillResponse:
    """Reorder steps in a hybrid skill."""
    service = get_hybrid_service(agent)
    try:
        return service.reorder_steps(skill_name=name, step_ids=step_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/step-types")
async def list_step_types() -> list[dict]:
    """List all available step types."""
    return [
        {
            "type": HybridStepType.RECORDING.value,
            "name": "Recording",
            "description": "Execute a browser recording",
            "icon": "record",
        },
        {
            "type": HybridStepType.NL.value,
            "name": "Natural Language",
            "description": "Execute based on natural language instructions",
            "icon": "chat",
        },
        {
            "type": HybridStepType.RPA.value,
            "name": "RPA Workflow",
            "description": "Execute an RPA workflow",
            "icon": "workflow",
        },
        {
            "type": HybridStepType.SKILL_REF.value,
            "name": "Skill Reference",
            "description": "Execute an existing skill",
            "icon": "link",
        },
    ]

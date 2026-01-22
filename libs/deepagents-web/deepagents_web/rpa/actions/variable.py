"""Variable atomic operations for RPA."""

from __future__ import annotations

from typing import Any

from deepagents_web.rpa.actions.base import ExecutionContext, action


@action(
    "var_set",
    name="Set Variable",
    description="Set a variable value",
    category="variable",
    params=[
        {"key": "name", "type": "string", "required": True},
        {"key": "value", "type": "any", "required": True},
    ],
)
def var_set(
    context: ExecutionContext,
    *,
    name: str,
    value: Any,
    **kwargs: Any,  # noqa: ARG001
) -> Any:
    """Set a variable value."""
    resolved_value = context.resolve_value(value)
    context.set_var(name, resolved_value)
    return resolved_value


@action(
    "var_get",
    name="Get Variable",
    description="Get a variable value",
    category="variable",
    params=[
        {"key": "name", "type": "string", "required": True},
        {"key": "default", "type": "any", "default": None},
    ],
    output_type="any",
)
def var_get(
    context: ExecutionContext,
    *,
    name: str,
    default: Any = None,
    **kwargs: Any,  # noqa: ARG001
) -> Any:
    """Get a variable value."""
    return context.get_var(name, default)

"""RPA workflow execution engine."""

from __future__ import annotations

import time
from typing import Any

from deepagents_web.models.rpa import (
    RPAAction,
    RPAActionType,
    RPAExecutionResult,
    RPAWorkflow,
)

# Import action modules to register them
from deepagents_web.rpa.actions import (
    browser,  # noqa: F401
    file,  # noqa: F401
    keyboard,  # noqa: F401
    system,  # noqa: F401
    variable,  # noqa: F401
)
from deepagents_web.rpa.actions.base import ActionRegistry, ExecutionContext


class RPAEngine:
    """RPA workflow execution engine."""

    def execute(
        self,
        workflow: RPAWorkflow,
        input_params: dict[str, Any] | None = None,
    ) -> RPAExecutionResult:
        """Execute an RPA workflow."""
        start_time = time.time()
        context = ExecutionContext()
        action_results: list[dict[str, Any]] = []

        # Initialize input parameters
        if input_params:
            for key, value in input_params.items():
                context.set_var(key, value)

        # Initialize workflow-defined input parameter defaults
        for param in workflow.input_params:
            if param.key not in context.variables:
                context.set_var(param.key, param.value)

        try:
            # Execute action sequence
            for action in workflow.actions:
                result = self._execute_action(context, action, action_results)

                # Save output variable
                if action.output_var and result is not None:
                    context.set_var(action.output_var, result)

            # Collect output parameters
            output: dict[str, Any] = {}
            for param_name in workflow.output_params:
                output[param_name] = context.get_var(param_name)

            return RPAExecutionResult(
                success=True,
                output=output,
                duration=time.time() - start_time,
                action_results=action_results,
            )

        except Exception as e:  # noqa: BLE001
            return RPAExecutionResult(
                success=False,
                error=str(e),
                duration=time.time() - start_time,
                action_results=action_results,
            )
        finally:
            # Clean up resources
            context.cleanup()

    def _execute_action(
        self,
        context: ExecutionContext,
        action: RPAAction,
        action_results: list[dict[str, Any]],
    ) -> Any:
        """Execute a single action."""
        # Handle control flow actions
        if action.type == RPAActionType.FLOW_IF:
            return self._execute_if(context, action, action_results)
        if action.type == RPAActionType.FLOW_LOOP:
            return self._execute_loop(context, action, action_results)
        if action.type == RPAActionType.FLOW_TRY:
            return self._execute_try(context, action, action_results)

        # Get action function
        action_func = ActionRegistry.get(action.type.value)
        if not action_func:
            msg = f"Unknown action type: {action.type}"
            raise ValueError(msg)

        # Resolve parameters
        kwargs: dict[str, Any] = {}
        for param in action.params:
            kwargs[param.key] = context.resolve_value(param.value)

        # Add advanced parameters
        kwargs["delay_before"] = action.delay_before
        kwargs["delay_after"] = action.delay_after
        kwargs["skip_on_error"] = action.skip_on_error
        kwargs["retry_count"] = action.retry_count
        kwargs["retry_interval"] = action.retry_interval

        # Execute
        try:
            result = action_func(context, **kwargs)
            action_results.append(
                {
                    "action_id": action.id,
                    "type": action.type.value,
                    "success": True,
                    "result": result,
                }
            )
            return result  # noqa: TRY300
        except Exception as e:
            action_results.append(
                {
                    "action_id": action.id,
                    "type": action.type.value,
                    "success": False,
                    "error": str(e),
                }
            )
            raise

    def _execute_if(
        self,
        context: ExecutionContext,
        action: RPAAction,
        action_results: list[dict[str, Any]],
    ) -> Any:
        """Execute an if control flow action."""
        condition = action.condition or ""
        resolved_condition = context.resolve_value(condition)

        # Evaluate condition
        if self._evaluate_condition(context, resolved_condition):
            # Execute children
            result = None
            for child in action.children:
                result = self._execute_action(context, child, action_results)
                if child.output_var and result is not None:
                    context.set_var(child.output_var, result)
            return result
        # Execute else branch
        result = None
        for child in action.else_children:
            result = self._execute_action(context, child, action_results)
            if child.output_var and result is not None:
                context.set_var(child.output_var, result)
        return result

    def _execute_loop(  # noqa: PLR0912
        self,
        context: ExecutionContext,
        action: RPAAction,
        action_results: list[dict[str, Any]],
    ) -> Any:
        """Execute a loop control flow action."""
        # Get loop parameters
        loop_count = 0
        loop_items: list[Any] = []

        for param in action.params:
            if param.key == "count":
                loop_count = int(context.resolve_value(param.value))
            elif param.key == "items":
                items = context.resolve_value(param.value)
                if isinstance(items, list):
                    loop_items = items
            elif param.key == "item_var":
                item_var = context.resolve_value(param.value)

        result = None

        if loop_items:
            # Iterate over items
            for i, item in enumerate(loop_items):
                context.set_var("loop_index", i)
                if "item_var" in locals():
                    context.set_var(item_var, item)
                for child in action.children:
                    result = self._execute_action(context, child, action_results)
                    if child.output_var and result is not None:
                        context.set_var(child.output_var, result)
        elif loop_count > 0:
            # Loop by count
            for i in range(loop_count):
                context.set_var("loop_index", i)
                for child in action.children:
                    result = self._execute_action(context, child, action_results)
                    if child.output_var and result is not None:
                        context.set_var(child.output_var, result)

        return result

    def _execute_try(
        self,
        context: ExecutionContext,
        action: RPAAction,
        action_results: list[dict[str, Any]],
    ) -> Any:
        """Execute a try-catch control flow action."""
        try:
            result = None
            for child in action.children:
                result = self._execute_action(context, child, action_results)
                if child.output_var and result is not None:
                    context.set_var(child.output_var, result)
            return result  # noqa: TRY300
        except Exception as e:  # noqa: BLE001
            # Store error in context
            context.set_var("error", str(e))
            # Execute else_children as catch block
            result = None
            for child in action.else_children:
                result = self._execute_action(context, child, action_results)
                if child.output_var and result is not None:
                    context.set_var(child.output_var, result)
            return result

    def _evaluate_condition(self, context: ExecutionContext, condition: Any) -> bool:
        """Evaluate a condition."""
        if isinstance(condition, bool):
            return condition
        if isinstance(condition, str):
            # Simple string evaluation
            if condition.lower() in ("true", "yes", "1"):
                return True
            if condition.lower() in ("false", "no", "0", ""):
                return False
            # Try to evaluate as expression
            try:
                # Only allow safe variable access
                return bool(context.get_var(condition))
            except Exception:  # noqa: BLE001
                return bool(condition)
        return bool(condition)

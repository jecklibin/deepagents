"""Tests for RPA skill functionality."""

import pytest

from deepagents_web.models.rpa import (
    RPAAction,
    RPAActionParam,
    RPAActionType,
    RPAExecutionResult,
    RPAWorkflow,
)
from deepagents_web.rpa.actions.base import ActionRegistry, ExecutionContext
from deepagents_web.rpa.engine import RPAEngine


class TestRPAModels:
    """Tests for RPA data models."""

    def test_action_type_enum(self) -> None:
        """Test RPAActionType enum values."""
        assert RPAActionType.BROWSER_CLICK.value == "browser_click"
        assert RPAActionType.FILE_READ.value == "file_read"
        assert RPAActionType.VAR_SET.value == "var_set"

    def test_action_param_creation(self) -> None:
        """Test RPAActionParam creation."""
        param = RPAActionParam(key="url", value="https://example.com", type="string")
        assert param.key == "url"
        assert param.value == "https://example.com"
        assert param.type == "string"

    def test_action_creation(self) -> None:
        """Test RPAAction creation."""
        action = RPAAction(
            id="1",
            type=RPAActionType.VAR_SET,
            params=[
                RPAActionParam(key="name", value="test"),
                RPAActionParam(key="value", value="hello"),
            ],
        )
        assert action.id == "1"
        assert action.type == RPAActionType.VAR_SET
        assert len(action.params) == 2

    def test_workflow_creation(self) -> None:
        """Test RPAWorkflow creation."""
        workflow = RPAWorkflow(
            name="test-workflow",
            description="Test workflow",
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="test"),
                        RPAActionParam(key="value", value="hello"),
                    ],
                )
            ],
        )
        assert workflow.name == "test-workflow"
        assert workflow.description == "Test workflow"
        assert len(workflow.actions) == 1

    def test_execution_result_creation(self) -> None:
        """Test RPAExecutionResult creation."""
        result = RPAExecutionResult(
            success=True,
            output={"greeting": "hello"},
            duration=1.5,
        )
        assert result.success is True
        assert result.output == {"greeting": "hello"}
        assert result.duration == 1.5


class TestExecutionContext:
    """Tests for ExecutionContext."""

    def test_variable_management(self) -> None:
        """Test setting and getting variables."""
        ctx = ExecutionContext()
        ctx.set_var("foo", "bar")
        assert ctx.get_var("foo") == "bar"
        assert ctx.get_var("missing", "default") == "default"

    def test_resolve_variable_reference(self) -> None:
        """Test resolving variable references."""
        ctx = ExecutionContext()
        ctx.set_var("name", "world")
        assert ctx.resolve_value("${name}") == "world"
        assert ctx.resolve_value("literal") == "literal"
        assert ctx.resolve_value(123) == 123

    def test_resolve_nested_variable(self) -> None:
        """Test that non-variable strings are returned as-is."""
        ctx = ExecutionContext()
        ctx.set_var("greeting", "hello")
        # Only exact ${var} pattern is resolved
        assert ctx.resolve_value("${greeting}") == "hello"
        assert ctx.resolve_value("prefix ${greeting}") == "prefix ${greeting}"


class TestActionRegistry:
    """Tests for ActionRegistry."""

    def test_list_actions(self) -> None:
        """Test listing registered actions."""
        # Import action modules to register them
        from deepagents_web.rpa.actions import browser  # noqa: F401
        from deepagents_web.rpa.actions import file  # noqa: F401
        from deepagents_web.rpa.actions import system  # noqa: F401
        from deepagents_web.rpa.actions import variable  # noqa: F401

        actions = ActionRegistry.list_actions()
        assert len(actions) > 0

        # Check that var_set is registered
        action_types = [a["type"] for a in actions]
        assert "var_set" in action_types
        assert "file_read" in action_types

    def test_get_action(self) -> None:
        """Test getting a registered action."""
        from deepagents_web.rpa.actions import variable  # noqa: F401

        action_func = ActionRegistry.get("var_set")
        assert action_func is not None
        assert callable(action_func)

    def test_get_nonexistent_action(self) -> None:
        """Test getting a non-existent action."""
        action_func = ActionRegistry.get("nonexistent_action")
        assert action_func is None


class TestRPAEngine:
    """Tests for RPAEngine."""

    def test_simple_workflow(self) -> None:
        """Test executing a simple workflow."""
        workflow = RPAWorkflow(
            name="test",
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="result"),
                        RPAActionParam(key="value", value="success"),
                    ],
                    output_var="result",
                )
            ],
            output_params=["result"],
        )

        engine = RPAEngine()
        result = engine.execute(workflow)

        assert result.success is True
        assert result.output.get("result") == "success"

    def test_workflow_with_input_params(self) -> None:
        """Test workflow with input parameters."""
        workflow = RPAWorkflow(
            name="test",
            input_params=[RPAActionParam(key="input_val", value="default")],
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="output"),
                        RPAActionParam(key="value", value="${input_val}"),
                    ],
                    output_var="output",
                )
            ],
            output_params=["output"],
        )

        engine = RPAEngine()
        result = engine.execute(workflow, {"input_val": "custom"})

        assert result.success is True
        assert result.output.get("output") == "custom"

    def test_workflow_with_default_input(self) -> None:
        """Test workflow uses default input when not provided."""
        workflow = RPAWorkflow(
            name="test",
            input_params=[RPAActionParam(key="input_val", value="default_value")],
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="output"),
                        RPAActionParam(key="value", value="${input_val}"),
                    ],
                    output_var="output",
                )
            ],
            output_params=["output"],
        )

        engine = RPAEngine()
        result = engine.execute(workflow)

        assert result.success is True
        assert result.output.get("output") == "default_value"

    def test_workflow_multiple_actions(self) -> None:
        """Test workflow with multiple actions."""
        workflow = RPAWorkflow(
            name="test",
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="a"),
                        RPAActionParam(key="value", value="1"),
                    ],
                    output_var="a",
                ),
                RPAAction(
                    id="2",
                    type=RPAActionType.VAR_SET,
                    params=[
                        RPAActionParam(key="name", value="b"),
                        RPAActionParam(key="value", value="2"),
                    ],
                    output_var="b",
                ),
            ],
            output_params=["a", "b"],
        )

        engine = RPAEngine()
        result = engine.execute(workflow)

        assert result.success is True
        assert result.output.get("a") == "1"
        assert result.output.get("b") == "2"
        assert len(result.action_results) == 2

    def test_workflow_error_handling(self) -> None:
        """Test workflow error handling."""
        workflow = RPAWorkflow(
            name="test",
            actions=[
                RPAAction(
                    id="1",
                    type=RPAActionType.FILE_READ,
                    params=[
                        RPAActionParam(key="path", value="/nonexistent/file.txt"),
                    ],
                )
            ],
        )

        engine = RPAEngine()
        result = engine.execute(workflow)

        assert result.success is False
        assert result.error is not None
        assert "not found" in result.error.lower() or "no such file" in result.error.lower()


class TestFileActions:
    """Tests for file actions."""

    def test_file_exists_false(self) -> None:
        """Test file_exists returns False for non-existent file."""
        from deepagents_web.rpa.actions.file import file_exists

        ctx = ExecutionContext()
        result = file_exists(ctx, path="/nonexistent/path/file.txt")
        assert result is False

    def test_file_write_and_read(self, tmp_path) -> None:
        """Test file write and read operations."""
        from deepagents_web.rpa.actions.file import file_exists, file_read, file_write

        ctx = ExecutionContext()
        test_file = tmp_path / "test.txt"
        content = "Hello, RPA!"

        # Write file
        file_write(ctx, path=str(test_file), content=content)

        # Check exists
        assert file_exists(ctx, path=str(test_file)) is True

        # Read file
        result = file_read(ctx, path=str(test_file))
        assert result == content

    def test_file_delete(self, tmp_path) -> None:
        """Test file delete operation."""
        from deepagents_web.rpa.actions.file import file_delete, file_exists, file_write

        ctx = ExecutionContext()
        test_file = tmp_path / "to_delete.txt"

        # Create file
        file_write(ctx, path=str(test_file), content="delete me")
        assert file_exists(ctx, path=str(test_file)) is True

        # Delete file
        file_delete(ctx, path=str(test_file))
        assert file_exists(ctx, path=str(test_file)) is False


class TestSystemActions:
    """Tests for system actions."""

    def test_system_wait(self) -> None:
        """Test system wait action."""
        import time

        from deepagents_web.rpa.actions.system import system_wait

        ctx = ExecutionContext()
        start = time.time()
        system_wait(ctx, seconds=0.1)
        elapsed = time.time() - start

        assert elapsed >= 0.1

    def test_system_env_get(self) -> None:
        """Test getting environment variable."""
        import os

        from deepagents_web.rpa.actions.system import system_env_get

        ctx = ExecutionContext()

        # Test with existing env var
        os.environ["TEST_RPA_VAR"] = "test_value"
        result = system_env_get(ctx, name="TEST_RPA_VAR")
        assert result == "test_value"

        # Test with non-existent env var
        result = system_env_get(ctx, name="NONEXISTENT_VAR", default="default")
        assert result == "default"

        # Cleanup
        del os.environ["TEST_RPA_VAR"]


class TestVariableActions:
    """Tests for variable actions."""

    def test_var_set_and_get(self) -> None:
        """Test variable set and get."""
        from deepagents_web.rpa.actions.variable import var_get, var_set

        ctx = ExecutionContext()

        # Set variable
        var_set(ctx, name="test_var", value="test_value")

        # Get variable
        result = var_get(ctx, name="test_var")
        assert result == "test_value"

    def test_var_get_default(self) -> None:
        """Test variable get with default."""
        from deepagents_web.rpa.actions.variable import var_get

        ctx = ExecutionContext()
        result = var_get(ctx, name="nonexistent", default="default_value")
        assert result == "default_value"

    def test_var_set_with_reference(self) -> None:
        """Test variable set with reference to another variable."""
        from deepagents_web.rpa.actions.variable import var_get, var_set

        ctx = ExecutionContext()

        # Set first variable
        var_set(ctx, name="source", value="original")

        # Set second variable referencing first
        var_set(ctx, name="target", value="${source}")

        # Get target - should have resolved value
        result = var_get(ctx, name="target")
        assert result == "original"

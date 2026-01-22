"""System atomic operations for RPA."""

from __future__ import annotations

import os
import subprocess
import time
from typing import Any

from deepagents_web.rpa.actions.base import ExecutionContext, action


@action(
    "system_run",
    name="Run Command",
    description="Execute a system command",
    category="system",
    params=[
        {"key": "command", "type": "string", "required": True},
        {"key": "shell", "type": "bool", "default": True},
        {"key": "timeout", "type": "int", "default": 60},
        {"key": "cwd", "type": "string", "default": ""},
    ],
    output_type="dict",
)
def system_run(
    context: ExecutionContext,  # noqa: ARG001
    *,
    command: str,
    shell: bool = True,
    timeout: int = 60,
    cwd: str = "",
    **kwargs: Any,  # noqa: ARG001
) -> dict[str, Any]:
    """Execute a system command."""
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(  # noqa: S603
        command,
        shell=shell,
        capture_output=True,
        timeout=timeout,
        cwd=cwd or None,
        env=env,
        check=False,
    )

    stdout = result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
    stderr = result.stderr.decode("utf-8", errors="replace") if result.stderr else ""

    return {
        "returncode": result.returncode,
        "stdout": stdout,
        "stderr": stderr,
    }


@action(
    "system_wait",
    name="Wait",
    description="Wait for a specified duration",
    category="system",
    params=[
        {"key": "seconds", "type": "float", "required": True},
    ],
)
def system_wait(
    context: ExecutionContext,  # noqa: ARG001
    *,
    seconds: float,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Wait for a specified duration."""
    time.sleep(seconds)


@action(
    "system_env_get",
    name="Get Environment Variable",
    description="Get an environment variable value",
    category="system",
    params=[
        {"key": "name", "type": "string", "required": True},
        {"key": "default", "type": "string", "default": ""},
    ],
    output_type="string",
)
def system_env_get(
    context: ExecutionContext,  # noqa: ARG001
    *,
    name: str,
    default: str = "",
    **kwargs: Any,  # noqa: ARG001
) -> str:
    """Get an environment variable."""
    return os.environ.get(name, default)


@action(
    "system_env_set",
    name="Set Environment Variable",
    description="Set an environment variable value",
    category="system",
    params=[
        {"key": "name", "type": "string", "required": True},
        {"key": "value", "type": "string", "required": True},
    ],
)
def system_env_set(
    context: ExecutionContext,  # noqa: ARG001
    *,
    name: str,
    value: str,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Set an environment variable."""
    os.environ[name] = value

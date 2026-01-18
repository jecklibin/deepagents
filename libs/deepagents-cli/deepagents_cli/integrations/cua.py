"""CUA integration for computer-use subagents."""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from deepagents.middleware.subagents import CompiledSubAgent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableLambda

DEFAULT_CUA_MODEL = "anthropic/claude-sonnet-4-5-20250929"
DEFAULT_OS_TYPE = "linux"
DEFAULT_PROVIDER_TYPE = "cloud"
DEFAULT_IMAGE_RETENTION = 3
DEFAULT_SCREENSHOT_DELAY = 0.5
DEFAULT_USE_HOST_COMPUTER_SERVER = False


@dataclass
class CuaConfig:
    """Configuration for the CUA computer-use subagent."""

    model: str
    os_type: str
    provider_type: str
    container_name: str | None
    api_key: str | None
    api_base: str | None
    only_n_most_recent_images: int | None
    trajectory_dir: Path | None
    use_prompt_caching: bool | True
    screenshot_delay: float
    max_trajectory_budget: float | dict[str, Any] | None
    use_host_computer_server: bool
    api_port: int | None


def load_cua_config(
    *,
    model: str | None = None,
    os_type: str | None = None,
    provider_type: str | None = None,
    trajectory_dir: str | Path | None = None,
) -> CuaConfig:
    """Load CUA configuration from environment variables and overrides."""
    _load_dotenv()

    resolved_model = model or os.getenv("CUA_MODEL") or DEFAULT_CUA_MODEL
    resolved_os = os_type or os.getenv("CUA_OS_TYPE") or DEFAULT_OS_TYPE
    resolved_provider = provider_type or os.getenv("CUA_PROVIDER_TYPE") or DEFAULT_PROVIDER_TYPE

    container_name = os.getenv("CUA_CONTAINER_NAME")
    api_key = os.getenv("CUA_API_KEY")

    only_n_most_recent_images = _env_int("CUA_ONLY_N_MOST_RECENT_IMAGES", DEFAULT_IMAGE_RETENTION)
    if only_n_most_recent_images is not None and only_n_most_recent_images <= 0:
        only_n_most_recent_images = None

    resolved_trajectory_dir = trajectory_dir or os.getenv("CUA_TRAJECTORY_DIR")
    trajectory_path = Path(resolved_trajectory_dir) if resolved_trajectory_dir else None

    use_prompt_caching = _env_bool("CUA_USE_PROMPT_CACHING", True)
    screenshot_delay = _env_float("CUA_SCREENSHOT_DELAY", DEFAULT_SCREENSHOT_DELAY)
    max_trajectory_budget = _env_budget("CUA_MAX_TRAJECTORY_BUDGET")
    use_host_computer_server = _env_bool(
        "CUA_USE_HOST_COMPUTER_SERVER",
        DEFAULT_USE_HOST_COMPUTER_SERVER,
    )
    api_port = _env_int("CUA_API_PORT", None)

    return CuaConfig(
        model=resolved_model,
        os_type=resolved_os,
        provider_type=resolved_provider,
        container_name=container_name,
        api_key=api_key,
        api_base=os.getenv("CUA_API_BASE"),
        only_n_most_recent_images=only_n_most_recent_images,
        trajectory_dir=trajectory_path,
        use_prompt_caching=use_prompt_caching,
        screenshot_delay=screenshot_delay,
        max_trajectory_budget=max_trajectory_budget,
        use_host_computer_server=use_host_computer_server,
        api_port=api_port,
    )


def build_cua_subagent(cua_config: CuaConfig) -> CompiledSubAgent:
    """Build a compiled subagent that runs CUA ComputerAgent."""
    error_message = _validate_cua_config(cua_config)

    async def _run_cua_async(state: dict) -> dict:
        if error_message:
            return {"messages": [AIMessage(content=error_message)]}

        load_result = _load_cua_modules()
        if load_result.error:
            return {"messages": [AIMessage(content=load_result.error)]}

        instruction = _extract_instruction(state.get("messages", []))
        if not instruction:
            return {
                "messages": [
                    AIMessage(content="No instruction provided for computer-use task."),
                ]
            }

        try:
            computer_api_key = cua_config.api_key
            if cua_config.use_host_computer_server:
                # Host computer server is unauthenticated by default; avoid wss/SSL and env fallback.
                computer_api_key = ""

            computer_kwargs: dict[str, Any] = {
                "use_host_computer_server": cua_config.use_host_computer_server,
            }
            if cua_config.api_port is not None:
                computer_kwargs["api_port"] = cua_config.api_port

            computer = load_result.Computer(**computer_kwargs)
            _ensure_host_computer_config(computer)
            async with computer:
                agent = load_result.ComputerAgent(
                    model=cua_config.model,
                    api_key=cua_config.api_key,
                    api_base=cua_config.api_base,
                    custom_llm_provider="openai",
                    tools=[computer],
                    only_n_most_recent_images=cua_config.only_n_most_recent_images,
                    trajectory_dir=str(cua_config.trajectory_dir)
                    if cua_config.trajectory_dir
                    else None,
                    screenshot_delay=cua_config.screenshot_delay,
                    use_prompt_caching=cua_config.use_prompt_caching,
                    max_trajectory_budget=cua_config.max_trajectory_budget,
                )

                output_items: list[dict[str, Any]] = []
                async for result in agent.run(
                    [{"role": "user", "content": instruction}], stream=False
                ):
                    output_items.extend(result.get("output", []))

            final_text = extract_last_message_text(output_items)
            return {"messages": [AIMessage(content=final_text)]}
        except Exception as exc:  # noqa: BLE001
            return {
                "messages": [
                    AIMessage(content=f"Computer-use subagent failed: {exc}"),
                ]
            }

    def _run_cua_sync(state: dict) -> dict:
        return _run_sync(_run_cua_async, state)

    runnable = RunnableLambda(func=_run_cua_sync, afunc=_run_cua_async)
    return {
        "name": "computer-use",
        "description": "Use this agent to execute computer-use tasks via CUA.",
        "runnable": runnable,
    }


def extract_last_message_text(output_items: list[dict[str, Any]]) -> str:
    """Extract the last assistant text message from CUA output items."""
    for item in reversed(output_items):
        if item.get("type") != "message":
            continue
        content = item.get("content", [])
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            texts = [part.get("text", "") for part in content if part.get("text")]
            if texts:
                return "\n".join(texts).strip()
    return "Computer task finished, but no assistant message was returned."


def _extract_instruction(messages: list[Any]) -> str:
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            return str(message.content).strip()
        if hasattr(message, "type") and message.type == "human":
            return str(getattr(message, "content", "")).strip()
        if isinstance(message, dict) and message.get("role") == "user":
            return str(message.get("content", "")).strip()
    return ""


def _validate_cua_config(cua_config: CuaConfig) -> str | None:
    if sys.version_info < (3, 12):
        return (
            "CUA requires Python 3.12 or 3.13. "
            "Please run deepagents-cli with a compatible interpreter."
        )

    if cua_config.use_host_computer_server:
        return None

    if cua_config.provider_type == "cloud":
        missing = []
        if not cua_config.api_key:
            missing.append("CUA_API_KEY")
        if not cua_config.container_name:
            missing.append("CUA_CONTAINER_NAME")
        if missing:
            missing_str = ", ".join(missing)
            return (
                f"Missing required CUA environment variables for cloud provider: {missing_str}. "
                "Set them in your environment or .env file."
            )
    return None


def _load_dotenv() -> None:
    try:
        import dotenv

        dotenv.load_dotenv()
    except Exception:  # pragma: no cover - optional dependency or runtime issues
        return


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int | None) -> int | None:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _env_budget(name: str) -> float | dict[str, Any] | None:
    value = os.getenv(name)
    if not value:
        return None
    try:
        if value.strip().startswith(("{", "[")):
            return json.loads(value)
        return float(value)
    except (ValueError, json.JSONDecodeError):
        return None


def _missing_dependency_message(error: Exception | None = None) -> str:
    detail = f" (import error: {error})" if error else ""
    return (
        "CUA integration requires the optional cua-agent and cua-computer packages"
        f"{detail}. Install with `uv sync --group cua` or "
        "`pip install cua-agent cua-computer`."
    )


class _CuaModules:
    def __init__(self, ComputerAgent: Any, Computer: Any, error: str | None) -> None:
        self.ComputerAgent = ComputerAgent
        self.Computer = Computer
        self.error = error


def _load_cua_modules() -> _CuaModules:
    try:
        import importlib

        agent_module = importlib.import_module("agent")
        computer_module = importlib.import_module("computer")
        ComputerAgent = getattr(agent_module, "ComputerAgent", None)
        Computer = getattr(computer_module, "Computer", None)
        if ComputerAgent is None or Computer is None:
            return _CuaModules(None, None, _missing_dependency_message())
        return _CuaModules(ComputerAgent, Computer, None)
    except Exception as exc:  # noqa: BLE001
        return _CuaModules(None, None, _missing_dependency_message(exc))


def _run_sync(afunc: Callable[[dict], Coroutine[Any, Any, dict]], state: dict) -> dict:
    import asyncio

    return asyncio.run(afunc(state))


def _ensure_host_computer_config(computer: Any) -> None:
    if not getattr(computer, "use_host_computer_server", False):
        return
    if hasattr(computer, "config"):
        return
    computer.config = SimpleNamespace(
        name="host-computer",
        vm_provider=None,
        memory=None,
        cpu=None,
        display=None,
    )

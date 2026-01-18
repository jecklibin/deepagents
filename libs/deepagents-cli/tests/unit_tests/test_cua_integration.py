"""Tests for the CUA integration glue."""

from __future__ import annotations

import importlib
import sys
from typing import Any

from langchain_core.messages import HumanMessage

from deepagents_cli.integrations import cua as cua_integration
from deepagents_cli.main import parse_args


def test_load_cua_config_defaults(monkeypatch) -> None:
    """Defaults come from constants when env vars are missing."""
    for name in (
        "CUA_MODEL",
        "CUA_OS_TYPE",
        "CUA_PROVIDER_TYPE",
        "CUA_CONTAINER_NAME",
        "CUA_API_KEY",
        "CUA_ONLY_N_MOST_RECENT_IMAGES",
        "CUA_TRAJECTORY_DIR",
        "CUA_USE_PROMPT_CACHING",
        "CUA_SCREENSHOT_DELAY",
        "CUA_MAX_TRAJECTORY_BUDGET",
        "CUA_USE_HOST_COMPUTER_SERVER",
        "CUA_API_PORT",
    ):
        monkeypatch.delenv(name, raising=False)

    config = cua_integration.load_cua_config()

    assert config.model == cua_integration.DEFAULT_CUA_MODEL
    assert config.os_type == cua_integration.DEFAULT_OS_TYPE
    assert config.provider_type == cua_integration.DEFAULT_PROVIDER_TYPE
    assert config.only_n_most_recent_images == cua_integration.DEFAULT_IMAGE_RETENTION


def test_build_cua_subagent_returns_error(monkeypatch) -> None:
    """Returns actionable error when deps/env/python version are missing."""
    monkeypatch.delenv("CUA_API_KEY", raising=False)
    monkeypatch.delenv("CUA_CONTAINER_NAME", raising=False)
    config = cua_integration.load_cua_config(provider_type="cloud")

    subagent = cua_integration.build_cua_subagent(config)
    result = subagent["runnable"].invoke({"messages": [HumanMessage(content="Do a task.")]})
    message = result["messages"][0].content

    if sys.version_info < (3, 12):
        assert "Python 3.12" in message
    else:
        assert "Missing required CUA environment variables" in message


def test_build_cua_subagent_missing_deps(monkeypatch) -> None:
    """Missing CUA modules returns a clear install hint."""
    monkeypatch.setattr(cua_integration.sys, "version_info", (3, 12))
    monkeypatch.setenv("CUA_API_KEY", "test-key")
    monkeypatch.setenv("CUA_CONTAINER_NAME", "test-container")

    original_import = importlib.import_module

    def fake_import(name: str, *args: Any, **kwargs: Any) -> Any:
        if name in {"agent", "computer"}:
            raise ImportError("missing cua modules")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(importlib, "import_module", fake_import)

    config = cua_integration.load_cua_config(provider_type="cloud")
    subagent = cua_integration.build_cua_subagent(config)
    result = subagent["runnable"].invoke({"messages": [HumanMessage(content="Do a task.")]})
    message = result["messages"][0].content

    assert "cua-agent" in message
    assert "cua-computer" in message


def test_extract_last_message_text() -> None:
    """Extracts the final assistant message text."""
    output_items = [
        {"type": "message", "content": [{"text": "First message"}]},
        {"type": "message", "content": [{"text": "Final answer"}]},
    ]

    result = cua_integration.extract_last_message_text(output_items)
    assert result == "Final answer"


def test_parse_args_cua_flags(monkeypatch) -> None:
    """CUA CLI flags are parsed correctly."""
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "deepagents",
            "--cua",
            "--cua-model",
            "anthropic/claude-sonnet-4-5-20250929",
            "--cua-provider",
            "cloud",
            "--cua-os",
            "linux",
            "--cua-trajectory-dir",
            "trajectories",
        ],
    )

    args = parse_args()
    assert args.cua is True
    assert args.cua_model == "anthropic/claude-sonnet-4-5-20250929"
    assert args.cua_provider == "cloud"
    assert args.cua_os == "linux"
    assert args.cua_trajectory_dir == "trajectories"

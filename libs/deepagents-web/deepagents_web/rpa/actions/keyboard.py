"""Keyboard and mouse atomic operations for RPA."""

from __future__ import annotations

from typing import Any

from deepagents_web.rpa.actions.base import ExecutionContext, action


@action(
    "keyboard_type",
    name="Type Text",
    description="Type text using keyboard",
    category="keyboard",
    params=[
        {"key": "text", "type": "string", "required": True},
        {"key": "delay", "type": "int", "default": 0},
    ],
)
def keyboard_type(
    context: ExecutionContext,
    *,
    text: str,
    delay: int = 0,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Type text using keyboard."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.keyboard.type(text, delay=delay)


@action(
    "keyboard_press",
    name="Press Key",
    description="Press a keyboard key",
    category="keyboard",
    params=[
        {"key": "key", "type": "string", "required": True},
    ],
)
def keyboard_press(
    context: ExecutionContext,
    *,
    key: str,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Press a keyboard key."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.keyboard.press(key)


@action(
    "mouse_click",
    name="Mouse Click",
    description="Click at specific coordinates",
    category="mouse",
    params=[
        {"key": "x", "type": "int", "required": True},
        {"key": "y", "type": "int", "required": True},
        {"key": "button", "type": "string", "default": "left"},
        {"key": "click_count", "type": "int", "default": 1},
    ],
)
def mouse_click(
    context: ExecutionContext,
    *,
    x: int,
    y: int,
    button: str = "left",
    click_count: int = 1,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Click at specific coordinates."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.mouse.click(x, y, button=button, click_count=click_count)  # type: ignore[arg-type]


@action(
    "mouse_move",
    name="Mouse Move",
    description="Move mouse to specific coordinates",
    category="mouse",
    params=[
        {"key": "x", "type": "int", "required": True},
        {"key": "y", "type": "int", "required": True},
    ],
)
def mouse_move(
    context: ExecutionContext,
    *,
    x: int,
    y: int,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Move mouse to specific coordinates."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.mouse.move(x, y)

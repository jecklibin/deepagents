"""RPA action modules."""

from deepagents_web.rpa.actions import browser, file, keyboard, system, variable
from deepagents_web.rpa.actions.base import ActionRegistry, ExecutionContext, action

__all__ = [
    "ActionRegistry",
    "ExecutionContext",
    "action",
    "browser",
    "file",
    "keyboard",
    "system",
    "variable",
]

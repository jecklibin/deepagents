"""Widget for displaying agent plans and todo progress."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from textual.containers import Vertical
from textual.widgets import Static

if TYPE_CHECKING:
    from textual.app import ComposeResult


class PlanEntryWidget(Static):
    """Widget for a single plan entry (todo item)."""

    def __init__(self, content: str, status: str) -> None:
        """Initialize with content and status."""
        super().__init__()
        self.content = content
        self.status = status

    def render(self) -> str:
        """Render the todo item with status icon."""
        icon = "○"  # pending
        if self.status == "in_progress":
            icon = "▶"
        elif self.status == "completed":
            icon = "✓"
        elif self.status == "failed":
            icon = "✗"

        # status_class maps to colors in CSS
        status_class = f"todo-{self.status}"
        return f"[{status_class}]{icon} {self.content}[/{status_class}]"


class PlanWidget(Vertical):
    """Widget for displaying the current plan and progress.

    Inspired by ScienceClaw's plan progress bar, this widget shows
    the high-level steps the agent has planned.
    """

    DEFAULT_CSS = """
    PlanWidget {
        background: $boost;
        border: tall $primary;
        padding: 1;
        margin: 1 0;
        height: auto;
        min-height: 3;
        display: none; /* Hidden by default until todos exist */
    }

    PlanWidget.-visible {
        display: block;
    }

    PlanWidget .plan-header {
        text-style: bold;
        color: $primary;
        margin-bottom: 1;
        border-bottom: thin $primary;
    }

    PlanWidget .todo-pending {
        color: $text-muted;
    }

    PlanWidget .todo-in_progress {
        color: #fbbf24; /* Amber */
        text-style: bold;
    }

    PlanWidget .todo-completed {
        color: #10b981; /* Emerald */
    }

    PlanWidget .todo-failed {
        color: #ef4444; /* Red */
    }
    """

    def __init__(self, todos: list[dict[str, Any]] | None = None, **kwargs: Any) -> None:
        """Initialize with optional initial todos."""
        super().__init__(**kwargs)
        self._todos = todos or []

    def compose(self) -> ComposeResult:
        """Compose the plan widget."""
        yield Static("📋 Task Plan", classes="plan-header")
        for todo in self._todos:
            yield PlanEntryWidget(todo.get("content", ""), todo.get("status", "pending"))

    async def update_todos(self, todos: list[dict[str, Any]]) -> None:
        """Update the displayed todos."""
        if not todos:
            self.remove_class("-visible")
            return

        self._todos = todos
        self.add_class("-visible")

        # Re-compose children
        await self.remove_children()
        await self.mount(Static("📋 Task Plan", classes="plan-header"))
        for todo in self._todos:
            await self.mount(PlanEntryWidget(todo.get("content", ""), todo.get("status", "pending")))

"""Base classes and utilities for RPA actions."""

from __future__ import annotations

import contextlib
import time
from abc import ABC, abstractmethod
from functools import wraps
from typing import TYPE_CHECKING, Any, ClassVar

if TYPE_CHECKING:
    from collections.abc import Callable

    from playwright.sync_api import Browser, Page


class ActionRegistry:
    """Registry for atomic operations."""

    _actions: ClassVar[dict[str, Callable[..., Any]]] = {}
    _metadata: ClassVar[dict[str, dict[str, Any]]] = {}

    @classmethod
    def register(
        cls,
        action_type: str,
        *,
        name: str = "",
        description: str = "",
        category: str = "",
        params: list[dict[str, Any]] | None = None,
        output_type: str | None = None,
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        """Register an action function."""

        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            cls._actions[action_type] = func
            cls._metadata[action_type] = {
                "type": action_type,
                "name": name or func.__name__,
                "description": description or func.__doc__ or "",
                "category": category,
                "params": params or [],
                "output_type": output_type,
            }
            return func

        return decorator

    @classmethod
    def get(cls, action_type: str) -> Callable[..., Any] | None:
        """Get an action function by type."""
        return cls._actions.get(action_type)

    @classmethod
    def list_actions(cls) -> list[dict[str, Any]]:
        """List all registered actions with metadata."""
        return list(cls._metadata.values())

    @classmethod
    def get_metadata(cls, action_type: str) -> dict[str, Any] | None:
        """Get metadata for an action type."""
        return cls._metadata.get(action_type)


def action(
    action_type: str,
    *,
    name: str = "",
    description: str = "",
    category: str = "",
    params: list[dict[str, Any]] | None = None,
    output_type: str | None = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator for registering atomic operations.

    Simplified version of AstronRPA's @atomic decorator.
    Handles delay, retry, and error skipping.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(context: ExecutionContext, **kwargs: Any) -> Any:
            # Extract advanced parameters
            delay_before = kwargs.pop("delay_before", 0)
            delay_after = kwargs.pop("delay_after", 0)
            retry_count = kwargs.pop("retry_count", 0)
            retry_interval = kwargs.pop("retry_interval", 1.0)
            skip_on_error = kwargs.pop("skip_on_error", False)

            # Pre-execution delay
            if delay_before > 0:
                time.sleep(delay_before)

            # Retry logic
            last_error: Exception | None = None
            for attempt in range(retry_count + 1):
                try:
                    result = func(context, **kwargs)
                    # Post-execution delay
                    if delay_after > 0:
                        time.sleep(delay_after)
                    return result  # noqa: TRY300
                except Exception as e:  # noqa: BLE001
                    last_error = e
                    if attempt < retry_count:
                        time.sleep(retry_interval)
                    elif skip_on_error:
                        return None

            if last_error:
                raise last_error
            return None

        # Register the action
        ActionRegistry.register(
            action_type,
            name=name,
            description=description,
            category=category,
            params=params,
            output_type=output_type,
        )(wrapper)

        return wrapper

    return decorator


class ExecutionContext:
    """Execution context for managing variables and resources."""

    def __init__(self) -> None:
        """Initialize the execution context."""
        self.variables: dict[str, Any] = {}
        self._browser: Browser | None = None
        self._page: Page | None = None
        self._playwright: Any = None
        self._playwright_mode: str | None = None

    @property
    def browser(self) -> Browser | None:
        """Get the browser instance."""
        return self._browser

    @browser.setter
    def browser(self, value: Browser | None) -> None:
        """Set the browser instance."""
        self._browser = value

    @property
    def page(self) -> Page | None:
        """Get the current page."""
        return self._page

    @page.setter
    def page(self, value: Page | None) -> None:
        """Set the current page."""
        self._page = value

    @property
    def playwright(self) -> Any:
        """Get the playwright instance."""
        return self._playwright

    @playwright.setter
    def playwright(self, value: Any) -> None:
        """Set the playwright instance."""
        self._playwright = value

    @property
    def playwright_mode(self) -> str | None:
        """Get the Playwright connection mode."""
        return self._playwright_mode

    @playwright_mode.setter
    def playwright_mode(self, value: str | None) -> None:
        """Set the Playwright connection mode."""
        self._playwright_mode = value

    def set_var(self, name: str, value: Any) -> None:
        """Set a variable."""
        self.variables[name] = value

    def get_var(self, name: str, default: Any = None) -> Any:
        """Get a variable."""
        return self.variables.get(name, default)

    def resolve_value(self, value: Any) -> Any:
        """Resolve variable references like ${var_name}."""
        if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
            var_name = value[2:-1]
            return self.get_var(var_name)
        return value

    def cleanup(self) -> None:
        """Clean up resources."""
        if self._page:
            with contextlib.suppress(Exception):
                self._page.close()
            self._page = None

        if self._browser or self._playwright:
            from deepagents_web.services.playwright_provider import PlaywrightSession

            session = PlaywrightSession(
                playwright=self._playwright,
                browser=self._browser,
                mode=self._playwright_mode or "local",
            )
            session.close()

        self._browser = None
        self._playwright = None
        self._playwright_mode = None


class ActionBase(ABC):
    """Abstract base class for action implementations."""

    @abstractmethod
    def execute(self, context: ExecutionContext, **kwargs: Any) -> Any:
        """Execute the action."""
        ...

"""Tests for preview replay behavior in RecordingService."""

from __future__ import annotations

import pytest

from deepagents_web.services.recording_service import RecordingService


class _FakeLocator:
    def __init__(self, page: "_FakePage", name: str, *, fail_click: bool = False) -> None:
        self._page = page
        self._name = name
        self._fail_click = fail_click

    @property
    def first(self) -> "_FakeLocator":
        return self

    def wait_for(self, *, state: str, timeout: int) -> None:  # noqa: ARG002
        self._page.calls.append(f"wait_for:{self._name}")

    def click(self, *, timeout: int) -> None:  # noqa: ARG002
        self._page.calls.append(f"click:{self._name}")
        if self._fail_click:
            raise RuntimeError("click failed")


class _FakeMouse:
    def __init__(self, page: "_FakePage") -> None:
        self._page = page

    def click(self, x: int, y: int) -> None:
        self._page.calls.append(f"mouse_click:{x},{y}")


class _FakePage:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.mouse = _FakeMouse(self)

    def locator(self, selector: str) -> _FakeLocator:
        # Simulate brittle CSS failing, while other strategies succeed.
        return _FakeLocator(self, f"css:{selector}", fail_click=True)

    def get_by_role(self, role: str, *, name: str) -> _FakeLocator:
        return _FakeLocator(self, f"role:{role}:{name}", fail_click=False)

    def get_by_text(self, text: str, *, exact: bool) -> _FakeLocator:  # noqa: ARG002
        return _FakeLocator(self, f"text:{text}", fail_click=False)

    def wait_for_load_state(self, state: str, timeout: int | None = None) -> None:  # noqa: ARG002
        self.calls.append(f"load_state:{state}")


def test_preview_click_falls_back_to_accessibility_locator() -> None:
    service = RecordingService()
    page = _FakePage()

    action = {
        "type": "click",
        "selector": "a.select-menu-item.Link:nth-of-type(2)",
        "value": "This week",
        "accessibility": {"role": "link", "name": "This week"},
    }

    service._action_click(page, action, {})

    # Preview prefers accessibility role/name over brittle CSS.
    assert "click:role:link:This week" in page.calls
    assert page.calls[-1] == "load_state:domcontentloaded"

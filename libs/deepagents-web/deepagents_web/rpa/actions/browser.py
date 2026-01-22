"""Browser atomic operations for RPA."""

from __future__ import annotations

from typing import Any

from playwright.sync_api import sync_playwright

from deepagents_web.rpa.actions.base import ExecutionContext, action


@action(
    "browser_open",
    name="Open Browser",
    description="Open a new browser instance",
    category="browser",
    params=[
        {"key": "browser_type", "type": "string", "default": "chromium"},
        {"key": "headless", "type": "bool", "default": False},
    ],
    output_type="browser",
)
def browser_open(
    context: ExecutionContext,
    *,
    browser_type: str = "chromium",
    headless: bool = False,
    **kwargs: Any,  # noqa: ARG001
) -> bool:
    """Open a new browser instance."""
    if context.browser:
        return True

    pw = sync_playwright().start()
    context.playwright = pw

    if browser_type == "firefox":
        browser = pw.firefox.launch(headless=headless)
    elif browser_type == "webkit":
        browser = pw.webkit.launch(headless=headless)
    else:
        browser = pw.chromium.launch(headless=headless)

    context.browser = browser
    context.page = browser.new_page()
    return True


@action(
    "browser_navigate",
    name="Navigate to URL",
    description="Navigate to a specified URL",
    category="browser",
    params=[
        {"key": "url", "type": "string", "required": True},
        {"key": "wait_until", "type": "string", "default": "load"},
    ],
    output_type="string",
)
def browser_navigate(
    context: ExecutionContext,
    *,
    url: str,
    wait_until: str = "load",
    **kwargs: Any,  # noqa: ARG001
) -> str:
    """Navigate to a URL."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.goto(url, wait_until=wait_until)  # type: ignore[arg-type]
    return context.page.url


@action(
    "browser_click",
    name="Click Element",
    description="Click on an element",
    category="browser",
    params=[
        {"key": "selector", "type": "string", "required": True},
        {"key": "timeout", "type": "int", "default": 30000},
    ],
)
def browser_click(
    context: ExecutionContext,
    *,
    selector: str,
    timeout: int = 30000,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Click on an element."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.click(selector, timeout=timeout)


@action(
    "browser_fill",
    name="Fill Input",
    description="Fill an input field with text",
    category="browser",
    params=[
        {"key": "selector", "type": "string", "required": True},
        {"key": "value", "type": "string", "required": True},
        {"key": "timeout", "type": "int", "default": 30000},
    ],
)
def browser_fill(
    context: ExecutionContext,
    *,
    selector: str,
    value: str,
    timeout: int = 30000,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Fill an input field."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.fill(selector, value, timeout=timeout)


@action(
    "browser_extract",
    name="Extract Data",
    description="Extract text or attribute from an element",
    category="browser",
    params=[
        {"key": "selector", "type": "string", "required": True},
        {"key": "extract_type", "type": "string", "default": "text"},
        {"key": "attribute", "type": "string", "default": ""},
        {"key": "timeout", "type": "int", "default": 30000},
    ],
    output_type="string",
)
def browser_extract(
    context: ExecutionContext,
    *,
    selector: str,
    extract_type: str = "text",
    attribute: str = "",
    timeout: int = 30000,
    **kwargs: Any,  # noqa: ARG001
) -> str | None:
    """Extract data from an element."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    element = context.page.locator(selector).first
    element.wait_for(timeout=timeout)

    if extract_type == "text":
        return element.text_content()
    if extract_type == "inner_text":
        return element.inner_text()
    if extract_type == "inner_html":
        return element.inner_html()
    if extract_type == "attribute" and attribute:
        return element.get_attribute(attribute)
    if extract_type == "value":
        return element.input_value()
    return element.text_content()


@action(
    "browser_close",
    name="Close Browser",
    description="Close the browser instance",
    category="browser",
)
def browser_close(
    context: ExecutionContext,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Close the browser."""
    context.cleanup()


@action(
    "browser_wait",
    name="Wait for Element",
    description="Wait for an element to be visible",
    category="browser",
    params=[
        {"key": "selector", "type": "string", "required": True},
        {"key": "state", "type": "string", "default": "visible"},
        {"key": "timeout", "type": "int", "default": 30000},
    ],
)
def browser_wait(
    context: ExecutionContext,
    *,
    selector: str,
    state: str = "visible",
    timeout: int = 30000,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Wait for an element."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    context.page.locator(selector).first.wait_for(state=state, timeout=timeout)  # type: ignore[arg-type]


@action(
    "browser_screenshot",
    name="Take Screenshot",
    description="Take a screenshot of the page",
    category="browser",
    params=[
        {"key": "path", "type": "string", "default": ""},
        {"key": "full_page", "type": "bool", "default": False},
    ],
    output_type="bytes",
)
def browser_screenshot(
    context: ExecutionContext,
    *,
    path: str = "",
    full_page: bool = False,
    **kwargs: Any,  # noqa: ARG001
) -> bytes:
    """Take a screenshot."""
    if not context.page:
        msg = "Browser not opened. Call browser_open first."
        raise RuntimeError(msg)

    if path:
        return context.page.screenshot(path=path, full_page=full_page)
    return context.page.screenshot(full_page=full_page)

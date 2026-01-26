"""Playwright browser factory with optional remote connection support."""

from __future__ import annotations

import contextlib
import logging
from dataclasses import dataclass
from typing import Any

from deepagents_web.config import web_settings

logger = logging.getLogger(__name__)


@dataclass
class PlaywrightSession:
    """Holds a Playwright instance and browser connection."""

    playwright: Any
    browser: Any
    mode: str

    def close(self) -> None:
        """Close or disconnect the browser and stop Playwright."""
        if self.browser:
            if self.mode == "remote-cdp":
                if hasattr(self.browser, "disconnect"):
                    with contextlib.suppress(Exception):
                        self.browser.disconnect()
            else:
                with contextlib.suppress(Exception):
                    self.browser.close()
        if self.playwright:
            with contextlib.suppress(Exception):
                self.playwright.stop()


def open_playwright_browser(
    browser_type: str = "chromium",
    *,
    headless: bool = False,
) -> PlaywrightSession:
    """Start Playwright and return a browser session (local or remote)."""
    from playwright.sync_api import sync_playwright

    normalized = (browser_type or "chromium").lower()
    pw = sync_playwright().start()

    if web_settings.playwright_ws_url:
        browser = _connect_ws(pw, normalized, web_settings.playwright_ws_url)
        return PlaywrightSession(playwright=pw, browser=browser, mode="remote-ws")

    if web_settings.playwright_cdp_url:
        if normalized != "chromium":
            logger.warning("CDP only supports chromium; using chromium instead of %s", normalized)
        browser = pw.chromium.connect_over_cdp(web_settings.playwright_cdp_url)
        return PlaywrightSession(playwright=pw, browser=browser, mode="remote-cdp")

    browser = _launch_local(pw, normalized, headless=headless)
    return PlaywrightSession(playwright=pw, browser=browser, mode="local")


def _connect_ws(playwright: Any, browser_type: str, ws_url: str) -> Any:
    if browser_type == "firefox":
        return playwright.firefox.connect(ws_url)
    if browser_type == "webkit":
        return playwright.webkit.connect(ws_url)
    return playwright.chromium.connect(ws_url)


def _launch_local(playwright: Any, browser_type: str, *, headless: bool) -> Any:
    if browser_type == "firefox":
        return playwright.firefox.launch(headless=headless)
    if browser_type == "webkit":
        return playwright.webkit.launch(headless=headless)
    return playwright.chromium.launch(headless=headless)

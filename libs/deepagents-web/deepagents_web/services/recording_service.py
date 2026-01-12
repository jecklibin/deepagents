"""Browser recording service using Playwright."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import queue
import threading
import time
import uuid
from typing import TYPE_CHECKING, Any

from deepagents_web.models.recording import ActionType, RecordedAction, RecordingSession

if TYPE_CHECKING:
    from collections.abc import Callable

    from playwright.sync_api import Browser, BrowserContext, Page, Playwright

logger = logging.getLogger(__name__)

# JavaScript to inject for capturing user interactions
# fmt: off
RECORDER_SCRIPT = """
window.__recordedActions = window.__recordedActions || [];
window.__recordingStartTime = window.__recordingStartTime || Date.now();

function getSelector(element) {
    if (element.id) return '#' + element.id;
    if (element.name) return element.tagName.toLowerCase() + '[name="' + element.name + '"]';
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\\s+/).filter(c => c).slice(0, 2).join('.');
        if (classes) return element.tagName.toLowerCase() + '.' + classes;
    }
    const parent = element.parentElement;
    if (parent) {
        const siblings = Array.from(parent.children).filter(e => e.tagName === element.tagName);
        if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            const tag = element.tagName.toLowerCase();
            return getSelector(parent) + ' > ' + tag + ':nth-child(' + index + ')';
        }
    }
    return element.tagName.toLowerCase();
}

function recordAction(type, element, value, event) {
    const action = {
        type: type,
        selector: getSelector(element),
        value: value || null,
        timestamp: (Date.now() - window.__recordingStartTime) / 1000,
        tagName: element.tagName.toLowerCase(),
        x: event ? Math.round(event.pageX) : null,
        y: event ? Math.round(event.pageY) : null
    };
    window.__recordedActions.push(action);
    console.log('[Recording]', action);
}

document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName) {
        recordAction('click', target, target.innerText?.substring(0, 50), e);
    }
}, true);

document.addEventListener('change', function(e) {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (isInput || target.tagName === 'SELECT') {
        const type = target.type;
        if (type === 'checkbox' || type === 'radio') {
            recordAction(target.checked ? 'check' : 'uncheck', target, null, null);
        } else if (target.tagName === 'SELECT') {
            recordAction('select', target, target.value, null);
        } else {
            recordAction('fill', target, target.value, null);
        }
    }
}, true);

document.addEventListener('submit', function(e) {
    const target = e.target;
    recordAction('submit', target, null, null);
}, true);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        recordAction('press', e.target, 'Enter', null);
    }
}, true);

console.log('[Recording] Script initialized');
"""
# fmt: on


class RecordingService:
    """Service for recording browser actions using Playwright."""

    _instance: RecordingService | None = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        """Initialize the recording service."""
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._sessions: dict[str, dict[str, Any]] = {}
        self._stopped_sessions: dict[str, RecordingSession] = {}
        self._initialized = False
        self._thread: threading.Thread | None = None
        self._queue: queue.Queue[tuple[str, Any, asyncio.Future[Any]]] = queue.Queue()
        self._running = False

    @classmethod
    async def get_instance(cls) -> RecordingService:
        """Get or create the singleton instance."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = RecordingService()
            return cls._instance

    def _worker_thread(self) -> None:
        """Worker thread that handles all Playwright operations."""
        from playwright.sync_api import sync_playwright

        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=False)
        self._initialized = True
        logger.info("Playwright browser initialized for recording")

        while self._running:
            try:
                op, args, future = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue

            try:
                if op == "start":
                    result = self._do_start_recording(*args)
                elif op == "stop":
                    result = self._do_stop_recording(*args)
                elif op == "shutdown":
                    self._do_shutdown()
                    result = None
                else:
                    result = None

                loop = future.get_loop()
                loop.call_soon_threadsafe(future.set_result, result)
            except Exception as e:  # noqa: BLE001
                loop = future.get_loop()
                loop.call_soon_threadsafe(future.set_exception, e)

    def _ensure_thread_started(self) -> None:
        """Ensure the worker thread is running."""
        if self._thread is None or not self._thread.is_alive():
            self._running = True
            self._thread = threading.Thread(target=self._worker_thread, daemon=True)
            self._thread.start()
            while not self._initialized:
                time.sleep(0.1)

    def _inject_recorder(self, page: Page) -> None:
        """Inject recording script into page."""
        page.add_init_script(RECORDER_SCRIPT)
        # Also inject into current page if already loaded
        with contextlib.suppress(Exception):
            page.evaluate(RECORDER_SCRIPT)

    def _do_start_recording(self, session_id: str, start_url: str) -> RecordingSession:
        """Start recording (runs in worker thread)."""
        if self._browser is None:
            msg = "Browser not initialized"
            raise RuntimeError(msg)

        context = self._browser.new_context()
        page = context.new_page()

        # Inject recorder script for all new pages
        context.on("page", lambda p: self._inject_recorder(p))
        self._inject_recorder(page)

        session = RecordingSession(
            session_id=session_id,
            status="recording",
            start_url=start_url,
            actions=[],
        )

        self._sessions[session_id] = {
            "session": session,
            "context": context,
            "page": page,
            "start_time": time.time(),
        }

        if start_url and start_url != "about:blank":
            page.goto(start_url)
            session.actions.append(
                RecordedAction(
                    type=ActionType.NAVIGATE,
                    value=start_url,
                    timestamp=0.0,
                )
            )

        return session

    def _collect_actions_from_page(self, page: Page) -> list[RecordedAction]:
        """Collect recorded actions from page JavaScript."""
        actions: list[RecordedAction] = []
        try:
            raw_actions = page.evaluate("window.__recordedActions || []")
            for raw in raw_actions:
                action_type = raw.get("type", "")
                type_map = {
                    "click": ActionType.CLICK,
                    "fill": ActionType.FILL,
                    "select": ActionType.SELECT,
                    "check": ActionType.CHECK,
                    "uncheck": ActionType.UNCHECK,
                    "press": ActionType.PRESS,
                    "submit": ActionType.CLICK,
                }
                if action_type in type_map:
                    actions.append(
                        RecordedAction(
                            type=type_map[action_type],
                            selector=raw.get("selector"),
                            value=raw.get("value"),
                            timestamp=raw.get("timestamp", 0),
                            x=raw.get("x"),
                            y=raw.get("y"),
                        )
                    )
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to collect actions from page: %s", e)
        return actions

    def _do_stop_recording(self, session_id: str) -> RecordingSession:
        """Stop recording (runs in worker thread)."""
        session_data = self._sessions.get(session_id)
        if not session_data:
            msg = f"Session {session_id} not found"
            raise ValueError(msg)

        context: BrowserContext = session_data["context"]
        page: Page = session_data["page"]
        session: RecordingSession = session_data["session"]

        # Collect actions from injected JavaScript
        js_actions = self._collect_actions_from_page(page)
        session.actions.extend(js_actions)

        context.close()

        session.status = "stopped"
        self._stopped_sessions[session_id] = session
        del self._sessions[session_id]
        return session

    def _do_shutdown(self) -> None:
        """Shutdown (runs in worker thread)."""
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._playwright:
            self._playwright.stop()
            self._playwright = None
        self._initialized = False
        self._running = False

    async def start_recording(
        self,
        start_url: str = "about:blank",
        on_action: Callable[[RecordedAction], None] | None = None,
    ) -> RecordingSession:
        """Start a new recording session."""
        self._ensure_thread_started()

        session_id = str(uuid.uuid4())
        loop = asyncio.get_event_loop()
        future: asyncio.Future[RecordingSession] = loop.create_future()

        self._queue.put(("start", (session_id, start_url), future))
        session = await future

        if on_action:
            self._sessions[session_id]["on_action"] = on_action

        return session

    async def stop_recording(self, session_id: str) -> RecordingSession:
        """Stop recording and extract actions from trace."""
        loop = asyncio.get_event_loop()
        future: asyncio.Future[RecordingSession] = loop.create_future()

        self._queue.put(("stop", (session_id,), future))
        return await future

    def get_session(self, session_id: str) -> RecordingSession | None:
        """Get a recording session by ID."""
        session_data = self._sessions.get(session_id)
        if session_data:
            return session_data["session"]
        return self._stopped_sessions.get(session_id)

    def remove_session(self, session_id: str) -> None:
        """Remove a stopped session after it's been used."""
        self._stopped_sessions.pop(session_id, None)

    async def shutdown(self) -> None:
        """Shutdown the recording service."""
        if not self._running:
            return

        loop = asyncio.get_event_loop()
        future: asyncio.Future[None] = loop.create_future()
        self._queue.put(("shutdown", (), future))

        try:
            await asyncio.wait_for(future, timeout=5.0)
        except TimeoutError:
            self._running = False

        RecordingService._instance = None

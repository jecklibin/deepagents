"""Browser recording service using Playwright."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import logging
import queue
import re
import threading
import time
import uuid
from pathlib import Path
from typing import TYPE_CHECKING, Any

from deepagents_web.models.recording import ActionType, RecordedAction, RecordingSession
from deepagents_web.services.browser_service import BrowserService

if TYPE_CHECKING:
    from collections.abc import Callable

    from playwright.sync_api import Browser, BrowserContext, Page, Playwright

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 0.5

RECORDER_SCRIPT_PATH = Path(__file__).resolve().parent / "scripts" / "recorder.js"

# Treat timestamps above this as "epoch milliseconds" from Date.now().
EPOCH_MS_THRESHOLD = 100_000_000_000

# Preview replay pacing (best-effort for dynamic UIs).
PREVIEW_DELAY_CAP_SECONDS = 2.0
PREVIEW_DELAY_MIN_SECONDS = 0.2
PREVIEW_POST_CLICK_SLEEP_SECONDS = 0.8
PREVIEW_POST_NAVIGATE_SLEEP_SECONDS = 0.2


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
        self._recorder_script: str | None = None
        self._recorder_script_mtime: float | None = None
        self._recorder_script_version: str | None = None
        self._last_poll = 0.0
        self._browser_service = BrowserService()

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
                op, args, future = self._queue.get(timeout=POLL_INTERVAL_SECONDS)
            except queue.Empty:
                self._poll_sessions()
                continue

            try:
                if op == "start":
                    result = self._do_start_recording(*args)
                elif op == "stop":
                    result = self._do_stop_recording(*args)
                elif op == "preview":
                    result = self._do_preview(*args)
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
            finally:
                self._poll_sessions()

    def _ensure_thread_started(self) -> None:
        """Ensure the worker thread is running."""
        if self._thread is None or not self._thread.is_alive():
            self._running = True
            self._thread = threading.Thread(target=self._worker_thread, daemon=True)
            self._thread.start()
            while not self._initialized:
                time.sleep(0.1)

    def _load_recorder_script(self) -> str:
        """Load the injected recorder JavaScript from disk."""
        if not RECORDER_SCRIPT_PATH.exists():
            msg = f"Recorder script not found at {RECORDER_SCRIPT_PATH}"
            raise FileNotFoundError(msg)

        mtime = RECORDER_SCRIPT_PATH.stat().st_mtime
        if (
            self._recorder_script is not None
            and self._recorder_script_mtime is not None
            and mtime == self._recorder_script_mtime
        ):
            return self._recorder_script

        self._recorder_script = RECORDER_SCRIPT_PATH.read_text(encoding="utf-8")
        self._recorder_script_mtime = mtime
        self._recorder_script_version = self._extract_recorder_version(self._recorder_script)
        return self._recorder_script

    def _extract_recorder_version(self, script: str) -> str | None:
        match = re.search(r'RECORDER_VERSION\\s*=\\s*"([^"]+)"', script)
        return match.group(1) if match else None

    def _inject_recorder(self, page: Page) -> None:
        """Inject recording script into page."""
        script = self._load_recorder_script()
        page.add_init_script(script)
        # Also inject into current page if already loaded
        with contextlib.suppress(Exception):
            page.evaluate(script)

    def _ensure_recorder_installed(self, page: Page) -> None:
        """Best-effort ensure recorder is present (useful for SPA navigations)."""
        try:
            state = page.evaluate(
                "() => ({ installed: !!window.__deepagentsRecorder__, "
                "version: window.__deepagentsRecorderVersion__ || null, "
                "initialized: !!window.__deepagentsRecorderInitialized__, "
                "readyState: (document && document.readyState) ? document.readyState : null, "
                "panel: !!(document && document.getElementById && "
                "document.getElementById('__deepagents_recorder_panel__')) })",
            )
        except Exception:  # noqa: BLE001
            return

        if not isinstance(state, dict):
            return
        installed = bool(state.get("installed"))
        version = state.get("version")
        initialized = bool(state.get("initialized"))
        ready_state = state.get("readyState")
        expected_version = self._recorder_script_version or self._extract_recorder_version(
            self._load_recorder_script()
        )

        if (
            installed
            and expected_version
            and version == expected_version
            and (initialized or ready_state == "loading")
        ):
            return

        with contextlib.suppress(Exception):
            page.evaluate(self._load_recorder_script())

    def _poll_sessions(self) -> None:
        """Poll active sessions for actions and AI requests."""
        now = time.time()
        if now - self._last_poll < POLL_INTERVAL_SECONDS:
            return
        self._last_poll = now

        if not self._sessions:
            return

        for session_id, session_data in list(self._sessions.items()):
            context = session_data.get("context")
            pages = []
            if context:
                pages.extend(context.pages)
            page = session_data.get("page")
            if page and page not in pages:
                pages.append(page)

            if not pages:
                continue

            if self._check_stop_request(pages):
                on_status = session_data.get("on_status")
                session = self._do_stop_recording(session_id)
                if on_status:
                    on_status(session)
                continue

            for pg in pages:
                self._ensure_recorder_installed(pg)
                request = self._check_ai_request(pg)
                if request:
                    self._handle_ai_request(pg, request)

            self._sync_session_actions(session_data, pages)

    def _check_stop_request(self, pages: list[Page]) -> bool:
        """Check if any page has requested recording to stop."""
        for page in pages:
            try:
                stop_requested = page.evaluate(
                    """() => {
                        if (window.__stopRecordingRequest__) {
                            delete window.__stopRecordingRequest__;
                            return true;
                        }
                        return false;
                    }"""
                )
                if stop_requested:
                    return True
            except Exception as exc:  # noqa: BLE001
                logger.debug("Stop request check failed: %s", exc)
                continue
        return False

    def _check_ai_request(self, page: Page) -> dict[str, Any] | None:
        """Fetch pending AI requests from a page, if any."""
        try:
            request = page.evaluate(
                """() => {
                    if (window.__aiExtractionRequest__) {
                        var req = window.__aiExtractionRequest__;
                        delete window.__aiExtractionRequest__;
                        return req;
                    }
                    return null;
                }"""
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AI request polling failed: %s", exc)
            return None

        if not request:
            return None
        if isinstance(request, dict):
            return request
        return None

    def _handle_ai_request(self, page: Page, request: dict[str, Any]) -> None:
        """Process AI extraction/formfill requests and return result to page."""
        html = request.get("html") or ""
        if not html:
            return

        request_type = request.get("type", "extract")
        description = request.get("description", "")
        user_prompt = request.get("user_prompt", "")

        from deepagents_web.services.skill_service import SkillService

        skill_service = SkillService()

        try:
            if request_type == "formfill":
                result = skill_service.generate_formfill_js(
                    html=html,
                    user_prompt=user_prompt,
                    description=description,
                )
                response_data = {
                    "success": True,
                    "javascript": result.get("javascript"),
                    "used_model": result.get("used_model", ""),
                }
                page.evaluate(
                    "(response) => { window.__aiFormFillResponse__ = response; }",
                    response_data,
                )
                return

            result = skill_service.generate_extraction_js(
                html=html,
                user_prompt=user_prompt,
                description=description,
            )
            response_data = {
                "success": True,
                "javascript": result.get("javascript"),
                "used_model": result.get("used_model", ""),
            }
            page.evaluate(
                "(response) => { window.__aiExtractionResponse__ = response; }",
                response_data,
            )
        except Exception as exc:  # noqa: BLE001
            response_data = {"success": False, "error": str(exc)}
            if request_type == "formfill":
                target_var = "__aiFormFillResponse__"
            else:
                target_var = "__aiExtractionResponse__"
            page.evaluate(
                "(response) => { window." + target_var + " = response; }",
                response_data,
            )

    def _collect_raw_actions(self, page: Page) -> list[dict[str, Any]]:
        """Collect raw action data from a page."""
        try:
            raw_actions = page.evaluate(
                """() => {
                    try {
                        var saved = sessionStorage.getItem('__deepagents_actions__');
                        if (saved) {
                            return JSON.parse(saved);
                        }
                    } catch (e) {}
                    return window.__recordedActions__ || [];
                }"""
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to read actions from page: %s", exc)
            return []

        if isinstance(raw_actions, list):
            return raw_actions
        return []

    def _normalize_action(self, raw: dict[str, Any]) -> RecordedAction | None:
        """Convert raw JS action to RecordedAction."""
        action_type = raw.get("type", "")
        type_map = {
            "click": ActionType.CLICK,
            "fill": ActionType.FILL,
            "select": ActionType.SELECT,
            "check": ActionType.CHECK,
            "uncheck": ActionType.UNCHECK,
            "press": ActionType.PRESS,
            "submit": ActionType.CLICK,
            "scroll": ActionType.SCROLL,
            "hover": ActionType.HOVER,
            "extract": ActionType.EXTRACT,
            "extract_text": ActionType.EXTRACT_TEXT,
            "extract_html": ActionType.EXTRACT_HTML,
            "extract_attribute": ActionType.EXTRACT_ATTRIBUTE,
            "ai_extract": ActionType.AI_EXTRACT,
            "ai_fill": ActionType.AI_FILL,
            "execute_js": ActionType.EXECUTE_JS,
        }
        if action_type not in type_map:
            return None

        timestamp = raw.get("timestamp", 0)
        try:
            timestamp = float(timestamp)
        except (TypeError, ValueError):
            timestamp = 0.0

        return RecordedAction(
            type=type_map[action_type],
            selector=raw.get("selector"),
            xpath=raw.get("xpath"),
            value=raw.get("value"),
            timestamp=timestamp,
            x=raw.get("x"),
            y=raw.get("y"),
            robust_selector=raw.get("robust_selector"),
            tag_name=raw.get("tag_name") or raw.get("tagName"),
            text=raw.get("text"),
            prompt=raw.get("prompt"),
            output_key=raw.get("output_key") or raw.get("variable_name"),
            extract_type=raw.get("extract_type"),
            variable_name=raw.get("variable_name"),
            attribute_name=raw.get("attribute_name"),
            js_code=raw.get("js_code"),
            intent=raw.get("intent"),
            accessibility=raw.get("accessibility"),
            context=raw.get("context"),
            evidence=raw.get("evidence"),
        )

    def _sync_session_actions(self, session_data: dict[str, Any], pages: list[Page]) -> None:
        """Sync recorded actions from all pages and stream new actions."""
        session = session_data["session"]
        start_url = session.start_url
        initial_actions: list[RecordedAction] = session_data.get("initial_actions", [])
        raw_actions: list[dict[str, Any]] = []
        for page in pages:
            raw_actions.extend(self._collect_raw_actions(page))

        normalized: list[RecordedAction] = []
        for raw in raw_actions:
            if not isinstance(raw, dict):
                continue
            action = self._normalize_action(raw)
            if action:
                normalized.append(action)

        normalized.sort(key=lambda action: action.timestamp)
        combined: list[RecordedAction] = []
        if (
            start_url
            and start_url != "about:blank"
            and not any(
                action.type == ActionType.NAVIGATE and action.value == start_url
                for action in initial_actions
            )
        ):
            initial_actions.insert(
                0,
                RecordedAction(
                    type=ActionType.NAVIGATE,
                    value=start_url,
                    timestamp=0.0,
                ),
            )
            session_data["initial_actions"] = initial_actions

        combined.extend(initial_actions)
        for action in normalized:
            if start_url and action.type == ActionType.NAVIGATE and action.value == start_url:
                continue
            combined.append(action)

        combined.sort(key=lambda action: action.timestamp)
        session.actions = combined

        on_action = session_data.get("on_action")
        if not on_action:
            return

        seen = session_data.setdefault("seen_actions", set())
        for action in session.actions:
            key = (
                action.timestamp,
                action.type.value,
                action.selector,
                action.value,
                action.variable_name,
            )
            if key in seen:
                continue
            seen.add(key)
            on_action(action)

    def _do_start_recording(
        self, session_id: str, start_url: str, profile_id: str | None = None
    ) -> RecordingSession:
        """Start recording (runs in worker thread)."""
        if self._browser is None:
            msg = "Browser not initialized"
            raise RuntimeError(msg)

        # Load profile storage state if provided
        context_options: dict[str, Any] = {}
        if profile_id:
            storage_path = self._browser_service.get_storage_state_path(profile_id)
            if storage_path and storage_path.exists():
                context_options["storage_state"] = str(storage_path)
            self._browser_service.update_last_used(profile_id)

        context = self._browser.new_context(**context_options)
        page = context.new_page()

        # Inject recorder script for all new pages
        context.on("page", lambda p: self._inject_recorder(p))
        self._inject_recorder(page)

        session = RecordingSession(
            session_id=session_id,
            status="recording",
            start_url=start_url,
            actions=[],
            profile_id=profile_id,
        )

        initial_actions: list[RecordedAction] = []
        self._sessions[session_id] = {
            "session": session,
            "context": context,
            "page": page,
            "start_time": time.time(),
            "profile_id": profile_id,
            "initial_actions": initial_actions,
        }

        if start_url and start_url != "about:blank":
            page.goto(start_url)
            navigate_action = RecordedAction(
                type=ActionType.NAVIGATE,
                value=start_url,
                timestamp=0.0,
            )
            initial_actions.append(navigate_action)
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
        raw_actions = self._collect_raw_actions(page)
        for raw in raw_actions:
            if not isinstance(raw, dict):
                continue
            action = self._normalize_action(raw)
            if action:
                actions.append(action)
        return actions

    def _capture_screenshot(self, page: Page) -> str:
        """Capture and encode screenshot."""
        screenshot = page.screenshot(type="png")
        return base64.b64encode(screenshot).decode("utf-8")

    def _do_stop_recording(self, session_id: str) -> RecordingSession:
        """Stop recording (runs in worker thread)."""
        session_data = self._sessions.get(session_id)
        if not session_data:
            stopped_session = self._stopped_sessions.get(session_id)
            if stopped_session:
                return stopped_session
            msg = f"Session {session_id} not found"
            raise ValueError(msg)

        context: BrowserContext = session_data["context"]
        page: Page = session_data["page"]
        session: RecordingSession = session_data["session"]
        profile_id = session_data.get("profile_id")
        start_url = session.start_url
        initial_actions: list[RecordedAction] = session_data.get("initial_actions", [])

        pages = []
        if context:
            pages.extend(context.pages)
        if page and page not in pages:
            pages.append(page)

        actions: list[RecordedAction] = []
        for pg in pages:
            actions.extend(self._collect_actions_from_page(pg))
        combined: list[RecordedAction] = []
        if (
            start_url
            and start_url != "about:blank"
            and not any(
                action.type == ActionType.NAVIGATE and action.value == start_url
                for action in initial_actions
            )
        ):
            initial_actions.insert(
                0,
                RecordedAction(
                    type=ActionType.NAVIGATE,
                    value=start_url,
                    timestamp=0.0,
                ),
            )

        combined.extend(initial_actions)
        for action in actions:
            if start_url and action.type == ActionType.NAVIGATE and action.value == start_url:
                continue
            combined.append(action)
        combined.sort(key=lambda action: action.timestamp)
        session.actions = combined

        # Save profile storage state if profile was used
        if profile_id:
            storage_path = self._browser_service.get_storage_state_path(profile_id)
            if storage_path:
                storage_path.parent.mkdir(parents=True, exist_ok=True)
                context.storage_state(path=str(storage_path))

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
        on_status: Callable[[RecordingSession], None] | None = None,
        profile_id: str | None = None,
    ) -> RecordingSession:
        """Start a new recording session."""
        self._ensure_thread_started()

        session_id = str(uuid.uuid4())
        loop = asyncio.get_event_loop()
        future: asyncio.Future[RecordingSession] = loop.create_future()

        self._queue.put(("start", (session_id, start_url, profile_id), future))
        session = await future

        if on_action:
            self._sessions[session_id]["on_action"] = on_action
        if on_status:
            self._sessions[session_id]["on_status"] = on_status

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

    async def preview_actions(
        self,
        actions: list[dict[str, Any]],
        profile_id: str | None = None,
    ) -> dict[str, Any]:
        """Preview actions by replaying them in a browser."""
        self._ensure_thread_started()

        loop = asyncio.get_event_loop()
        future: asyncio.Future[dict[str, Any]] = loop.create_future()

        self._queue.put(("preview", (actions, profile_id), future))
        return await future

    def _do_preview(self, actions: list[dict[str, Any]], profile_id: str | None) -> dict[str, Any]:
        """Execute preview (runs in worker thread)."""
        if self._browser is None:
            msg = "Browser not initialized"
            raise RuntimeError(msg)

        context_options: dict[str, Any] = {}
        if profile_id:
            storage_path = self._browser_service.get_storage_state_path(profile_id)
            if storage_path and storage_path.exists():
                context_options["storage_state"] = str(storage_path)

        context = self._browser.new_context(**context_options)
        page = context.new_page()

        try:
            ctx: dict[str, Any] = {}
            prev_epoch_ms: float | None = None
            for idx, action in enumerate(actions, start=1):
                try:
                    ts = action.get("timestamp")
                    if isinstance(ts, (int, float)) and ts > EPOCH_MS_THRESHOLD:
                        if prev_epoch_ms is not None and ts >= prev_epoch_ms:
                            # Cap the delay so previews don't become painfully slow, but still
                            # reflect user timing enough for dynamic UIs (menus, dialogs, etc.).
                            delay = min((ts - prev_epoch_ms) / 1000.0, PREVIEW_DELAY_CAP_SECONDS)
                            if delay >= PREVIEW_DELAY_MIN_SECONDS:
                                time.sleep(delay)
                        prev_epoch_ms = float(ts)

                    self._execute_action(page, action, ctx)
                except Exception as exc:
                    action_type = action.get("type", "unknown")
                    msg = f"Preview failed at step {idx} ({action_type}): {exc}"
                    raise RuntimeError(msg) from exc

            result = {
                "url": page.url,
                "title": page.title(),
                "extracted": ctx,
            }
        finally:
            context.close()

        return result

    def _execute_action(
        self, page: Any, action: dict[str, Any], context: dict[str, Any] | None = None
    ) -> Any:
        """Execute a single action on the page. Returns extracted data if applicable."""
        action_type = action.get("type", "")
        handlers = {
            "navigate": self._action_navigate,
            "click": self._action_click,
            "fill": self._action_fill,
            "press": self._action_press,
            "select": self._action_select,
            "check": self._action_check,
            "uncheck": self._action_uncheck,
            "scroll": self._action_scroll,
            "hover": self._action_hover,
            "extract": self._action_extract,
            "extract_text": self._action_extract_text,
            "extract_html": self._action_extract_html,
            "extract_attribute": self._action_extract_attribute,
            "ai_extract": self._action_ai_extract,
            "ai_fill": self._action_ai_fill,
            "execute_js": self._action_execute_js,
        }
        handler = handlers.get(action_type)
        if handler:
            return handler(page, action, context or {})
        return None

    def _get_locator(self, page: Any, action: dict[str, Any]) -> Any:
        """Get locator, preferring robust_selector and using .first for multiple matches."""
        robust = action.get("robust_selector")
        if robust and robust.startswith("get_by_"):
            # Execute robust selector like page.get_by_text("Today")
            return eval(f"page.{robust}")  # noqa: S307
        selector = action.get("selector")
        if selector:
            return page.locator(selector).first
        xpath = action.get("xpath")
        if xpath:
            return page.locator(f"xpath={xpath}").first

        # Recorded accessibility metadata can be a strong fallback for preview replay.
        accessibility = action.get("accessibility") or {}
        if isinstance(accessibility, dict):
            role = accessibility.get("role")
            name = accessibility.get("name")
            if role and name:
                with contextlib.suppress(Exception):
                    return page.get_by_role(role, name=name).first
        return None

    def _action_navigate(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        url = action.get("value") or action.get("url")
        if not url:
            return
        # Avoid hanging previews on pages that never reach "networkidle".
        page.goto(url, wait_until="domcontentloaded")
        with contextlib.suppress(Exception):
            page.wait_for_load_state("networkidle", timeout=5000)
        time.sleep(PREVIEW_POST_NAVIGATE_SLEEP_SECONDS)

    def _action_click(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        def _candidate_locators() -> list[Any]:
            candidates: list[Any] = []
            robust = action.get("robust_selector")
            if robust and isinstance(robust, str) and robust.startswith("get_by_"):
                with contextlib.suppress(Exception):
                    candidates.append(eval(f"page.{robust}").first)  # noqa: S307

            accessibility = action.get("accessibility") or {}
            if isinstance(accessibility, dict):
                role = accessibility.get("role")
                name = accessibility.get("name")
                if role and role != "generic" and name:
                    with contextlib.suppress(Exception):
                        candidates.append(page.get_by_role(role, name=name).first)

            text_value = (action.get("value") or "").strip()
            if text_value:
                with contextlib.suppress(Exception):
                    candidates.append(page.get_by_text(text_value, exact=True).first)

            # Keep low-level selectors as fallbacks.
            selector = action.get("selector")
            xpath = action.get("xpath")
            if selector:
                candidates.append(page.locator(selector).first)
            if xpath:
                candidates.append(page.locator(f"xpath={xpath}").first)

            return candidates

        last_error: Exception | None = None
        for locator in _candidate_locators():
            try:
                with contextlib.suppress(Exception):
                    locator.wait_for(state="visible", timeout=5000)
                locator.click(timeout=5000)
                last_error = None
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        if last_error is not None and action.get("x") is not None and action.get("y") is not None:
            page.mouse.click(action["x"], action["y"])
            last_error = None

        if last_error is not None:
            raise last_error

        with contextlib.suppress(Exception):
            page.wait_for_load_state("domcontentloaded", timeout=10000)
        time.sleep(PREVIEW_POST_CLICK_SLEEP_SECONDS)

    def _action_fill(self, page: Any, action: dict[str, Any], ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            # Support variable substitution from context
            value = action.get("value") or ""
            for key, val in ctx.items():
                value = value.replace(f"{{{{{key}}}}}", str(val))
            locator.fill(value)

    def _action_press(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        page.keyboard.press(action.get("value") or "Enter")

    def _action_select(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            locator.select_option(action.get("value"))

    def _action_check(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            locator.check()

    def _action_uncheck(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            locator.uncheck()

    def _action_scroll(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        page.evaluate(f"window.scrollTo(0, {action.get('value') or 0})")

    def _action_hover(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            locator.hover()

    def _action_extract(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Extract data from page using CSS selector."""
        locator = self._get_locator(page, action)
        if locator:
            data = locator.text_content()
            output_key = action.get("output_key") or action.get("variable_name") or "extracted"
            ctx[output_key] = data
            return data
        return None

    def _action_extract_text(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Extract text content from a locator."""
        locator = self._get_locator(page, action)
        if locator:
            data = locator.text_content()
            output_key = action.get("variable_name") or action.get("output_key") or "extracted_text"
            ctx[output_key] = data
            return data
        return None

    def _action_extract_html(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Extract HTML content from a locator."""
        locator = self._get_locator(page, action)
        if locator:
            data = locator.inner_html()
            output_key = action.get("variable_name") or action.get("output_key") or "extracted_html"
            ctx[output_key] = data
            return data
        return None

    def _action_extract_attribute(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Extract attribute value from a locator."""
        locator = self._get_locator(page, action)
        attribute_name = action.get("attribute_name") or action.get("value")
        if locator and attribute_name:
            data = locator.get_attribute(attribute_name)
            output_key = (
                action.get("variable_name") or action.get("output_key") or "extracted_attribute"
            )
            ctx[output_key] = data
            return data
        return None

    def _action_ai_extract(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Extract data from page using AI prompt."""
        from deepagents_web.services.skill_service import SkillService

        prompt = action.get("prompt", "Extract the main content from this page")
        # Get page content
        content = page.content()[:10000]  # Limit content size
        # Use LLM to extract
        skill_service = SkillService()
        result = skill_service.ai_extract(content, prompt)
        output_key = action.get("output_key", "ai_extracted")
        ctx[output_key] = result
        return result

    def _action_ai_fill(self, page: Any, action: dict[str, Any], ctx: dict) -> None:
        """Fill form field using AI-generated content."""
        from deepagents_web.services.skill_service import SkillService

        locator = self._get_locator(page, action)
        if not locator:
            return
        prompt = action.get("prompt", "Generate appropriate content for this field")
        # Include context in prompt
        full_prompt = f"{prompt}\n\nContext: {ctx}"
        skill_service = SkillService()
        generated = skill_service.ai_generate(full_prompt)
        locator.fill(generated)

    def _action_execute_js(self, page: Any, action: dict[str, Any], ctx: dict) -> Any:
        """Execute JavaScript on the page and optionally store result."""
        js_code = action.get("js_code")
        if not js_code:
            return None
        result = page.evaluate(js_code)
        variable_name = action.get("variable_name") or action.get("output_key")
        if variable_name:
            ctx[variable_name] = result
        return result

    def execute_actions(
        self,
        actions: list[dict[str, Any]],
        start_url: str | None = None,
        inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute recorded actions synchronously (for hybrid skill execution).

        This method runs in a thread pool and executes the recorded actions
        in a headless browser context.

        Args:
            actions: List of recorded actions to execute
            start_url: Optional starting URL
            inputs: Optional input variables to pass to the execution context

        Returns:
            Dictionary with execution results including extracted data
        """
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            try:
                # Initialize context with inputs
                ctx: dict[str, Any] = inputs.copy() if inputs else {}

                # Navigate to start URL if provided
                if start_url:
                    page.goto(start_url, wait_until="domcontentloaded")

                # Execute each action
                for idx, action in enumerate(actions, start=1):
                    try:
                        self._execute_action(page, action, ctx)
                    except Exception as exc:
                        action_type = action.get("type", "unknown")
                        logger.warning(f"Action {idx} ({action_type}) failed: {exc}")
                        # Continue with next action unless it's critical
                        if action_type in ("navigate",):
                            raise

                result = {
                    "success": True,
                    "url": page.url,
                    "title": page.title(),
                    "extracted": ctx,
                }
            except Exception as exc:
                result = {
                    "success": False,
                    "error": str(exc),
                    "extracted": ctx if "ctx" in locals() else {},
                }
            finally:
                context.close()
                browser.close()

            return result

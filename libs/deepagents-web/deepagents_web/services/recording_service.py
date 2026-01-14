"""Browser recording service using Playwright."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import logging
import queue
import threading
import time
import uuid
from typing import TYPE_CHECKING, Any

from deepagents_web.models.recording import ActionType, RecordedAction, RecordingSession
from deepagents_web.services.browser_service import BrowserService

if TYPE_CHECKING:
    from collections.abc import Callable

    from playwright.sync_api import Browser, BrowserContext, Page, Playwright

logger = logging.getLogger(__name__)

# JavaScript to inject for capturing user interactions
# fmt: off
RECORDER_SCRIPT = """
window.__recordedActions = window.__recordedActions || [];
window.__recordingStartTime = window.__recordingStartTime || Date.now();
window.__extractMode = false;
window.__aiExtractMode = false;
window.__aiFormFillMode = false;
window.__highlightEl = null;

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

function getRobustSelector(element) {
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const ariaLabel = element.getAttribute('aria-label');
    const text = element.innerText?.trim().substring(0, 30);
    const placeholder = element.getAttribute('placeholder');
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');

    if (testId) return 'get_by_test_id("' + testId + '")';
    if (ariaLabel) return 'get_by_role("' + role + '", name="' + ariaLabel + '")';
    if (element.tagName === 'BUTTON' && text) return 'get_by_role("button", name="' + text + '")';
    if (element.tagName === 'A' && text) return 'get_by_role("link", name="' + text + '")';
    if (element.tagName === 'INPUT' && placeholder) return 'get_by_placeholder("' + placeholder + '")';
    if (text && text.length < 30) return 'get_by_text("' + text + '")';
    return 'locator("' + getSelector(element) + '")';
}

function recordAction(type, element, value, event, extra) {
    const action = {
        type: type,
        selector: getSelector(element),
        robust_selector: getRobustSelector(element),
        value: value || null,
        timestamp: (Date.now() - window.__recordingStartTime) / 1000,
        tagName: element.tagName.toLowerCase(),
        x: event ? Math.round(event.pageX) : null,
        y: event ? Math.round(event.pageY) : null,
        ...(extra || {})
    };
    window.__recordedActions.push(action);
    console.log('[Recording]', action);
    updateActionCount();
}

function updateActionCount() {
    const countEl = document.getElementById('__rec_count__');
    if (countEl) countEl.textContent = window.__recordedActions.length + ' actions';
}

function createPanel() {
    if (document.getElementById('__rec_panel__')) return;
    const panel = document.createElement('div');
    panel.id = '__rec_panel__';
    panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 2s infinite;"></div>
            <span style="font-weight:600;color:#1f2937;">Recording</span>
            <span id="__rec_count__" style="margin-left:auto;color:#6b7280;font-size:12px;">0 actions</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="__btn_extract__" class="__rec_btn__">Extract</button>
            <button id="__btn_ai_extract__" class="__rec_btn__">AI Extract</button>
            <button id="__btn_ai_fill__" class="__rec_btn__">AI Fill</button>
        </div>
        <div id="__rec_status__" style="margin-top:8px;font-size:11px;color:#6b7280;display:none;"></div>
    `;
    panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;border-radius:12px;padding:12px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;min-width:200px;';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .__rec_btn__{padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;font-weight:500;transition:all 0.2s;}
        .__rec_btn__:hover{background:#f3f4f6;border-color:#9ca3af;}
        .__rec_btn__.active{background:#1f2937;color:#fff;border-color:#1f2937;}
        #__rec_highlight__{position:absolute;pointer-events:none;border:2px solid #3b82f6;border-radius:3px;z-index:2147483646;display:none;transition:all 0.1s;}
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    const highlight = document.createElement('div');
    highlight.id = '__rec_highlight__';
    document.body.appendChild(highlight);
    window.__highlightEl = highlight;

    document.getElementById('__btn_extract__').onclick = () => toggleMode('extract');
    document.getElementById('__btn_ai_extract__').onclick = () => toggleMode('aiExtract');
    document.getElementById('__btn_ai_fill__').onclick = () => toggleMode('aiFill');

    makeDraggable(panel);
}

function makeDraggable(el) {
    let isDragging = false, startX, startY, origX, origY;
    el.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();
        origX = rect.left; origY = rect.top;
        e.preventDefault();
    };
    document.onmousemove = function(e) {
        if (!isDragging) return;
        el.style.left = (origX + e.clientX - startX) + 'px';
        el.style.top = (origY + e.clientY - startY) + 'px';
        el.style.right = 'auto';
    };
    document.onmouseup = function() { isDragging = false; };
}

function toggleMode(mode) {
    const modes = {extract: '__extractMode', aiExtract: '__aiExtractMode', aiFill: '__aiFormFillMode'};
    const btns = {extract: '__btn_extract__', aiExtract: '__btn_ai_extract__', aiFill: '__btn_ai_fill__'};

    Object.keys(modes).forEach(m => {
        window[modes[m]] = (m === mode) ? !window[modes[m]] : false;
        document.getElementById(btns[m]).classList.toggle('active', window[modes[m]]);
    });

    const anyActive = window.__extractMode || window.__aiExtractMode || window.__aiFormFillMode;
    document.body.style.cursor = anyActive ? 'crosshair' : 'default';
    showStatus(anyActive ? 'Click an element to ' + (window.__extractMode ? 'extract data' : window.__aiExtractMode ? 'AI extract' : 'AI fill') : '');
}

function showStatus(msg) {
    const el = document.getElementById('__rec_status__');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function highlightElement(el) {
    if (!window.__highlightEl || !el) return;
    const rect = el.getBoundingClientRect();
    const h = window.__highlightEl;
    h.style.display = 'block';
    h.style.left = (rect.left + window.scrollX - 2) + 'px';
    h.style.top = (rect.top + window.scrollY - 2) + 'px';
    h.style.width = (rect.width + 4) + 'px';
    h.style.height = (rect.height + 4) + 'px';
}

function hideHighlight() {
    if (window.__highlightEl) window.__highlightEl.style.display = 'none';
}

function isRecorderElement(el) {
    return el && (el.id?.startsWith('__rec') || el.id?.startsWith('__btn') || el.closest('#__rec_panel__'));
}

document.addEventListener('mouseover', function(e) {
    if ((window.__extractMode || window.__aiExtractMode || window.__aiFormFillMode) && !isRecorderElement(e.target)) {
        highlightElement(e.target);
    }
}, true);

document.addEventListener('mouseout', function(e) {
    if (window.__extractMode || window.__aiExtractMode || window.__aiFormFillMode) hideHighlight();
}, true);

document.addEventListener('click', function(e) {
    const target = e.target;
    if (!target.tagName || isRecorderElement(target)) return;

    if (window.__extractMode) {
        e.preventDefault(); e.stopPropagation();
        const outputKey = prompt('Variable name for extracted data:', 'data_' + window.__recordedActions.length);
        if (outputKey) {
            recordAction('extract', target, target.innerText?.substring(0, 200), e, {output_key: outputKey});
            showStatus('Recorded extract: ' + outputKey);
        }
        toggleMode('extract');
        return false;
    }

    if (window.__aiExtractMode) {
        e.preventDefault(); e.stopPropagation();
        const prompt_text = prompt('What data to extract?', 'Extract the main content');
        if (prompt_text) {
            const outputKey = 'ai_data_' + window.__recordedActions.length;
            recordAction('ai_extract', target, null, e, {prompt: prompt_text, output_key: outputKey});
            showStatus('Recorded AI extract: ' + outputKey);
        }
        toggleMode('aiExtract');
        return false;
    }

    if (window.__aiFormFillMode) {
        e.preventDefault(); e.stopPropagation();
        const prompt_text = prompt('Describe what to fill:', 'Fill with appropriate test data');
        if (prompt_text) {
            recordAction('ai_fill', target, null, e, {prompt: prompt_text});
            showStatus('Recorded AI fill');
        }
        toggleMode('aiFill');
        return false;
    }

    recordAction('click', target, target.innerText?.substring(0, 50), e);
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
    recordAction('submit', e.target, null, null);
}, true);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') recordAction('press', e.target, 'Enter', null);
}, true);

document.addEventListener('scroll', function(e) {
    if (!window.__scrollTimeout) {
        window.__scrollTimeout = setTimeout(function() {
            recordAction('scroll', document.documentElement, window.scrollY.toString(), null);
            window.__scrollTimeout = null;
        }, 500);
    }
}, true);

createPanel();
console.log('[Recording] Enhanced script with floating panel initialized');
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
                op, args, future = self._queue.get(timeout=0.5)
            except queue.Empty:
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

        self._sessions[session_id] = {
            "session": session,
            "context": context,
            "page": page,
            "start_time": time.time(),
            "profile_id": profile_id,
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
                    "scroll": ActionType.SCROLL,
                    "hover": ActionType.HOVER,
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
                            robust_selector=raw.get("robust_selector"),
                        )
                    )
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to collect actions from page: %s", e)
        return actions

    def _capture_screenshot(self, page: Page) -> str:
        """Capture and encode screenshot."""
        screenshot = page.screenshot(type="png")
        return base64.b64encode(screenshot).decode("utf-8")

    def _do_stop_recording(self, session_id: str) -> RecordingSession:
        """Stop recording (runs in worker thread)."""
        session_data = self._sessions.get(session_id)
        if not session_data:
            msg = f"Session {session_id} not found"
            raise ValueError(msg)

        context: BrowserContext = session_data["context"]
        page: Page = session_data["page"]
        session: RecordingSession = session_data["session"]
        profile_id = session_data.get("profile_id")

        # Collect actions from injected JavaScript
        js_actions = self._collect_actions_from_page(page)
        session.actions.extend(js_actions)

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

    def _do_preview(
        self, actions: list[dict[str, Any]], profile_id: str | None
    ) -> dict[str, Any]:
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
            for action in actions:
                self._execute_action(page, action)

            result = {
                "url": page.url,
                "title": page.title(),
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
            "ai_extract": self._action_ai_extract,
            "ai_fill": self._action_ai_fill,
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
        return None

    def _action_navigate(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        page.goto(action.get("value"))
        page.wait_for_load_state("networkidle")

    def _action_click(self, page: Any, action: dict[str, Any], _ctx: dict) -> None:
        locator = self._get_locator(page, action)
        if locator:
            locator.click()
        elif action.get("x") is not None and action.get("y") is not None:
            page.mouse.click(action["x"], action["y"])
        page.wait_for_load_state("domcontentloaded")

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
            output_key = action.get("output_key", "extracted")
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

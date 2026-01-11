name: "Enhanced Skill Creation with Browser Recording"
description: |

## Purpose
Enhance the deepagents-web skill creation capability with three methods: direct SKILL.md editing (existing), natural language description, and browser action recording. Enable skill testing/execution for validation.

---

## Goal
Extend the skill creation system in deepagents-web to support:
1. **Direct SKILL.md Creation** (existing) - Manual editing of SKILL.md content
2. **Natural Language Creation** - Describe skill goals and steps in plain language, auto-generate SKILL.md
3. **Browser Recording** - Record browser actions as deterministic, replayable workflows packaged as skills
4. **Skill Testing** - Execute skills to validate correctness before deployment

## Why
- **Lower Barrier**: Natural language creation removes need to understand SKILL.md format
- **Automation**: Browser recording captures complex workflows without manual scripting
- **Reliability**: Deterministic replay ensures consistent skill execution
- **Quality**: Test execution validates skills work correctly before use
- **User Experience**: Multiple creation methods accommodate different user preferences and skill types

## What

### User-Visible Behavior
1. **Skill Creation Modal Enhancement**
   - Tab-based interface: "Manual", "Natural Language", "Record Browser"
   - Manual tab: existing SKILL.md editor
   - Natural Language tab: text area for describing skill + auto-generate button
   - Record Browser tab: start/stop recording controls + action preview

2. **Browser Recording Flow**
   - User clicks "Start Recording" → browser window opens
   - User performs actions in browser (clicks, typing, navigation)
   - Actions captured and displayed in real-time preview
   - User clicks "Stop Recording" → actions converted to skill
   - Generated SKILL.md includes Playwright action sequence

3. **Skill Testing**
   - "Test Skill" button on skill cards and edit modal
   - Executes skill in isolated context
   - Shows execution log and result (success/failure)
   - For browser skills: shows browser window during test

### Success Criteria
- [ ] Natural language skill creation generates valid SKILL.md
- [ ] Browser recording captures clicks, typing, navigation, assertions
- [ ] Recorded actions replay deterministically
- [ ] Skill test execution shows real-time progress
- [ ] Test results clearly indicate success/failure with details
- [ ] All three creation methods produce compatible skill format
- [ ] Existing skill functionality remains unchanged

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: libs/deepagents-web/deepagents_web/services/skill_service.py
  why: Existing skill CRUD operations - extend for new creation methods

- file: libs/deepagents-web/deepagents_web/models/skill.py
  why: Existing Pydantic models - extend for recording data

- file: libs/deepagents-web/deepagents_web/api/skills.py
  why: Existing REST endpoints - add new endpoints for recording/testing

- file: libs/deepagents-web/deepagents_web/static/js/skills.js
  why: Existing frontend - extend modal with tabs and recording UI

- file: libs/deepagents-cli/deepagents_cli/mcp_proxy.py
  why: Playwright MCP integration pattern - reuse for browser control

- file: libs/deepagents-cli/deepagents_cli/skills/load.py
  why: SKILL.md format and validation - ensure generated skills are valid

- url: https://playwright.dev/python/docs/codegen
  why: Playwright codegen for recording browser actions
  critical: Use page.pause() for custom recording setup

- url: https://playwright.dev/python/docs/trace-viewer
  why: Playwright tracing for capturing action sequences
  critical: context.tracing.start(screenshots=True, snapshots=True)

- url: https://docs.cloud.browser-use.com/concepts/skills
  why: Browser-use skill patterns for reference (if accessible)
```

### Current Codebase tree
```bash
libs/deepagents-web/
├── deepagents_web/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Web settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── chat.py                # WebSocket chat
│   │   ├── skills.py              # REST skill endpoints
│   │   └── sessions.py            # Session management
│   ├── services/
│   │   ├── __init__.py
│   │   ├── agent_service.py       # Agent streaming
│   │   └── skill_service.py       # Skill CRUD
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat.py                # Chat models
│   │   └── skill.py               # Skill models
│   └── static/
│       ├── index.html             # Main HTML
│       ├── css/styles.css         # Styling
│       └── js/
│           ├── app.js             # App init
│           ├── chat.js            # Chat UI
│           └── skills.js          # Skills UI
```

### Desired Codebase tree with files to be added
```bash
libs/deepagents-web/
├── deepagents_web/
│   ├── api/
│   │   ├── skills.py              # MODIFY: Add recording/testing endpoints
│   │   └── recording.py           # NEW: WebSocket for browser recording
│   ├── services/
│   │   ├── skill_service.py       # MODIFY: Add NL generation, recording conversion
│   │   ├── recording_service.py   # NEW: Browser recording management
│   │   └── skill_executor.py      # NEW: Skill test execution
│   ├── models/
│   │   ├── skill.py               # MODIFY: Add recording models
│   │   └── recording.py           # NEW: Recording action models
│   └── static/
│       ├── index.html             # MODIFY: Add recording modal elements
│       ├── css/styles.css         # MODIFY: Add recording UI styles
│       └── js/
│           ├── skills.js          # MODIFY: Add tabs, recording UI
│           └── recording.js       # NEW: Recording WebSocket client
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: Playwright MCP uses singleton pattern for persistent sessions
# See mcp_proxy.py - MCPClientProxy.get_instance() maintains browser state
# Must use same pattern for recording to keep browser alive

# CRITICAL: Recording must capture action metadata, not just execute
# Playwright codegen generates code, but we need structured action data
# Use tracing API: context.tracing.start() captures actions as JSON

# CRITICAL: SKILL.md format requires YAML frontmatter
# name: lowercase alphanumeric with hyphens, max 64 chars
# description: max 1024 chars
# See _validate_skill_name() in skills/load.py

# CRITICAL: Browser skills need special execution context
# Regular skills are text instructions for the agent
# Browser skills contain Playwright action sequences that need direct execution
# Add "type: browser" to frontmatter to distinguish

# CRITICAL: WebSocket needed for real-time recording feedback
# REST endpoints can't stream action events
# Use same pattern as chat.py WebSocket for recording events

# CRITICAL: Use python-dotenv and load_dotenv() for env vars
# Already used in config.py - follow same pattern
```

## Implementation Blueprint

### Data models and structure

```python
# models/recording.py - New models for browser recording
from pydantic import BaseModel
from typing import Literal, Any
from enum import Enum

class ActionType(str, Enum):
    NAVIGATE = "navigate"
    CLICK = "click"
    FILL = "fill"
    SELECT = "select"
    CHECK = "check"
    UNCHECK = "uncheck"
    PRESS = "press"
    SCREENSHOT = "screenshot"
    WAIT = "wait"
    ASSERT_VISIBLE = "assert_visible"
    ASSERT_TEXT = "assert_text"

class RecordedAction(BaseModel):
    """Single recorded browser action."""
    type: ActionType
    selector: str | None = None  # CSS/XPath selector
    value: str | None = None     # Input value, URL, key
    timestamp: float             # When action occurred
    screenshot: str | None = None  # Base64 screenshot (optional)

class RecordingSession(BaseModel):
    """Active recording session state."""
    session_id: str
    status: Literal["idle", "recording", "stopped"]
    actions: list[RecordedAction] = []
    start_url: str | None = None

class RecordingStartRequest(BaseModel):
    """Request to start recording."""
    start_url: str = "about:blank"
    headless: bool = False

class RecordingStopRequest(BaseModel):
    """Request to stop recording."""
    session_id: str

class RecordingWebSocketMessage(BaseModel):
    """WebSocket message for recording events."""
    type: Literal["action", "screenshot", "error", "status"]
    data: Any

# models/skill.py - Extend existing models
class SkillCreateFromNL(BaseModel):
    """Create skill from natural language description."""
    name: str
    goal: str           # What the skill should accomplish
    steps: str          # Natural language steps

class SkillCreateFromRecording(BaseModel):
    """Create skill from recorded browser actions."""
    name: str
    description: str
    session_id: str     # Recording session to convert

class SkillTestRequest(BaseModel):
    """Request to test a skill."""
    name: str
    test_input: dict[str, Any] | None = None  # Optional test parameters

class SkillTestResult(BaseModel):
    """Result of skill test execution."""
    success: bool
    duration_ms: float
    output: str | None = None
    error: str | None = None
    screenshots: list[str] = []  # Base64 screenshots for browser skills
```

### List of tasks to be completed

```yaml
Task 1:
CREATE libs/deepagents-web/deepagents_web/models/recording.py:
  - Define ActionType enum with all supported browser actions
  - Define RecordedAction model for single action
  - Define RecordingSession model for session state
  - Define WebSocket message models for recording events
  - PATTERN: Follow existing models/chat.py structure

Task 2:
MODIFY libs/deepagents-web/deepagents_web/models/skill.py:
  - ADD SkillCreateFromNL model for natural language creation
  - ADD SkillCreateFromRecording model for recording conversion
  - ADD SkillTestRequest and SkillTestResult models
  - ADD SkillType enum: "manual", "browser"
  - PRESERVE existing SkillCreate, SkillUpdate, SkillResponse

Task 3:
CREATE libs/deepagents-web/deepagents_web/services/recording_service.py:
  - Implement RecordingService class with singleton browser instance
  - MIRROR pattern from: mcp_proxy.py MCPClientProxy
  - Methods: start_recording(), stop_recording(), get_session()
  - Use Playwright tracing API for action capture
  - Convert trace to RecordedAction list

Task 4:
MODIFY libs/deepagents-web/deepagents_web/services/skill_service.py:
  - ADD create_skill_from_nl() method using LLM to generate SKILL.md
  - ADD create_skill_from_recording() method to convert actions to skill
  - ADD _generate_browser_skill_content() helper for Playwright code generation
  - PRESERVE existing create_skill(), update_skill(), delete_skill()

Task 5:
CREATE libs/deepagents-web/deepagents_web/services/skill_executor.py:
  - Implement SkillExecutor class for testing skills
  - Methods: execute_skill(), execute_browser_skill()
  - For browser skills: run Playwright actions and capture results
  - For manual skills: invoke agent with skill context
  - Return SkillTestResult with success/failure and output

Task 6:
CREATE libs/deepagents-web/deepagents_web/api/recording.py:
  - WebSocket endpoint: /api/ws/recording
  - Handle start/stop recording commands
  - Stream action events to client in real-time
  - MIRROR pattern from: api/chat.py WebSocket handling

Task 7:
MODIFY libs/deepagents-web/deepagents_web/api/skills.py:
  - ADD POST /api/skills/from-nl endpoint for NL creation
  - ADD POST /api/skills/from-recording endpoint for recording conversion
  - ADD POST /api/skills/{name}/test endpoint for skill testing
  - ADD GET /api/skills/{name}/test-status for async test status
  - PRESERVE existing CRUD endpoints

Task 8:
MODIFY libs/deepagents-web/deepagents_web/main.py:
  - ADD recording router: app.include_router(recording_router, prefix="/api")
  - PRESERVE existing routers and static file serving

Task 9:
MODIFY libs/deepagents-web/deepagents_web/static/index.html:
  - ADD tab structure to skill modal: Manual | Natural Language | Record Browser
  - ADD recording controls: Start/Stop buttons, action preview area
  - ADD test button to skill cards
  - ADD test result display area
  - PRESERVE existing modal structure

Task 10:
CREATE libs/deepagents-web/deepagents_web/static/js/recording.js:
  - Implement RecordingManager class
  - WebSocket connection to /api/ws/recording
  - Methods: startRecording(), stopRecording(), onAction()
  - Real-time action list rendering
  - Screenshot preview display

Task 11:
MODIFY libs/deepagents-web/deepagents_web/static/js/skills.js:
  - ADD tab switching logic for creation methods
  - ADD natural language form handling
  - ADD recording integration (use RecordingManager)
  - ADD test skill button handler
  - ADD test result modal/display
  - PRESERVE existing CRUD functionality

Task 12:
MODIFY libs/deepagents-web/deepagents_web/static/css/styles.css:
  - ADD tab styles for skill modal
  - ADD recording UI styles (action list, controls)
  - ADD test result styles (success/failure indicators)
  - PRESERVE existing styles

Task 13:
CREATE libs/deepagents-web/tests/test_recording_service.py:
  - Test start/stop recording lifecycle
  - Test action capture and conversion
  - Test session management

Task 14:
CREATE libs/deepagents-web/tests/test_skill_executor.py:
  - Test manual skill execution
  - Test browser skill execution
  - Test error handling and timeout
```

### Per task pseudocode

```python
# Task 3: recording_service.py - Browser recording with Playwright
# PATTERN: Singleton like mcp_proxy.py, use Playwright tracing

import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

class RecordingService:
    """Service for recording browser actions using Playwright."""

    _instance: "RecordingService | None" = None
    _lock = asyncio.Lock()

    def __init__(self) -> None:
        self._playwright = None
        self._browser: Browser | None = None
        self._sessions: dict[str, RecordingSession] = {}

    @classmethod
    async def get_instance(cls) -> "RecordingService":
        async with cls._lock:
            if cls._instance is None:
                cls._instance = RecordingService()
                await cls._instance._initialize()
            return cls._instance

    async def _initialize(self) -> None:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=False)

    async def start_recording(self, start_url: str = "about:blank") -> RecordingSession:
        """Start a new recording session."""
        session_id = str(uuid.uuid4())

        # Create context with tracing enabled
        context = await self._browser.new_context()
        await context.tracing.start(screenshots=True, snapshots=True, sources=True)

        page = await context.new_page()

        # Set up action listeners
        page.on("framenavigated", lambda frame: self._on_navigate(session_id, frame))
        page.on("click", lambda: self._on_click(session_id))
        # ... more event listeners

        if start_url != "about:blank":
            await page.goto(start_url)

        session = RecordingSession(
            session_id=session_id,
            status="recording",
            start_url=start_url,
        )
        self._sessions[session_id] = {
            "session": session,
            "context": context,
            "page": page,
        }
        return session

    async def stop_recording(self, session_id: str) -> RecordingSession:
        """Stop recording and extract actions from trace."""
        session_data = self._sessions.get(session_id)
        if not session_data:
            raise ValueError(f"Session {session_id} not found")

        context = session_data["context"]
        session = session_data["session"]

        # Stop tracing and get trace file
        trace_path = f"/tmp/trace-{session_id}.zip"
        await context.tracing.stop(path=trace_path)

        # Parse trace to extract actions
        actions = self._parse_trace(trace_path)
        session.actions = actions
        session.status = "stopped"

        await context.close()
        return session

    def _parse_trace(self, trace_path: str) -> list[RecordedAction]:
        """Parse Playwright trace file to extract actions."""
        # Trace is a zip containing JSON action log
        # Extract and convert to RecordedAction list
        actions = []
        # ... parsing logic
        return actions


# Task 4: skill_service.py additions - NL and recording conversion

async def create_skill_from_nl(
    self,
    name: str,
    goal: str,
    steps: str,
    *,
    project: bool = False,
) -> SkillResponse:
    """Create skill from natural language description using LLM."""
    self._validate_name(name)

    # Use LLM to generate SKILL.md content
    prompt = f"""Generate a SKILL.md file for an agent skill with:

Name: {name}
Goal: {goal}
Steps: {steps}

The SKILL.md must have YAML frontmatter with 'name' and 'description' fields,
followed by markdown instructions. Include:
- When to Use section
- Step-by-step instructions
- Best practices

Output only the SKILL.md content, no explanation."""

    # Call LLM (reuse model from config)
    model = create_model()
    response = await model.ainvoke([{"role": "user", "content": prompt}])
    content = response.content

    # Validate generated content has proper frontmatter
    if not content.startswith("---"):
        content = self._wrap_with_frontmatter(name, goal, content)

    return self.create_skill(name=name, description=goal, content=content, project=project)


def create_skill_from_recording(
    self,
    name: str,
    description: str,
    session: RecordingSession,
    *,
    project: bool = False,
) -> SkillResponse:
    """Create skill from recorded browser actions."""
    self._validate_name(name)

    # Generate SKILL.md with Playwright code
    content = self._generate_browser_skill_content(name, description, session.actions)

    return self.create_skill(name=name, description=description, content=content, project=project)


def _generate_browser_skill_content(
    self,
    name: str,
    description: str,
    actions: list[RecordedAction],
) -> str:
    """Generate SKILL.md content for browser skill."""
    # Convert actions to Playwright Python code
    code_lines = ["from playwright.sync_api import sync_playwright", "", "def run_skill():"]
    code_lines.append("    with sync_playwright() as p:")
    code_lines.append("        browser = p.chromium.launch(headless=False)")
    code_lines.append("        page = browser.new_page()")

    for action in actions:
        if action.type == ActionType.NAVIGATE:
            code_lines.append(f'        page.goto("{action.value}")')
        elif action.type == ActionType.CLICK:
            code_lines.append(f'        page.click("{action.selector}")')
        elif action.type == ActionType.FILL:
            code_lines.append(f'        page.fill("{action.selector}", "{action.value}")')
        # ... more action types

    code_lines.append("        browser.close()")

    playwright_code = "\n".join(code_lines)

    return f"""---
name: {name}
description: {description}
type: browser
---

# {name.replace("-", " ").title()}

## Description
{description}

## Recorded Actions
This skill was created by recording browser actions.

## Playwright Code
```python
{playwright_code}
```

## When to Use
- When you need to automate this specific browser workflow
- When the user requests this action

## Execution
This skill executes the recorded Playwright actions automatically.
"""


# Task 5: skill_executor.py - Skill testing

class SkillExecutor:
    """Execute skills for testing."""

    async def execute_skill(self, skill: SkillResponse) -> SkillTestResult:
        """Execute a skill and return results."""
        start_time = time.time()

        try:
            # Check if browser skill
            if self._is_browser_skill(skill.content):
                return await self._execute_browser_skill(skill)
            else:
                return await self._execute_manual_skill(skill)
        except Exception as e:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )

    def _is_browser_skill(self, content: str) -> bool:
        """Check if skill is a browser skill."""
        # Parse frontmatter and check type field
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if match:
            frontmatter = yaml.safe_load(match.group(1))
            return frontmatter.get("type") == "browser"
        return False

    async def _execute_browser_skill(self, skill: SkillResponse) -> SkillTestResult:
        """Execute browser skill using Playwright."""
        # Extract Playwright code from skill content
        code_match = re.search(r"```python\n(.*?)```", skill.content, re.DOTALL)
        if not code_match:
            return SkillTestResult(success=False, duration_ms=0, error="No Playwright code found")

        code = code_match.group(1)

        # Execute in isolated context
        start_time = time.time()
        screenshots = []

        try:
            # Use exec with captured output
            exec_globals = {"screenshots": screenshots}
            exec(code, exec_globals)

            return SkillTestResult(
                success=True,
                duration_ms=(time.time() - start_time) * 1000,
                output="Skill executed successfully",
                screenshots=screenshots,
            )
        except Exception as e:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )
```

### Integration Points
```yaml
CONFIG:
  - No new config needed, reuse existing settings

ROUTES:
  - add to: libs/deepagents-web/deepagents_web/main.py
  - pattern: "from deepagents_web.api.recording import router as recording_router"
  - pattern: "app.include_router(recording_router, prefix='/api')"

DEPENDENCIES:
  - add to: libs/deepagents-web/pyproject.toml
  - pattern: "playwright>=1.40.0"  # Already available via playwright-mcp

FRONTEND:
  - add to: libs/deepagents-web/deepagents_web/static/index.html
  - pattern: '<script src="/static/js/recording.js"></script>'
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd libs/deepagents-web
ruff check deepagents_web/ --fix
mypy deepagents_web/

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```python
# tests/test_recording_service.py
import pytest
from deepagents_web.services.recording_service import RecordingService

@pytest.mark.asyncio
async def test_start_recording():
    """Recording session starts successfully."""
    service = await RecordingService.get_instance()
    session = await service.start_recording("https://example.com")
    assert session.status == "recording"
    assert session.session_id is not None
    await service.stop_recording(session.session_id)

@pytest.mark.asyncio
async def test_stop_recording_extracts_actions():
    """Stopping recording extracts action list."""
    service = await RecordingService.get_instance()
    session = await service.start_recording("https://example.com")
    # Perform some actions...
    result = await service.stop_recording(session.session_id)
    assert result.status == "stopped"
    assert isinstance(result.actions, list)

# tests/test_skill_executor.py
import pytest
from deepagents_web.services.skill_executor import SkillExecutor
from deepagents_web.models.skill import SkillResponse

@pytest.mark.asyncio
async def test_execute_manual_skill():
    """Manual skill executes via agent."""
    executor = SkillExecutor()
    skill = SkillResponse(
        name="test-skill",
        description="Test skill",
        path="/tmp/test",
        source="user",
        content="---\nname: test-skill\ndescription: Test\n---\n# Test\nDo something.",
    )
    result = await executor.execute_skill(skill)
    assert result.duration_ms > 0

@pytest.mark.asyncio
async def test_execute_browser_skill():
    """Browser skill executes Playwright code."""
    executor = SkillExecutor()
    skill = SkillResponse(
        name="browser-test",
        description="Browser test",
        path="/tmp/test",
        source="user",
        content='''---
name: browser-test
description: Test
type: browser
---
```python
from playwright.sync_api import sync_playwright
def run_skill():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://example.com")
        browser.close()
run_skill()
```''',
    )
    result = await executor.execute_skill(skill)
    assert result.success
```

```bash
# Run and iterate until passing:
cd libs/deepagents-web
uv run pytest tests/ -v
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start the service
cd libs/deepagents-web
uv run deepagents-web

# Test NL skill creation
curl -X POST http://localhost:8000/api/skills/from-nl \
  -H "Content-Type: application/json" \
  -d '{"name": "search-google", "goal": "Search Google for a query", "steps": "1. Go to google.com\n2. Type the query\n3. Click search"}'
# Expected: {"name": "search-google", "description": "Search Google for a query", ...}

# Test skill execution
curl -X POST http://localhost:8000/api/skills/search-google/test \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: {"success": true, "duration_ms": ..., "output": "..."}

# Test recording WebSocket (use browser or wscat)
# Connect to ws://localhost:8000/api/ws/recording
# Send: {"type": "start", "start_url": "https://example.com"}
# Expected: Browser opens, actions stream back
```

## Final Validation Checklist
- [ ] All tests pass: `uv run pytest tests/ -v`
- [ ] No linting errors: `ruff check deepagents_web/`
- [ ] No type errors: `mypy deepagents_web/`
- [ ] Natural language skill creation generates valid SKILL.md
- [ ] Browser recording captures actions correctly
- [ ] Recorded skills replay deterministically
- [ ] Skill testing shows clear success/failure
- [ ] Frontend tabs work correctly
- [ ] Recording UI shows real-time actions
- [ ] Existing skill functionality unchanged
- [ ] Error cases handled gracefully

---

## Anti-Patterns to Avoid
- Don't create new patterns when existing ones work (reuse mcp_proxy.py pattern)
- Don't skip validation because "it should work"
- Don't ignore failing tests - fix them
- Don't use sync functions in async context
- Don't hardcode values that should be config
- Don't catch all exceptions - be specific
- Don't duplicate skill validation logic - import from existing code
- Don't execute untrusted code without sandboxing (browser skills)

---

## Confidence Score: 7/10

**Strengths:**
- Clear reuse of existing patterns (mcp_proxy.py, skill_service.py)
- Well-defined data models for recording
- Comprehensive task breakdown
- Detailed pseudocode for complex recording logic
- Multiple validation gates

**Risks:**
- Playwright tracing API complexity (mitigated by detailed pseudocode)
- Browser skill security (executing generated code) - needs sandboxing consideration
- Real-time WebSocket recording synchronization
- Cross-browser compatibility for recording

**Recommendations for Implementation:**
1. Start with Task 1-2 (models) to establish data structures
2. Implement recording service (Task 3) and test independently
3. Add NL creation (Task 4) - simpler than recording
4. Build skill executor (Task 5) for testing capability
5. Add API endpoints (Task 6-7) and test with curl
6. Finally, build frontend (Task 9-12) incrementally

**Security Considerations:**
- Browser skill code execution should be sandboxed
- Recording sessions should have timeouts
- Validate all user input before execution
- Consider rate limiting for recording sessions

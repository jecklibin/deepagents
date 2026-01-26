name: "Enhanced Browser Recording with Floating UI"
description: |

## Purpose
Enhance the browser recording capability in deepagents-web by implementing a floating UI panel with data capture, AI extraction, and AI form fill features, following patterns from BrowserWing.

## Core Principles
1. **Polling-based Communication**: Use global variables for JS-to-Python communication to avoid CSP issues
2. **SessionStorage Persistence**: Maintain recorded actions across page navigations
3. **Dual Selector Strategy**: Generate both CSS and XPath selectors for robust element targeting
4. **Semantic Enrichment**: Add intent, accessibility, and context metadata for self-healing selectors
5. **Global rules**: Follow all rules in AGENTS.md

---

## Goal
Implement an enhanced browser recording system with a floating UI panel that provides:
1. **Data Extract Mode** - Click elements to capture text/HTML/attributes as variables
2. **AI Extract Mode** - Select page regions for LLM-powered data extraction code generation
3. **AI Form Fill Mode** - Select forms for LLM-powered auto-fill code generation
4. Real-time action list display with delete/preview capabilities
5. Cross-page persistence of recorded actions

## Why
- **Business value**: Enable non-technical users to create browser automation skills through visual recording
- **User impact**: Reduce skill creation time from hours of manual coding to minutes of point-and-click
- **Integration**: Extends existing recording_service.py and skill_service.py
- **Problems solved**: Current recording lacks interactive data extraction and AI-assisted capabilities

## What
### User-visible behavior
- Floating draggable panel appears when recording starts
- Three mode buttons: "Data Extract", "AI Extract", "AI Form Fill"
- Real-time action list with timestamps and selectors
- Element highlighting on hover
- Stop recording button in panel
- Loading overlay during AI operations

### Technical requirements
- JavaScript injection via Playwright's `page.evaluate()`
- Polling-based communication (500ms interval) for AI requests
- SessionStorage for action persistence across navigations
- CSP bypass for localhost communication
- Dual CSS/XPath selector generation
- Semantic metadata for self-healing

### Success Criteria
- [ ] Floating panel renders correctly on any website
- [ ] Data Extract mode captures text/HTML/attributes
- [ ] AI Extract mode generates working extraction code
- [ ] AI Form Fill mode generates working form fill code
- [ ] Actions persist across page navigations
- [ ] Recording works on sites with strict CSP (Twitter, etc.)
- [ ] All existing recording tests pass
- [ ] New unit tests for floating UI features

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: examples/browserwing-main/backend/services/browser/scripts/recorder.js
  why: Complete floating UI implementation with all modes, 2968 lines
  critical: Polling pattern via window.__aiExtractionRequest__/__aiExtractionResponse__

- file: examples/browserwing-main/backend/services/browser/recorder.go
  why: Backend polling loop and AI request processing, 1136 lines
  critical: syncActionsFromBrowser() and checkAndProcessAIRequestOnPage()

- file: libs/deepagents-web/deepagents_web/services/recording_service.py
  why: Current Playwright-based recording implementation
  critical: Thread-based execution for Windows compatibility

- file: libs/deepagents-web/deepagents_web/services/skill_service.py
  why: LLM integration for script generation
  critical: generate_browser_skill() method

- url: https://playwright.dev/python/docs/evaluating
  why: JavaScript injection patterns with page.evaluate()

- docfile: examples/browserwing-main/AGENTS.md
  why: BrowserWing architecture overview
```

### Current Codebase tree
```bash
libs/deepagents-web/
├── deepagents_web/
│   ├── api/
│   │   ├── chat.py
│   │   ├── recording.py      # Recording endpoints
│   │   └── skills.py
│   ├── models/
│   │   ├── recording.py      # Recording data models
│   │   └── skill.py
│   ├── services/
│   │   ├── agent_service.py
│   │   ├── recording_service.py  # Playwright recording
│   │   ├── skill_executor.py
│   │   └── skill_service.py      # LLM script generation
│   ├── static/
│   │   ├── css/styles.css
│   │   ├── js/
│   │   │   ├── recording.js      # Frontend recording UI
│   │   │   └── skills.js
│   │   └── index.html
│   └── main.py
```

### Desired Codebase tree with files to be added
```bash
libs/deepagents-web/
├── deepagents_web/
│   ├── services/
│   │   ├── recording_service.py  # MODIFY: Add polling loop, AI request handling
│   │   ├── skill_service.py      # MODIFY: Add AI extraction/formfill generation
│   │   └── scripts/
│   │       └── recorder.js       # CREATE: Injected floating UI script
│   ├── models/
│   │   └── recording.py          # MODIFY: Add semantic action fields
```

### Known Gotchas & Library Quirks
```python
# CRITICAL: Playwright on Windows requires sync API with thread
# Cannot use async subprocess with uvicorn on Windows
# Use queue-based communication between async FastAPI and sync Playwright

# CRITICAL: CSP bypass needed for sites like Twitter
# Playwright doesn't have direct CSP bypass like go-rod
# Use page.route() to modify CSP headers OR rely on polling pattern

# CRITICAL: SessionStorage is per-origin
# Actions recorded on different origins won't share storage
# Each page navigation within same origin preserves actions

# CRITICAL: page.evaluate() returns serializable data only
# Cannot return DOM elements or functions
# Return JSON-serializable action objects
```

## Implementation Blueprint

### Data models and structure

```python
# models/recording.py - Enhanced action model with semantic fields
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ActionIntent(BaseModel):
    """Operation intent for self-healing"""
    verb: str  # click, input, select, extract
    object: str  # accessible name or description

class ActionAccessibility(BaseModel):
    """ARIA/accessibility info"""
    role: str  # button, textbox, link, etc.
    name: str  # accessible name
    value: Optional[str] = None

class ActionContext(BaseModel):
    """Surrounding context for element location"""
    nearby_text: List[str] = []
    ancestor_tags: List[str] = []
    form_hint: Optional[str] = None  # login, search, checkout

class ActionEvidence(BaseModel):
    """Recording confidence metadata"""
    confidence: float = 0.5  # 0-1 selector reliability

class RecordedAction(BaseModel):
    """Enhanced recorded action with semantic fields"""
    type: str  # click, input, select, extract_text, extract_html, execute_js, etc.
    timestamp: int
    selector: Optional[str] = None  # CSS selector
    xpath: Optional[str] = None  # XPath selector
    value: Optional[str] = None
    text: Optional[str] = None
    tag_name: Optional[str] = None

    # Extract-specific fields
    extract_type: Optional[str] = None  # text, html, attribute
    variable_name: Optional[str] = None
    attribute_name: Optional[str] = None

    # AI-generated code
    js_code: Optional[str] = None

    # Semantic fields for self-healing
    intent: Optional[ActionIntent] = None
    accessibility: Optional[ActionAccessibility] = None
    context: Optional[ActionContext] = None
    evidence: Optional[ActionEvidence] = None
```

### List of tasks to be completed

```yaml
Task 1:
CREATE libs/deepagents-web/deepagents_web/services/scripts/recorder.js:
  - Port floating UI from BrowserWing recorder.js
  - Adapt for Python/Playwright polling pattern
  - Include: createRecorderUI(), highlightElement(), getSelector()
  - Include: toggleExtractMode(), toggleAIExtractMode(), toggleAIFormFillMode()
  - Include: handleAIExtractClick(), handleAIFormFillClick()
  - Include: cleanAndSampleHTML(), enrichActionWithSemantics()
  - Use English-only UI text (no i18n placeholders)

Task 2:
MODIFY libs/deepagents-web/deepagents_web/models/recording.py:
  - Add ActionIntent, ActionAccessibility, ActionContext, ActionEvidence models
  - Enhance RecordedAction with semantic fields
  - Add extract_type, variable_name, js_code fields

Task 3:
MODIFY libs/deepagents-web/deepagents_web/services/recording_service.py:
  - Add method to load and inject recorder.js
  - Add polling loop in recording thread (500ms interval)
  - Add AI request detection and processing
  - Add response injection back to page
  - Integrate with skill_service for LLM calls

Task 4:
MODIFY libs/deepagents-web/deepagents_web/services/skill_service.py:
  - Add generate_extraction_js() method for AI Extract mode
  - Add generate_formfill_js() method for AI Form Fill mode
  - Use existing LLM integration patterns

Task 5:
MODIFY libs/deepagents-web/deepagents_web/static/js/recording.js:
  - Update to handle new action types in UI
  - Display extract and AI actions appropriately

Task 6:
CREATE tests for new functionality:
  - Test floating UI injection
  - Test selector generation
  - Test AI request/response flow
  - Test action persistence
```

### Per task pseudocode

#### Task 1: recorder.js (Injected Script)
```javascript
// Core structure - adapt from BrowserWing
(function() {
    if (window.__deepagentsRecorder__) return;
    window.__deepagentsRecorder__ = true;
    window.__recordedActions__ = [];
    window.__extractMode__ = false;
    window.__aiExtractMode__ = false;
    window.__aiFormFillMode__ = false;

    // PATTERN: Floating UI creation
    function createRecorderUI() {
        var panel = document.createElement('div');
        panel.id = '__deepagents_recorder_panel__';
        panel.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;...';

        // Header with status and action count
        // Button area: Data Extract, AI Extract, AI Form Fill
        // Action list with scroll
        // Stop recording button

        // CRITICAL: Drag functionality on header
        // CRITICAL: Prevent click events from propagating to page
    }

    // PATTERN: Dual selector generation
    function getSelector(element) {
        // Strategy 1: ID (most reliable)
        // Strategy 2: name attribute
        // Strategy 3: data-testid, aria-label
        // Strategy 4: placeholder
        // Strategy 5: text content (check uniqueness)
        // Strategy 6: Full XPath
        // Strategy 7: CSS with stable classes
        return { css: cssSelector, xpath: xpathSelector };
    }

    // PATTERN: AI request via polling
    async function handleAIExtractClick(element) {
        var cleanedHtml = cleanAndSampleHTML(element);

        // Set request for backend polling
        window.__aiExtractionRequest__ = {
            type: 'extract',
            html: cleanedHtml,
            description: 'Extract structured data from this HTML'
        };

        // Poll for response
        var result = await pollForResponse('__aiExtractionResponse__', 60000);

        if (result.success) {
            recordAction({
                type: 'execute_js',
                js_code: result.javascript,
                variable_name: 'ai_data_' + window.__recordedActions__.length
            });
        }
    }

    // Initialize
    createRecorderUI();
    createHighlightElement();

    // Event listeners for click, input, change, keydown, scroll
})();
```

#### Task 3: recording_service.py (Polling Loop)
```python
# PATTERN: Polling loop in recording thread
def _polling_loop(self, page: Page):
    """Poll for AI requests and sync actions"""
    while self._is_recording:
        try:
            # Check for AI extraction request
            request = page.evaluate("""() => {
                if (window.__aiExtractionRequest__) {
                    var req = window.__aiExtractionRequest__;
                    delete window.__aiExtractionRequest__;
                    return req;
                }
                return null;
            }""")

            if request:
                self._handle_ai_request(page, request)

            # Sync actions from browser
            actions = page.evaluate("""() => {
                try {
                    var saved = sessionStorage.getItem('__deepagents_actions__');
                    if (saved) return JSON.parse(saved);
                } catch(e) {}
                return window.__recordedActions__ || [];
            }""")

            self._sync_actions(actions)

            time.sleep(0.5)  # 500ms polling interval
        except Exception as e:
            logger.warning(f"Polling error: {e}")

def _handle_ai_request(self, page: Page, request: dict):
    """Process AI extraction/formfill request"""
    req_type = request.get('type', 'extract')
    html = request.get('html', '')

    try:
        if req_type == 'formfill':
            result = self.skill_service.generate_formfill_js(html)
        else:
            result = self.skill_service.generate_extraction_js(html)

        # Inject response back to page
        page.evaluate(f"""() => {{
            window.__aiExtractionResponse__ = {{
                success: true,
                javascript: {json.dumps(result.javascript)}
            }};
        }}""")
    except Exception as e:
        page.evaluate(f"""() => {{
            window.__aiExtractionResponse__ = {{
                success: false,
                error: {json.dumps(str(e))}
            }};
        }}""")
```

#### Task 4: skill_service.py (LLM Methods)
```python
# PATTERN: LLM-powered code generation
async def generate_extraction_js(self, html: str, user_prompt: str = "") -> dict:
    """Generate JavaScript to extract data from HTML"""
    prompt = f"""Given this HTML snippet, generate JavaScript code that extracts
structured data and returns it as a JSON object.

HTML:
{html[:15000]}  # Truncate to avoid token limits

{f"User requirements: {user_prompt}" if user_prompt else ""}

Requirements:
- Return an immediately-invoked function expression (IIFE)
- Extract all meaningful data (text, links, images, tables)
- Return a clean JSON object
- Handle missing elements gracefully
"""

    response = await self.llm.ainvoke(prompt)
    js_code = self._extract_code_block(response.content)

    return {"javascript": js_code, "used_model": self.model_name}

async def generate_formfill_js(self, html: str, user_prompt: str = "") -> dict:
    """Generate JavaScript to fill form fields"""
    prompt = f"""Given this form HTML, generate JavaScript code that fills
the form with realistic test data.

HTML:
{html[:15000]}

{f"User requirements: {user_prompt}" if user_prompt else ""}

Requirements:
- Return an IIFE that fills all visible form fields
- Use realistic fake data (names, emails, addresses)
- Trigger input/change events after setting values
- Return summary of filled fields
"""

    response = await self.llm.ainvoke(prompt)
    js_code = self._extract_code_block(response.content)

    return {"javascript": js_code, "used_model": self.model_name}
```

### Integration Points
```yaml
RECORDING_SERVICE:
  - Load recorder.js from services/scripts/recorder.js
  - Inject on recording start after page load
  - Start polling thread alongside recording thread

SKILL_SERVICE:
  - Add generate_extraction_js() method
  - Add generate_formfill_js() method
  - Reuse existing LLM client

MODELS:
  - Extend RecordedAction with new fields
  - Add semantic metadata models

FRONTEND:
  - Update action display for new types
  - Show AI-generated code in preview
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd libs/deepagents-web
ruff check deepagents_web/services/recording_service.py --fix
ruff check deepagents_web/services/skill_service.py --fix
ruff check deepagents_web/models/recording.py --fix

# Verify JavaScript syntax
node --check deepagents_web/services/scripts/recorder.js

# Expected: No errors
```

### Level 2: Unit Tests
```python
# tests/test_recording_enhanced.py
import pytest
from deepagents_web.services.recording_service import RecordingService

def test_recorder_js_loads():
    """Verify recorder.js can be loaded"""
    service = RecordingService()
    script = service._load_recorder_script()
    assert "__deepagentsRecorder__" in script
    assert "createRecorderUI" in script

def test_selector_generation():
    """Test dual selector generation in JS"""
    # Use Playwright to test selector generation
    pass

def test_ai_request_polling():
    """Test AI request detection and response"""
    pass

def test_action_persistence():
    """Test SessionStorage persistence across navigations"""
    pass
```

```bash
# Run and iterate until passing:
cd libs/deepagents-web
pytest tests/test_recording_enhanced.py -v
```

### Level 3: Integration Test
```bash
# Start the web service
cd libs/deepagents-web
uv run deepagents-web

# Test recording with floating UI
# 1. Open http://localhost:8000
# 2. Start recording on a test site
# 3. Verify floating panel appears
# 4. Test Data Extract mode
# 5. Test AI Extract mode
# 6. Test AI Form Fill mode
# 7. Stop recording and verify actions saved
```

## Final Validation Checklist
- [ ] All tests pass: `pytest tests/ -v`
- [ ] No linting errors: `ruff check deepagents_web/`
- [ ] Floating panel renders on test sites
- [ ] Data Extract captures text/HTML/attributes
- [ ] AI Extract generates working code
- [ ] AI Form Fill generates working code
- [ ] Actions persist across page navigations
- [ ] Recording works on Twitter (strict CSP)
- [ ] Stop recording saves all actions
- [ ] Generated skills execute successfully

---

## Anti-Patterns to Avoid
- ❌ Don't use direct fetch() calls from injected JS (CSP blocks)
- ❌ Don't store actions only in memory (lost on navigation)
- ❌ Don't use only CSS selectors (XPath more reliable for text)
- ❌ Don't block the main thread during AI calls (use polling)
- ❌ Don't ignore Windows compatibility (use sync Playwright)
- ❌ Don't hardcode UI text (prepare for future i18n)

---

## Confidence Score: 8/10

**Strengths:**
- Complete reference implementation available (BrowserWing)
- Clear polling pattern avoids CSP issues
- Existing LLM integration in skill_service.py
- Well-defined data models

**Risks:**
- Playwright CSP handling differs from go-rod
- Thread synchronization complexity
- LLM prompt tuning may need iteration

**Mitigation:**
- Test on strict CSP sites early (Twitter, GitHub)
- Use queue-based thread communication (existing pattern)
- Include example outputs in LLM prompts

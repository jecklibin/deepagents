name: "DeepAgents Web UI Enhancements - Skill Delete, HITL Interrupt, Chat Progress Display"
description: |

## Purpose
Enhance the deepagents-web frontend with three key features:
1. Skill deletion capability in the UI
2. Human-in-the-loop task interruption (user can interrupt and provide new instructions mid-task)
3. Improved chat progress display with collapsible tool calls and thinking indicators (Cherry Studio style)

---

## Goal
Enhance the deepagents-web UI to:
1. Add a delete button to skill cards for removing skills
2. Allow users to interrupt running tasks and inject additional instructions
3. Display task progress with collapsible sections for tool calls, thinking indicators, and streaming status

## Why
- **Skill Management Completeness**: Delete capability completes the CRUD operations for skills
- **User Control**: Task interruption gives users control over long-running agent tasks
- **Better UX**: Progress display helps users understand what the agent is doing and reduces perceived wait time
- **Transparency**: Collapsible tool calls show agent reasoning without cluttering the interface

## What

### User-Visible Behavior
1. **Skill Deletion**
   - Delete button on each skill card
   - Confirmation dialog before deletion
   - Skill removed from list after successful deletion

2. **Task Interruption (HITL)**
   - "Stop" button appears during task execution
   - User can click to interrupt the current task
   - Input field becomes active for new instructions
   - Agent receives interruption message and continues with new context

3. **Enhanced Chat Progress Display**
   - Thinking indicator with animated dots during agent processing
   - Collapsible tool call sections showing tool name, args, and result
   - Progress status bar showing current operation
   - Streaming text with cursor indicator
   - Todo list with visual progress (checkmarks, in-progress spinner)

### Success Criteria
- [ ] Delete button visible on skill cards
- [ ] Delete confirmation dialog works
- [ ] Skills are deleted via API and removed from UI
- [ ] Stop button appears during task execution
- [ ] Clicking stop interrupts the agent and allows new input
- [ ] Agent continues with new instructions after interrupt
- [ ] Thinking indicator shows during agent processing
- [ ] Tool calls are displayed in collapsible sections
- [ ] Tool results are shown when available
- [ ] Todo list updates in real-time with visual indicators

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: libs/deepagents-web/deepagents_web/static/js/skills.js
  why: Contains deleteSkill() method already implemented but not connected to UI

- file: libs/deepagents-web/deepagents_web/static/js/chat.js
  why: Current chat implementation - need to add interrupt handling and progress display

- file: libs/deepagents-web/deepagents_web/static/index.html
  why: Current HTML structure - need to add delete buttons and progress elements

- file: libs/deepagents-web/deepagents_web/static/css/styles.css
  why: Current styling - need to add styles for new UI elements

- file: libs/deepagents-web/deepagents_web/api/chat.py
  why: WebSocket endpoint - need to add interrupt message handling

- file: libs/deepagents-web/deepagents_web/services/agent_service.py
  why: Agent streaming service - need to handle task cancellation

- file: libs/deepagents-web/deepagents_web/models/chat.py
  why: WebSocket message models - need to add interrupt message type

- file: libs/deepagents-cli/deepagents_cli/textual_adapter.py
  why: CLI interrupt handling pattern - shows how to cancel and resume with new instructions

- url: https://github.com/CherryHQ/cherry-studio
  why: Reference for chat progress UI patterns (collapsible thinking, tool calls)
```

### Current Codebase tree
```bash
libs/deepagents-web/
├── deepagents_web/
│   ├── api/
│   │   ├── chat.py           # WebSocket endpoint
│   │   └── skills.py         # REST skill endpoints (DELETE exists)
│   ├── services/
│   │   ├── agent_service.py  # Agent streaming
│   │   └── skill_service.py  # Skill CRUD (delete_skill exists)
│   ├── models/
│   │   ├── chat.py           # WebSocket message models
│   │   └── skill.py          # Skill models
│   └── static/
│       ├── index.html        # Main HTML
│       ├── css/styles.css    # Styling
│       └── js/
│           ├── app.js        # Main app
│           ├── chat.js       # Chat WebSocket
│           └── skills.js     # Skills UI (deleteSkill exists)
```

### Desired Changes
```bash
# Files to MODIFY (not create):
libs/deepagents-web/deepagents_web/static/js/skills.js
  - ADD delete button to skill card rendering
  - CONNECT deleteSkill() to button click

libs/deepagents-web/deepagents_web/static/js/chat.js
  - ADD interrupt/stop button handling
  - ADD thinking indicator display
  - ADD collapsible tool call rendering
  - ADD progress status display
  - MODIFY message rendering for enhanced display

libs/deepagents-web/deepagents_web/static/index.html
  - ADD stop button to input container
  - ADD thinking indicator element
  - ADD progress status bar element

libs/deepagents-web/deepagents_web/static/css/styles.css
  - ADD styles for delete button
  - ADD styles for stop button
  - ADD styles for thinking indicator
  - ADD styles for collapsible tool calls
  - ADD styles for progress status

libs/deepagents-web/deepagents_web/api/chat.py
  - ADD interrupt message type handling
  - ADD cancel_task endpoint or message

libs/deepagents-web/deepagents_web/services/agent_service.py
  - ADD task cancellation support
  - ADD interrupt message injection

libs/deepagents-web/deepagents_web/models/chat.py
  - ADD "interrupt_task" message type
  - ADD "status" message type for progress
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: deleteSkill() already exists in skills.js (line 448-464)
# Just need to add a delete button to the skill card and wire it up

# CRITICAL: The backend DELETE /api/skills/{name} endpoint already exists
# See api/skills.py:83-90 - returns 204 on success

# CRITICAL: Task cancellation in LangGraph uses asyncio.CancelledError
# See textual_adapter.py:523-542 for pattern:
# - Catch CancelledError
# - Mark pending tools as rejected
# - Append cancellation message to agent state
# - Agent can then continue with new instructions

# CRITICAL: WebSocket messages use type field for routing
# Current types: text, tool_call, interrupt, todo, error, done
# Need to add: status (for progress), thinking (for indicator)

# CRITICAL: Agent state can be updated with aupdate_state()
# See textual_adapter.py:536-541:
# cancellation_msg = HumanMessage(content="[SYSTEM] Task interrupted...")
# await agent.aupdate_state(config, {"messages": [cancellation_msg]})

# CRITICAL: CSS uses CSS variables for theming
# --primary: #10b981 (green)
# --danger: #ef4444 (red)
# --thinking: #34d399 (light green)
# --tool: #fbbf24 (yellow)
```

## Implementation Blueprint

### Data models and structure

```python
# models/chat.py - ADD new message types
class WebSocketMessage(BaseModel):
    """A WebSocket message sent to the client."""
    type: Literal[
        "text", "tool_call", "tool_result", "interrupt", "todo",
        "error", "done", "status", "thinking"  # ADD these
    ]
    data: Any

class UserMessage(BaseModel):
    """User message received from WebSocket."""
    type: Literal["message", "interrupt_response", "cancel_task"]  # ADD cancel_task
    content: str | None = None
    data: dict[str, Any] | None = None

class StatusUpdate(BaseModel):
    """Status update for progress display."""
    status: Literal["thinking", "executing", "waiting", "done"]
    message: str | None = None
    tool_name: str | None = None
```

### List of tasks to be completed

```yaml
Task 1: Add delete button to skill cards
MODIFY libs/deepagents-web/deepagents_web/static/js/skills.js:
  - FIND: renderSkills() method (line 115-145)
  - ADD: Delete button next to Test button in skill-card-header
  - ADD: Click handler that calls deleteSkill(skill.name)
  - PATTERN: Follow existing btn-test button pattern

Task 2: Add delete button styling
MODIFY libs/deepagents-web/deepagents_web/static/css/styles.css:
  - ADD: .btn-delete class with danger color
  - ADD: .btn-delete:hover with darker danger
  - PATTERN: Follow existing .btn-test styling

Task 3: Add stop button to chat input
MODIFY libs/deepagents-web/deepagents_web/static/index.html:
  - FIND: input-container div (line 28-31)
  - ADD: Stop button with id="stop-btn" (hidden by default)
  - ADD: Thinking indicator div with id="thinking-indicator"
  - ADD: Status bar div with id="status-bar"

Task 4: Add stop button and progress styling
MODIFY libs/deepagents-web/deepagents_web/static/css/styles.css:
  - ADD: #stop-btn styling (danger color, hidden by default)
  - ADD: #thinking-indicator with animated dots
  - ADD: #status-bar styling
  - ADD: .tool-call-collapsible styling
  - ADD: .tool-call-header and .tool-call-content styling
  - ADD: @keyframes for thinking animation

Task 5: Add cancel_task message type to models
MODIFY libs/deepagents-web/deepagents_web/models/chat.py:
  - ADD: "cancel_task" to UserMessage.type Literal
  - ADD: "status", "thinking" to WebSocketMessage.type Literal

Task 6: Add task cancellation to agent service
MODIFY libs/deepagents-web/deepagents_web/services/agent_service.py:
  - ADD: cancel_task() method to AgentSession class
  - ADD: _is_cancelled flag to track cancellation state
  - ADD: inject_interrupt_message() to add user message to state
  - PATTERN: Follow textual_adapter.py cancellation pattern

Task 7: Add cancel handling to WebSocket endpoint
MODIFY libs/deepagents-web/deepagents_web/api/chat.py:
  - ADD: Handle "cancel_task" message type
  - ADD: Call session.cancel_task() when received
  - ADD: Send status updates during streaming

Task 8: Implement chat.js interrupt handling
MODIFY libs/deepagents-web/deepagents_web/static/js/chat.js:
  - ADD: stopBtn element reference
  - ADD: isRunning state flag
  - ADD: showStopButton() / hideStopButton() methods
  - ADD: sendCancelTask() method
  - ADD: Stop button click handler
  - MODIFY: sendMessage() to show stop button
  - MODIFY: finishMessage() to hide stop button

Task 9: Implement enhanced message rendering
MODIFY libs/deepagents-web/deepagents_web/static/js/chat.js:
  - ADD: showThinking() / hideThinking() methods
  - ADD: updateStatus(message) method
  - ADD: renderCollapsibleToolCall(data) method
  - MODIFY: showToolCall() to use collapsible rendering
  - MODIFY: handleMessage() to handle status/thinking types
  - ADD: Tool result display in collapsible section

Task 10: Add thinking indicator animation
MODIFY libs/deepagents-web/deepagents_web/static/css/styles.css:
  - ADD: .thinking-indicator with flex layout
  - ADD: .thinking-dot with animation
  - ADD: @keyframes thinking-bounce animation
  - ADD: Staggered animation delays for dots
```

### Per task pseudocode

```javascript
// Task 1: skills.js - Add delete button to skill cards
renderSkills(skills) {
    // ... existing code ...
    skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `
            <div class="skill-card-header">
                <h4>${skill.name}</h4>
                <div class="skill-card-actions">
                    <button class="btn-small btn-test" data-name="${skill.name}">Test</button>
                    <button class="btn-small btn-delete" data-name="${skill.name}">Delete</button>
                </div>
            </div>
            <p>${skill.description}</p>
            <span class="skill-source ${skill.source}">${skill.source}</span>
        `;
        // ... existing click handlers ...
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSkill(skill.name);
        });
        this.skillsListEl.appendChild(card);
    });
}
```

```javascript
// Task 8-9: chat.js - Interrupt handling and enhanced display
class ChatManager {
    constructor() {
        // ... existing ...
        this.stopBtn = document.getElementById('stop-btn');
        this.thinkingIndicator = document.getElementById('thinking-indicator');
        this.statusBar = document.getElementById('status-bar');
        this.isRunning = false;
        this.currentTaskId = null;

        this.stopBtn.addEventListener('click', () => this.cancelTask());
    }

    sendMessage() {
        // ... existing send logic ...
        this.isRunning = true;
        this.showStopButton();
        this.showThinking();
    }

    cancelTask() {
        if (!this.isRunning || !this.ws) return;

        this.ws.send(JSON.stringify({
            type: 'cancel_task',
            data: {}
        }));

        this.hideThinking();
        this.updateStatus('Task interrupted. Enter new instructions...');
        // Keep input enabled for new instructions
        this.sendBtn.disabled = false;
        this.isRunning = false;
    }

    showThinking() {
        this.thinkingIndicator.classList.remove('hidden');
        this.thinkingIndicator.innerHTML = `
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
        `;
    }

    hideThinking() {
        this.thinkingIndicator.classList.add('hidden');
    }

    updateStatus(message) {
        this.statusBar.textContent = message;
        this.statusBar.classList.remove('hidden');
    }

    renderCollapsibleToolCall(data) {
        const toolEl = document.createElement('div');
        toolEl.className = 'tool-call-collapsible';
        toolEl.innerHTML = `
            <div class="tool-call-header" onclick="this.parentElement.classList.toggle('expanded')">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">${data.name}</span>
                <span class="tool-chevron">▶</span>
            </div>
            <div class="tool-call-content">
                <pre>${JSON.stringify(data.args, null, 2)}</pre>
                <div class="tool-result"></div>
            </div>
        `;
        this.messagesEl.appendChild(toolEl);
        this.scrollToBottom();
        return toolEl;
    }

    handleMessage(msg) {
        switch (msg.type) {
            // ... existing cases ...
            case 'status':
                this.updateStatus(msg.data.message);
                break;
            case 'thinking':
                if (msg.data.active) {
                    this.showThinking();
                } else {
                    this.hideThinking();
                }
                break;
        }
    }

    finishMessage() {
        // ... existing ...
        this.isRunning = false;
        this.hideStopButton();
        this.hideThinking();
        this.statusBar.classList.add('hidden');
    }

    showStopButton() {
        this.stopBtn.classList.remove('hidden');
        this.sendBtn.classList.add('hidden');
    }

    hideStopButton() {
        this.stopBtn.classList.add('hidden');
        this.sendBtn.classList.remove('hidden');
    }
}
```

```python
# Task 6: agent_service.py - Task cancellation
class AgentSession:
    def __init__(self, ...):
        # ... existing ...
        self._cancel_event = asyncio.Event()
        self._current_task: asyncio.Task | None = None

    def cancel_task(self) -> None:
        """Cancel the current running task."""
        self._cancel_event.set()
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()

    async def inject_interrupt_message(self, message: str) -> None:
        """Inject an interrupt message into the agent state."""
        from langchain_core.messages import HumanMessage
        interrupt_msg = HumanMessage(
            content=f"[SYSTEM] Task interrupted by user. {message}"
        )
        await self.agent.aupdate_state(
            self.config,
            {"messages": [interrupt_msg]}
        )

    def reset_cancel(self) -> None:
        """Reset cancellation state for new task."""
        self._cancel_event.clear()
```

```python
# Task 7: chat.py - Handle cancel_task message
@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, agent: str = "agent") -> None:
    # ... existing setup ...

    try:
        while True:
            data = await websocket.receive_json()
            msg = UserMessage(**data)

            if msg.type == "message" and msg.content:
                session.reset_cancel()
                # Send thinking status
                await websocket.send_json(
                    WebSocketMessage(type="thinking", data={"active": True}).model_dump()
                )
                async for ws_msg in service.stream_response(session, msg.content):
                    await websocket.send_json(ws_msg.model_dump())
                await websocket.send_json(
                    WebSocketMessage(type="thinking", data={"active": False}).model_dump()
                )
                await websocket.send_json(
                    WebSocketMessage(type="done", data=None).model_dump()
                )

            elif msg.type == "cancel_task":
                session.cancel_task()
                await session.inject_interrupt_message(
                    "Previous operation was cancelled. Awaiting new instructions."
                )
                await websocket.send_json(
                    WebSocketMessage(
                        type="status",
                        data={"status": "cancelled", "message": "Task cancelled"}
                    ).model_dump()
                )

            elif msg.type == "interrupt_response" and msg.data:
                # ... existing HITL handling ...
```

### Integration Points
```yaml
HTML:
  - add to: libs/deepagents-web/deepagents_web/static/index.html
  - location: Inside .input-container div
  - pattern: '<button id="stop-btn" class="stop-btn hidden">Stop</button>'
  - pattern: '<div id="thinking-indicator" class="thinking-indicator hidden"></div>'
  - pattern: '<div id="status-bar" class="status-bar hidden"></div>'

CSS:
  - add to: libs/deepagents-web/deepagents_web/static/css/styles.css
  - pattern: ".btn-delete { background: var(--danger); ... }"
  - pattern: ".stop-btn { background: var(--danger); ... }"
  - pattern: ".thinking-indicator { display: flex; gap: 4px; ... }"
  - pattern: ".tool-call-collapsible { ... }"

MODELS:
  - add to: libs/deepagents-web/deepagents_web/models/chat.py
  - pattern: 'type: Literal[..., "cancel_task"]'
  - pattern: 'type: Literal[..., "status", "thinking"]'
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd libs/deepagents-web
ruff check deepagents_web/ --fix
mypy deepagents_web/

# For JavaScript, check browser console for errors
# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Manual Testing
```bash
# Start the service
cd libs/deepagents-web
uv run deepagents-web

# Test 1: Skill Deletion
# 1. Navigate to Skills tab
# 2. Create a test skill
# 3. Click Delete button on the skill card
# 4. Confirm deletion in dialog
# Expected: Skill is removed from list

# Test 2: Task Interruption
# 1. Navigate to Chat tab
# 2. Send a message that triggers a long task (e.g., "Search for files in the project")
# 3. Click Stop button while agent is working
# 4. Enter new instructions
# Expected: Agent acknowledges interruption and continues with new instructions

# Test 3: Progress Display
# 1. Send a message that triggers tool calls
# 2. Observe thinking indicator during processing
# 3. Observe collapsible tool call sections
# 4. Click to expand/collapse tool details
# Expected: Smooth animations, clear progress indication
```

### Level 3: Integration Test
```bash
# Test WebSocket cancel message
# Using wscat or browser DevTools:
wscat -c ws://localhost:8000/api/ws/chat

# Send message
{"type": "message", "content": "List all files in the current directory"}

# While streaming, send cancel
{"type": "cancel_task", "data": {}}

# Expected: Receive status message with cancelled status
# Then send new message and verify agent continues
```

## Final Validation Checklist
- [ ] Delete button visible on all skill cards
- [ ] Delete confirmation dialog appears
- [ ] Skills are deleted and removed from UI
- [ ] Stop button appears during task execution
- [ ] Stop button hidden when not running
- [ ] Clicking stop cancels the current task
- [ ] Agent can continue with new instructions after cancel
- [ ] Thinking indicator animates during processing
- [ ] Tool calls display in collapsible sections
- [ ] Tool calls can be expanded/collapsed
- [ ] Status bar shows current operation
- [ ] No JavaScript console errors
- [ ] No Python linting errors
- [ ] Responsive on different screen sizes

---

## Anti-Patterns to Avoid
- Don't create new delete endpoint - it already exists
- Don't create new deleteSkill() method - it already exists in skills.js
- Don't block the WebSocket during cancellation
- Don't lose agent context on cancellation - inject message to state
- Don't use inline styles - use CSS classes
- Don't hardcode colors - use CSS variables
- Don't forget to handle edge cases (cancel when not running, etc.)

---

## Confidence Score: 8/10

**Strengths:**
- Backend delete functionality already exists - just need UI wiring
- Clear patterns from CLI for task cancellation
- Well-defined WebSocket message protocol
- Existing CSS variable system for consistent styling

**Risks:**
- WebSocket cancellation timing (mitigated by cancel event pattern)
- Agent state consistency after cancel (mitigated by message injection)
- JavaScript animation performance (mitigated by CSS animations)

**Recommendations for Implementation:**
1. Start with Task 1-2 (skill deletion) - simplest, backend ready
2. Then Task 3-4 (HTML/CSS structure for progress)
3. Then Task 5-7 (backend cancel support)
4. Finally Task 8-10 (frontend cancel and progress display)
5. Test each feature independently before integration

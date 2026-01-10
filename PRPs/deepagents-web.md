name: "DeepAgents Web Service & Frontend"
description: |

## Purpose
Build a web service and frontend interface on top of deepagents-cli, enabling users to interact with deepagents through a browser-based chat interface with skill management capabilities.

---

## Goal
Create a web application (`deepagents-web`) that:
1. Provides a real-time chat interface for interacting with deepagents
2. Maintains interaction experience consistent with deepagents-cli
3. Enables skill management (create, edit, delete) through the frontend UI

## Why
- **User Accessibility**: Web interface removes CLI barrier for non-technical users
- **Collaboration**: Multiple users can access the same agent instance
- **Skill Management**: Visual skill editor improves discoverability and ease of use
- **Integration**: Web API enables integration with other tools and workflows

## What

### User-Visible Behavior
1. **Chat Interface**
   - Real-time streaming responses (like CLI)
   - Tool execution visualization with approval workflow
   - Todo list rendering
   - File operation previews
   - Markdown rendering for agent responses

2. **Skill Management UI**
   - List all skills (user + project)
   - Create new skills with template
   - Edit skill SKILL.md content
   - Delete skills
   - View skill details and supporting files

### Success Criteria
- [ ] WebSocket-based real-time chat with streaming responses
- [ ] Tool approval workflow (approve/reject/auto-approve)
- [ ] Todo list display and updates
- [ ] Skill CRUD operations via REST API
- [ ] Frontend renders markdown and code blocks
- [ ] Session persistence across page reloads
- [ ] Error handling with user-friendly messages

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: libs/deepagents-cli/deepagents_cli/agent.py
  why: Core agent creation logic - create_cli_agent() function to reuse

- file: libs/deepagents-cli/deepagents_cli/execution.py
  why: Streaming and HITL patterns - execute_task() shows how to stream agent responses

- file: libs/deepagents-cli/deepagents_cli/skills/load.py
  why: Skill loading and metadata parsing - SkillMetadata TypedDict schema

- file: libs/deepagents-cli/deepagents_cli/skills/commands.py
  why: Skill CRUD operations - _list(), _create(), _info() functions

- file: libs/deepagents-cli/deepagents_cli/config.py
  why: Settings class and environment configuration

- file: libs/deepagents/deepagents/graph.py
  why: create_deep_agent() core function

- url: https://fastapi.tiangolo.com/advanced/websockets/
  why: FastAPI WebSocket implementation patterns

- url: https://github.com/sheikhhanif/LangGraph_Streaming
  why: LangGraph + FastAPI + WebSocket streaming example

- url: https://docs.langchain.com/oss/python/deepagents/overview
  why: DeepAgents documentation
```

### Current Codebase tree
```bash
libs/
├── deepagents/                    # Core agent library
│   └── deepagents/
│       ├── graph.py               # create_deep_agent()
│       ├── backends/              # Backend implementations
│       └── middleware/            # Middleware system
├── deepagents-cli/                # CLI implementation
│   └── deepagents_cli/
│       ├── main.py                # CLI entry point
│       ├── agent.py               # create_cli_agent()
│       ├── execution.py           # execute_task() streaming
│       ├── config.py              # Settings, SessionState
│       ├── skills/                # Skills system
│       │   ├── load.py            # SkillMetadata, list_skills()
│       │   ├── commands.py        # CLI skill commands
│       │   └── middleware.py      # SkillsMiddleware
│       └── ui.py                  # UI rendering utilities
```

### Desired Codebase tree with files to be added
```bash
libs/
├── deepagents-web/                # NEW: Web service package
│   ├── pyproject.toml             # Package config with FastAPI deps
│   ├── README.md                  # Documentation
│   └── deepagents_web/
│       ├── __init__.py
│       ├── main.py                # FastAPI app entry point
│       ├── config.py              # Web-specific settings
│       ├── api/
│       │   ├── __init__.py
│       │   ├── chat.py            # WebSocket chat endpoint
│       │   ├── skills.py          # REST skill management endpoints
│       │   └── sessions.py        # Session management
│       ├── services/
│       │   ├── __init__.py
│       │   ├── agent_service.py   # Agent creation and execution
│       │   └── skill_service.py   # Skill CRUD operations
│       ├── models/
│       │   ├── __init__.py
│       │   ├── chat.py            # Pydantic models for chat
│       │   └── skill.py           # Pydantic models for skills
│       └── static/                # Frontend assets
│           ├── index.html         # Main HTML page
│           ├── css/
│           │   └── styles.css     # Styling
│           └── js/
│               ├── app.js         # Main application logic
│               ├── chat.js        # Chat WebSocket handling
│               └── skills.js      # Skill management UI
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: deepagents uses async streaming with astream()
# The agent.astream() returns chunks in format: (namespace, stream_mode, data)
# See execution.py:389-395 for proper unpacking

# CRITICAL: HITL (Human-in-the-Loop) uses LangGraph interrupts
# When interrupt_on is configured, agent pauses and returns __interrupt__ in updates
# Must handle HITLRequest/HITLResponse for tool approval workflow

# CRITICAL: Skills use YAML frontmatter in SKILL.md files
# Schema: name (required), description (required), path, source
# See SkillMetadata TypedDict in skills/load.py

# CRITICAL: Settings class handles environment detection
# Use Settings.from_environment() to get proper paths
# skills_dir = settings.ensure_user_skills_dir(agent_name)

# CRITICAL: WebSocket must handle multiple message types
# - text chunks (streaming response)
# - tool_call events (show tool execution)
# - interrupt events (HITL approval)
# - todo updates (render todo list)
# - error events (handle gracefully)

# CRITICAL: Use python-dotenv and load_dotenv() for env vars
# Already used in config.py - follow same pattern
```

## Implementation Blueprint

### Data models and structure

```python
# models/chat.py - Pydantic models for WebSocket messages
from pydantic import BaseModel
from typing import Literal, Any

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class WebSocketMessage(BaseModel):
    type: Literal["text", "tool_call", "tool_result", "interrupt", "todo", "error", "done"]
    data: Any

class InterruptRequest(BaseModel):
    interrupt_id: str
    tool_name: str
    description: str
    args: dict[str, Any]

class InterruptResponse(BaseModel):
    interrupt_id: str
    decision: Literal["approve", "reject"]
    message: str | None = None

# models/skill.py - Pydantic models for skills
class SkillCreate(BaseModel):
    name: str  # lowercase alphanumeric with hyphens
    description: str
    content: str | None = None  # Full SKILL.md content

class SkillUpdate(BaseModel):
    description: str | None = None
    content: str  # Full SKILL.md content

class SkillResponse(BaseModel):
    name: str
    description: str
    path: str
    source: Literal["user", "project"]
    content: str | None = None  # Full content when requested
```

### List of tasks to be completed

```yaml
Task 1:
CREATE libs/deepagents-web/pyproject.toml:
  - MIRROR pattern from: libs/deepagents-cli/pyproject.toml
  - ADD dependencies: fastapi, uvicorn, websockets, python-multipart
  - KEEP deepagents dependency
  - ADD entry point: deepagents-web = "deepagents_web:main"

Task 2:
CREATE libs/deepagents-web/deepagents_web/__init__.py:
  - Export main() function
  - Export app for uvicorn

Task 3:
CREATE libs/deepagents-web/deepagents_web/config.py:
  - MIRROR pattern from: libs/deepagents-cli/deepagents_cli/config.py
  - REUSE Settings class import from deepagents_cli
  - ADD WebSettings for web-specific config (host, port, cors)

Task 4:
CREATE libs/deepagents-web/deepagents_web/models/chat.py:
  - Define ChatMessage, WebSocketMessage, InterruptRequest, InterruptResponse
  - Use Pydantic v2 patterns

Task 5:
CREATE libs/deepagents-web/deepagents_web/models/skill.py:
  - Define SkillCreate, SkillUpdate, SkillResponse
  - MIRROR SkillMetadata from skills/load.py

Task 6:
CREATE libs/deepagents-web/deepagents_web/services/skill_service.py:
  - REUSE list_skills() from deepagents_cli.skills.load
  - Implement create_skill(), update_skill(), delete_skill()
  - MIRROR validation from skills/commands.py

Task 7:
CREATE libs/deepagents-web/deepagents_web/services/agent_service.py:
  - REUSE create_cli_agent() from deepagents_cli.agent
  - Implement async generator for streaming responses
  - Handle HITL interrupts and resume

Task 8:
CREATE libs/deepagents-web/deepagents_web/api/skills.py:
  - REST endpoints: GET /skills, POST /skills, GET /skills/{name}, PUT /skills/{name}, DELETE /skills/{name}
  - Use skill_service for operations

Task 9:
CREATE libs/deepagents-web/deepagents_web/api/chat.py:
  - WebSocket endpoint: /ws/chat
  - Handle message streaming
  - Handle HITL interrupts
  - Send todo updates

Task 10:
CREATE libs/deepagents-web/deepagents_web/api/sessions.py:
  - Session management endpoints
  - GET /sessions - list sessions
  - POST /sessions - create session
  - DELETE /sessions/{id} - end session

Task 11:
CREATE libs/deepagents-web/deepagents_web/main.py:
  - FastAPI app setup
  - Include routers
  - Static file serving
  - CORS configuration
  - CLI entry point

Task 12:
CREATE libs/deepagents-web/deepagents_web/static/index.html:
  - Chat interface layout
  - Skill management panel
  - Todo list display area

Task 13:
CREATE libs/deepagents-web/deepagents_web/static/css/styles.css:
  - MIRROR color scheme from deepagents_cli/config.py COLORS
  - Chat bubble styling
  - Tool execution visualization
  - Responsive layout

Task 14:
CREATE libs/deepagents-web/deepagents_web/static/js/chat.js:
  - WebSocket connection management
  - Message rendering with markdown
  - Tool approval UI
  - Streaming text display

Task 15:
CREATE libs/deepagents-web/deepagents_web/static/js/skills.js:
  - Skill list rendering
  - Create/edit/delete modals
  - SKILL.md editor with preview

Task 16:
CREATE libs/deepagents-web/deepagents_web/static/js/app.js:
  - Main application initialization
  - Tab/panel management
  - Session handling
```

### Per task pseudocode

```python
# Task 7: agent_service.py - Core streaming logic
# PATTERN: Follow execution.py streaming but yield WebSocket messages

async def stream_agent_response(
    user_input: str,
    agent: Pregel,
    session_state: SessionState,
    config: dict,
) -> AsyncGenerator[WebSocketMessage, None]:
    """Stream agent responses as WebSocket messages."""
    stream_input = {"messages": [{"role": "user", "content": user_input}]}

    async for chunk in agent.astream(
        stream_input,
        stream_mode=["messages", "updates"],
        subgraphs=True,
        config=config,
    ):
        # PATTERN: Unpack like execution.py:396-400
        if not isinstance(chunk, tuple) or len(chunk) != 3:
            continue
        _namespace, stream_mode, data = chunk

        if stream_mode == "updates":
            # Check for interrupts (HITL)
            if "__interrupt__" in data:
                for interrupt in data["__interrupt__"]:
                    yield WebSocketMessage(
                        type="interrupt",
                        data=InterruptRequest(
                            interrupt_id=interrupt.id,
                            tool_name=interrupt.value["action_requests"][0]["name"],
                            description=interrupt.value["action_requests"][0].get("description", ""),
                            args=interrupt.value["action_requests"][0].get("args", {}),
                        )
                    )
            # Check for todos
            chunk_data = next(iter(data.values())) if data else None
            if chunk_data and "todos" in chunk_data:
                yield WebSocketMessage(type="todo", data=chunk_data["todos"])

        elif stream_mode == "messages":
            message, _metadata = data
            # PATTERN: Handle content_blocks like execution.py:530-638
            if hasattr(message, "content_blocks"):
                for block in message.content_blocks:
                    if block.get("type") == "text":
                        yield WebSocketMessage(type="text", data=block.get("text", ""))
                    elif block.get("type") in ("tool_call_chunk", "tool_call"):
                        yield WebSocketMessage(type="tool_call", data=block)


# Task 9: chat.py WebSocket endpoint
# PATTERN: FastAPI WebSocket with async streaming

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, agent_name: str = "agent"):
    await websocket.accept()

    # Create agent and session
    agent, backend = await create_cli_agent(
        model=create_model(),
        assistant_id=agent_name,
        auto_approve=False,  # Web always uses HITL
    )
    session_state = SessionState()
    config = {"configurable": {"thread_id": session_state.thread_id}}

    try:
        while True:
            # Receive user message
            data = await websocket.receive_json()

            if data["type"] == "message":
                # Stream response
                async for msg in stream_agent_response(
                    data["content"], agent, session_state, config
                ):
                    await websocket.send_json(msg.model_dump())
                await websocket.send_json({"type": "done", "data": None})

            elif data["type"] == "interrupt_response":
                # Handle HITL response
                response = InterruptResponse(**data["data"])
                # Resume agent with decision
                # PATTERN: See execution.py:727-739

    except WebSocketDisconnect:
        pass
```

### Integration Points
```yaml
CONFIG:
  - add to: libs/deepagents-web/deepagents_web/config.py
  - pattern: "WEB_HOST = os.getenv('DEEPAGENTS_WEB_HOST', '0.0.0.0')"
  - pattern: "WEB_PORT = int(os.getenv('DEEPAGENTS_WEB_PORT', '8000'))"

ROUTES:
  - add to: libs/deepagents-web/deepagents_web/main.py
  - pattern: "app.include_router(chat_router, prefix='/api')"
  - pattern: "app.include_router(skills_router, prefix='/api')"
  - pattern: "app.mount('/static', StaticFiles(directory='static'), name='static')"

DEPENDENCIES:
  - add to: libs/deepagents-web/pyproject.toml
  - pattern: "fastapi>=0.115.0"
  - pattern: "uvicorn[standard]>=0.32.0"
  - pattern: "websockets>=13.0"
  - pattern: "python-multipart>=0.0.12"
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
# CREATE tests/test_skill_service.py
import pytest
from deepagents_web.services.skill_service import SkillService

def test_list_skills():
    """List skills returns expected format."""
    service = SkillService(agent_name="test-agent")
    skills = service.list_skills()
    assert isinstance(skills, list)

def test_create_skill_validation():
    """Invalid skill names are rejected."""
    service = SkillService(agent_name="test-agent")
    with pytest.raises(ValueError):
        service.create_skill(name="Invalid Name!", description="test")

def test_create_skill_success(tmp_path, monkeypatch):
    """Valid skill is created."""
    # Mock settings to use tmp_path
    service = SkillService(agent_name="test-agent")
    skill = service.create_skill(name="test-skill", description="A test skill")
    assert skill.name == "test-skill"

# CREATE tests/test_chat_api.py
import pytest
from fastapi.testclient import TestClient
from deepagents_web.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_websocket_connect(client):
    """WebSocket connection is established."""
    with client.websocket_connect("/api/ws/chat") as websocket:
        # Connection should succeed
        pass
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
uv run python -m deepagents_web.main

# Test REST endpoints
curl http://localhost:8000/api/skills
# Expected: {"skills": [...]}

curl -X POST http://localhost:8000/api/skills \
  -H "Content-Type: application/json" \
  -d '{"name": "test-skill", "description": "Test skill"}'
# Expected: {"name": "test-skill", "description": "Test skill", ...}

# Test WebSocket (use wscat or browser)
# wscat -c ws://localhost:8000/api/ws/chat
# Send: {"type": "message", "content": "Hello"}
# Expected: Streaming response messages
```

## Final Validation Checklist
- [ ] All tests pass: `uv run pytest tests/ -v`
- [ ] No linting errors: `ruff check deepagents_web/`
- [ ] No type errors: `mypy deepagents_web/`
- [ ] WebSocket chat works with streaming
- [ ] HITL approval workflow functions
- [ ] Skill CRUD operations work
- [ ] Frontend renders markdown correctly
- [ ] Error cases handled gracefully
- [ ] Documentation updated (README.md)

---

## Anti-Patterns to Avoid
- Don't create new patterns when existing ones work (reuse deepagents_cli code)
- Don't skip validation because "it should work"
- Don't ignore failing tests - fix them
- Don't use sync functions in async context (FastAPI is async)
- Don't hardcode values that should be config
- Don't catch all exceptions - be specific
- Don't duplicate skill validation logic - import from deepagents_cli

---

## Confidence Score: 8/10

**Strengths:**
- Clear reuse of existing deepagents-cli patterns
- Well-defined data models and API structure
- Comprehensive validation gates
- Detailed pseudocode for complex streaming logic

**Risks:**
- WebSocket HITL flow complexity (mitigated by detailed pseudocode)
- Frontend JavaScript complexity (mitigated by modular structure)
- Browser-use skill management reference unavailable (mitigated by using existing CLI patterns)

**Recommendations for Implementation:**
1. Start with Task 1-6 (backend foundation)
2. Test skill service independently before WebSocket
3. Implement WebSocket chat without HITL first, then add HITL
4. Build frontend incrementally: chat first, then skills

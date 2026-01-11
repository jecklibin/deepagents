# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

DeepAgents is a LangGraph-based agent framework implementing patterns for long-horizon tasks: planning (todos), computer access (filesystem/shell), and sub-agent delegation. The repository is a monorepo with four packages in `libs/`:

- **deepagents** - Core agent library with middleware system, backends, and subagent support
- **deepagents-cli** - Interactive CLI with Textual TUI, memory, skills, and human-in-the-loop workflows
- **deepagents-web** - Web service and frontend with WebSocket chat and skill management
- **harbor** - Evaluation framework for benchmarking agents
- **acp** - Agent Client Protocol support (work in progress)

## Development Commands

### Core Library (deepagents)

```bash
cd libs/deepagents

# Install dependencies
uv sync --all-groups

# Run tests
pytest

# Run tests with coverage
pytest --cov=deepagents --cov-report=term-missing

# Run linting
ruff check .

# Run type checking
mypy deepagents

# Format code
ruff format .

# Build package
python -m build
```

### CLI (deepagents-cli)

```bash
cd libs/deepagents-cli

# Install dependencies
uv sync --all-groups

# Run CLI during development
uv run deepagents

# Run tests
make test
# Or: pytest

# Run specific test
pytest tests/test_agent.py::test_create_cli_agent -v

# Run linting
ruff check .

# Format code
ruff format .
```

### Web Service (deepagents-web)

```bash
cd libs/deepagents-web

# Install dependencies
uv sync --all-groups

# Run web service during development
uv run deepagents-web

# Run tests
pytest

# Run linting
ruff check .

# Format code
ruff format .
```

### Running the Web Service

```bash
# Basic usage (starts on http://localhost:8000)
deepagents-web

# With custom host/port
deepagents-web --host 0.0.0.0 --port 3000

# Auto-approve tool usage (skip HITL)
deepagents-web --auto-approve
```

### Running the CLI

```bash
# Basic usage
deepagents

# With specific model
deepagents --model claude-sonnet-4-5-20250929
deepagents --model gpt-4o

# With sandbox
deepagents --sandbox modal
deepagents --sandbox runloop

# Auto-approve tool usage (skip HITL)
deepagents --auto-approve

# Use custom agent configuration
deepagents --agent mybot

# List available agents
deepagents list

# Manage skills
deepagents skills list
deepagents skills create my-skill
```

## Architecture

### Core Concepts

**Middleware System**: The primary extensibility mechanism. Middleware can inject tools, modify prompts, and hook into the agent lifecycle. Built-in middleware includes TodoList, Filesystem, SubAgent, Summarization, PromptCaching, HITL, Memory, and Skills.

**Backend Abstraction**: Pluggable storage layer for file operations. Backends include StateBackend (ephemeral), FilesystemBackend (disk), StoreBackend (persistent), CompositeBackend (hybrid routing), and SandboxBackend (remote execution).

**Subagent Delegation**: The `task` tool spawns isolated subagents with separate context windows to prevent context pollution and enable parallel execution.

**Progressive Disclosure**: Skills and memory are loaded incrementally - metadata first, full content on-demand - to reduce token usage.

### Key Files

**Core Library**:
- [libs/deepagents/deepagents/graph.py](libs/deepagents/deepagents/graph.py) - `create_deep_agent()` entry point
- [libs/deepagents/deepagents/middleware/](libs/deepagents/deepagents/middleware/) - Built-in middleware implementations
- [libs/deepagents/deepagents/middleware/memory.py](libs/deepagents/deepagents/middleware/memory.py) - MemoryMiddleware for loading AGENTS.md files
- [libs/deepagents/deepagents/middleware/skills.py](libs/deepagents/deepagents/middleware/skills.py) - SkillsMiddleware for progressive skill disclosure
- [libs/deepagents/deepagents/backends/](libs/deepagents/deepagents/backends/) - Backend implementations
- [libs/deepagents/deepagents/subagents.py](libs/deepagents/deepagents/subagents.py) - Subagent types and execution

**CLI**:
- [libs/deepagents-cli/deepagents_cli/main.py](libs/deepagents-cli/deepagents_cli/main.py) - CLI entry point
- [libs/deepagents-cli/deepagents_cli/agent.py](libs/deepagents-cli/deepagents_cli/agent.py) - `create_cli_agent()` with CLI-specific middleware
- [libs/deepagents-cli/deepagents_cli/app.py](libs/deepagents-cli/deepagents_cli/app.py) - Textual TUI application
- [libs/deepagents-cli/deepagents_cli/textual_adapter.py](libs/deepagents-cli/deepagents_cli/textual_adapter.py) - Agent execution with Textual UI streaming
- [libs/deepagents-cli/deepagents_cli/sessions.py](libs/deepagents-cli/deepagents_cli/sessions.py) - Thread persistence with SQLite
- [libs/deepagents-cli/deepagents_cli/widgets/](libs/deepagents-cli/deepagents_cli/widgets/) - Textual UI widgets (messages, approval, diff, etc.)
- [libs/deepagents-cli/deepagents_cli/skills/](libs/deepagents-cli/deepagents_cli/skills/) - Skills commands and loading

**Web Service**:
- [libs/deepagents-web/deepagents_web/main.py](libs/deepagents-web/deepagents_web/main.py) - FastAPI app entry point
- [libs/deepagents-web/deepagents_web/api/chat.py](libs/deepagents-web/deepagents_web/api/chat.py) - WebSocket endpoint for real-time chat
- [libs/deepagents-web/deepagents_web/api/skills.py](libs/deepagents-web/deepagents_web/api/skills.py) - REST endpoints for skill CRUD
- [libs/deepagents-web/deepagents_web/api/recording.py](libs/deepagents-web/deepagents_web/api/recording.py) - Browser recording endpoints
- [libs/deepagents-web/deepagents_web/services/agent_service.py](libs/deepagents-web/deepagents_web/services/agent_service.py) - Agent session management and streaming
- [libs/deepagents-web/deepagents_web/services/skill_service.py](libs/deepagents-web/deepagents_web/services/skill_service.py) - Skill CRUD and browser skill generation
- [libs/deepagents-web/deepagents_web/services/recording_service.py](libs/deepagents-web/deepagents_web/services/recording_service.py) - Playwright-based browser recording
- [libs/deepagents-web/deepagents_web/services/skill_executor.py](libs/deepagents-web/deepagents_web/services/skill_executor.py) - Browser skill execution
- [libs/deepagents-web/deepagents_web/static/](libs/deepagents-web/deepagents_web/static/) - Frontend HTML/CSS/JS

### Data Flow

1. User input → Textual TUI (`app.py`)
2. `create_cli_agent()` assembles middleware stack
3. `create_deep_agent()` builds LangGraph StateGraph
4. `TextualUIAdapter` streams responses to widgets
5. Middleware intercepts to inject tools and modify prompts
6. Model generates tool calls
7. HITL middleware interrupts for approval (if configured)
8. Tools execute via backend (state/filesystem/sandbox)
9. Results flow back through middleware
10. Textual widgets render output with rich formatting

### Middleware Stack Order

The order matters because middleware wraps the agent in sequence:

1. TodoListMiddleware - Planning tools
2. FilesystemMiddleware - File operations
3. SubAgentMiddleware - Delegation
4. SummarizationMiddleware - Context management (170k token threshold)
5. AnthropicPromptCachingMiddleware - Cost optimization
6. PatchToolCallsMiddleware - Fix interrupted tool calls
7. HumanInTheLoopMiddleware - Tool approval (optional)

CLI adds (via SDK middleware):
- MemoryMiddleware - Loads AGENTS.md files from SDK
- SkillsMiddleware - Progressive skill disclosure from SDK
- ShellMiddleware - Local shell execution (local mode only)

### Backend System

All backends implement `BackendProtocol` with methods: `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`.

Sandbox backends additionally implement `SandboxBackendProtocol` with `execute()` for remote command execution.

**CompositeBackend** enables hybrid storage by routing paths to different backends:
```python
CompositeBackend(
    default=StateBackend(),
    routes={"/memories/": StoreBackend(store=InMemoryStore())}
)
```

### Path Handling

The virtual filesystem uses Unix-style paths starting with `/`. Windows paths like `C:\path` are converted to `/c/path` in `_validate_path()` for cross-platform compatibility.

## Code Style

- Line length: 150 chars (deepagents), 100 chars (deepagents-cli, deepagents-web)
- Docstring style: Google format
- Type hints: Required (mypy strict mode)
- Formatting: Ruff with `docstring-code-format = true`
- Linting: Ruff with ALL rules enabled, specific ignores in pyproject.toml

## Testing

- Test framework: pytest with asyncio support
- Coverage: pytest-cov
- Test location: `tests/` directory in each package
- Async tests: Use `pytest-asyncio` with `asyncio_mode = "auto"`
- CLI tests: 10-second default timeout (`pytest.ini_options.timeout`)

## Environment Variables

**LLM Providers**:
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default: claude-sonnet-4-5-20250929)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default: gpt-5-mini)
- `GOOGLE_API_KEY`, `GOOGLE_MODEL` (default: gemini-3-pro-preview)

**LangSmith Tracing**:
- `LANGCHAIN_TRACING_V2=true`
- `LANGCHAIN_API_KEY`
- `DEEPAGENTS_LANGSMITH_PROJECT` - Agent traces
- `LANGSMITH_PROJECT` - User code traces

**Web Search**:
- `TAVILY_API_KEY` - Required for web_search tool

**Web Service**:
- `DEEPAGENTS_WEB_HOST` - Host to bind (default: 127.0.0.1)
- `DEEPAGENTS_WEB_PORT` - Port to bind (default: 8000)

## Common Patterns

**Creating Custom Middleware**:
```python
from langchain.agents.middleware import AgentMiddleware
from langchain_core.tools import tool

@tool
def my_tool(arg: str) -> str:
    """Tool description."""
    return result

class MyMiddleware(AgentMiddleware):
    tools = [my_tool]

    def get_system_prompt(self, state):
        return "Additional instructions..."
```

**Creating Custom Subagents**:
```python
subagent = {
    "name": "research-agent",
    "description": "Used for research tasks",
    "system_prompt": "You are a researcher",
    "tools": [internet_search],
    "model": "openai:gpt-4o",  # Optional
}

agent = create_deep_agent(subagents=[subagent])
```

**Using Custom Backends**:
```python
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    backend=FilesystemBackend(root_dir="/path/to/project")
)
```

## Skills System

Skills are reusable agent capabilities defined in `SKILL.md` files with YAML frontmatter:

```markdown
---
name: my-skill
description: Brief description shown in agent prompt
---

# Full instructions

Step-by-step workflow...
```

**Locations**:
- Global: `~/.deepagents/{agent}/skills/{skill-name}/SKILL.md`
- Project: `{project-root}/.deepagents/skills/{skill-name}/SKILL.md`

**How it works**:
1. SkillsMiddleware scans skill directories at startup
2. Extracts metadata (name + description) from YAML frontmatter
3. Injects skill list into system prompt
4. Agent reads full SKILL.md with `read_file` when task matches description
5. Agent follows step-by-step instructions in skill file

### Browser Skills (Recording-based)

Browser skills automate web interactions using Playwright. They can be created by recording browser actions in the web UI.

**Structure**:
```
skills/{skill-name}/
├── SKILL.md      # Skill documentation with frontmatter type: browser
└── script.py     # Executable Playwright automation script
```

**Recording Flow**:
1. User starts recording in web UI, specifying start URL
2. Browser window opens with JavaScript injection to capture user interactions
3. Clicks, inputs, navigation are recorded with coordinates and selectors
4. User stops recording, actions are converted to human-readable description
5. LLM generates intelligent Playwright script from the recorded actions
6. Script includes proper waits, error handling, and page content extraction

**Key Files**:
- `recording_service.py` - Playwright-based recording with JS injection
- `skill_service.py` - LLM-powered script generation from recordings
- `skill_executor.py` - Script execution with UTF-8 output handling

**Generated Script Features**:
- Uses `headless=False` for visible automation
- Proper waits after navigation and clicks (`wait_for_load_state`)
- Robust selectors (text-based, role-based over coordinates)
- Page content extraction (url, title, content, links, tables, lists)
- JSON output to stdout with error handling
- UTF-8 encoding support for Windows

## Memory System

**AGENTS.md files** are auto-loaded into system prompt:
- Global: `~/.deepagents/{agent}/AGENTS.md` - Personality and universal preferences
- Project: `{project-root}/.deepagents/AGENTS.md` - Project-specific context

**Project memory files** in `.deepagents/` are loaded on-demand:
- Agent checks for relevant memory files when starting tasks
- Agent creates/updates memory files to persist project knowledge
- Examples: `architecture.md`, `api-design.md`, `deployment.md`

## Thread Persistence

The CLI supports persistent conversation threads using SQLite:

**Commands**:
```bash
# Resume most recent thread
deepagents -r

# Resume specific thread
deepagents -r <thread-id>

# List threads
deepagents threads list
deepagents threads list --agent mybot --limit 10

# Delete a thread
deepagents threads delete <thread-id>
```

**Storage**: Threads are stored in `~/.deepagents/checkpoints.db` using `langgraph-checkpoint-sqlite`.

## Windows Support

The codebase supports Windows with several compatibility measures:

**Path Handling**:
- Virtual filesystem uses Unix-style paths starting with `/`
- Windows paths like `C:\path` are converted to `/c/path` in `_validate_path()`

**Encoding**:
- ShellMiddleware sets `PYTHONIOENCODING=utf-8` for subprocess execution
- subprocess.run uses `encoding="utf-8"` and `errors="replace"`
- Browser skill scripts use `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`
- skill_executor.py uses Popen with byte-level output and UTF-8 decoding

**Playwright on Windows**:
- Uses sync API with dedicated worker thread (async subprocess not supported on Windows with uvicorn)
- Queue-based communication between async FastAPI and sync Playwright
- Recording service runs Playwright operations in separate thread to avoid event loop conflicts

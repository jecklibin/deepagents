# DeepAgents Web

Web service and frontend interface for DeepAgents.

## Features

- Real-time chat interface with WebSocket streaming
- Tool execution visualization with HITL approval workflow
- Todo list rendering
- Skill management (create, edit, delete)
- Markdown rendering for agent responses

## Installation

```bash
cd libs/deepagents-web
uv sync
```

## Usage

```bash
# Start the web server
deepagents-web

# Or with custom settings
DEEPAGENTS_WEB_HOST=0.0.0.0 DEEPAGENTS_WEB_PORT=8080 deepagents-web
```

Then open http://localhost:8000 in your browser.

## Configuration

Environment variables:

- `DEEPAGENTS_WEB_HOST` - Host to bind to (default: `0.0.0.0`)
- `DEEPAGENTS_WEB_PORT` - Port to listen on (default: `8000`)
- `DEEPAGENTS_WEB_CORS_ORIGINS` - Comma-separated CORS origins (default: `*`)
- `DEEPAGENTS_WEB_AUTO_APPROVE` - Auto-approve tool calls (default: `false`)
- `DEEPAGENTS_WEB_ENABLE_CUA` - Enable the computer-use subagent (default: `true`)
- `DEEPAGENTS_WEB_CUA_MODEL` - Override CUA model (optional)
- `DEEPAGENTS_WEB_CUA_PROVIDER` - Override CUA provider type (optional)
- `DEEPAGENTS_WEB_CUA_OS` - Override CUA OS type (optional)
- `DEEPAGENTS_WEB_CUA_TRAJECTORY_DIR` - Override CUA trajectory directory (optional)

CUA also reads the standard `CUA_*` environment variables for API keys, container name,
provider, OS type, and other settings (same as the CLI).

## API Endpoints

### REST API

- `GET /api/skills` - List all skills
- `POST /api/skills` - Create a new skill
- `GET /api/skills/{name}` - Get skill details
- `PUT /api/skills/{name}` - Update a skill
- `DELETE /api/skills/{name}` - Delete a skill
- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Create a new session
- `DELETE /api/sessions/{id}` - Delete a session

### WebSocket

- `WS /api/ws/chat` - Real-time chat with the agent

## Development

```bash
# Run with auto-reload
uvicorn deepagents_web:app --reload

# Run tests
pytest tests/ -v

# Lint
ruff check deepagents_web/

# Type check
mypy deepagents_web/
```

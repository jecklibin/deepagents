name: "CUA Computer-Use Subagent"
description: |

## Purpose
Extend deepagents with a CUA-powered computer-use subagent that can be invoked via the task tool to plan and execute UI automation tasks end-to-end.

---

## Goal
Add an optional "computer-use" subagent (powered by CUA ComputerAgent + Computer) to deepagents CLI so the main agent can delegate UI automation tasks and receive a concise result.

## Why
- Provide real computer-use capability for long-horizon tasks that require UI interactions.
- Keep main agent context clean by delegating UI work to a subagent.
- Reuse CUA's proven agent loops and computer sandbox tooling.

## What
### User-visible behavior and technical requirements
- When enabled (CLI flag or config), the `task` tool lists a `computer-use` subagent.
- The main agent can call `task` with `subagent_type="computer-use"` for UI tasks.
- The subagent runs a CUA ComputerAgent session and returns a concise summary or final assistant message.
- Missing CUA dependencies or environment variables produce a clear, actionable error message.
- README includes project structure and CUA setup notes.

### Success Criteria
- [ ] `computer-use` subagent appears in task tool descriptions when enabled.
- [ ] Subagent runs CUA ComputerAgent with a Computer instance and returns a final message.
- [ ] Missing deps/env are handled gracefully (no stack traces in user output).
- [ ] README includes project structure and CUA usage notes.
- [ ] Tests cover integration glue and CLI flags.

## All Needed Context

### Documentation & References (list all context needed to implement the feature)
```yaml
- file: libs/deepagents/deepagents/graph.py
  why: create_deep_agent() builds default middleware + subagent stack.

- file: libs/deepagents/deepagents/middleware/subagents.py
  why: task tool + compiled subagent invocation contract (expects messages in state).

- file: libs/deepagents/tests/integration_tests/test_deepagents.py
  why: subagent configuration patterns and invocation expectations.

- file: libs/deepagents-cli/deepagents_cli/agent.py
  why: create_cli_agent() is where CLI subagents are wired.

- file: libs/deepagents-cli/deepagents_cli/main.py
  why: CLI flags and how create_cli_agent is called.

- file: libs/deepagents-cli/deepagents_cli/config.py
  why: dotenv.load_dotenv() pattern and env handling.

- file: libs/deepagents-cli/deepagents_cli/mcp_proxy.py
  why: optional integration pattern (lazy init + error messaging).

- url: https://docs.langchain.com/oss/python/deepagents/overview
  why: deepagents overview and subagent context.

- url: https://docs.langchain.com/oss/python/deepagents/subagents
  why: subagent behavior/contract.

- url: https://github.com/trycua/cua
  why: project overview; README notes Python 3.12/3.13 requirement.

- url: https://cua.ai/docs/cua/reference/agent-sdk
  why: ComputerAgent API, args, and behavior.

- url: https://cua.ai/docs/cua/reference/computer-sdk
  why: Computer API and provider configuration.

- url: https://raw.githubusercontent.com/trycua/cua/main/libs/python/agent/example.py
  why: end-to-end example using ComputerAgent + Computer + dotenv + env vars.

- url: https://raw.githubusercontent.com/trycua/cua/main/libs/python/agent/agent/agent.py
  why: ComputerAgent.run() output structure and constructor args.

- url: https://raw.githubusercontent.com/trycua/cua/main/libs/python/computer/computer/computer.py
  why: Computer constructor args, env var defaults, provider selection.
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase
```bash
D:\code\deepagents
├── libs/
│   ├── deepagents/
│   │   ├── deepagents/
│   │   │   ├── graph.py
│   │   │   └── middleware/subagents.py
│   │   └── tests/
│   ├── deepagents-cli/
│   │   ├── deepagents_cli/
│   │   │   ├── agent.py
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   └── integrations/
│   │   └── tests/
│   └── deepagents-web/
├── PRPs/
└── README.md
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
libs/deepagents-cli/
├── deepagents_cli/
│   ├── integrations/
│   │   └── cua.py            # NEW: CUA config + subagent builder + output parsing
│   ├── agent.py              # Add enable_cua/subagents wiring
│   ├── main.py               # CLI flags to enable CUA
│   └── config.py             # (Optional) expose CUA env defaults
├── tests/
│   └── unit_tests/
│       └── test_cua_integration.py  # NEW: unit tests for CUA glue
README.md                      # Update: project structure + CUA usage notes
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: deepagents SubAgentMiddleware expects subagent results to include
# a "messages" list (AIMessage/ToolMessage) in the returned state.

# CRITICAL: CUA README states Python 3.12/3.13 requirement. deepagents-cli targets >=3.11.
# Verify compatibility or make CUA integration optional with clear errors.

# CRITICAL: ComputerAgent.run() yields output items with types:
# "message", "computer_call", "computer_call_output", "function_call", "function_call_output".
# Do NOT return raw screenshots or tool outputs to the main agent; summarize instead.

# CRITICAL: ComputerAgent forbids image inputs with Ollama models and raises ValueError
# if computer_call_output screenshots exist. Use vision-capable models (OpenAI/Anthropic).

# CRITICAL: Computer uses CUA_API_KEY from env when provider_type is cloud.
# Example uses CUA_CONTAINER_NAME + CUA_API_KEY for cloud sandboxes.

# CRITICAL: CLI config already calls dotenv.load_dotenv().
# If the integration is imported outside CLI, call dotenv.load_dotenv() before reading env vars.

# CRITICAL: Task tool is behind HITL in CLI (interrupt_on). The subagent itself
# will run autonomously; ensure user acknowledgement via task approval is sufficient.
```

## Implementation Blueprint

### Data models and structure
```python
# libs/deepagents-cli/deepagents_cli/integrations/cua.py
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

@dataclass
class CuaConfig:
    model: str
    os_type: str
    provider_type: str
    container_name: Optional[str]
    api_key: Optional[str]
    only_n_most_recent_images: int | None
    trajectory_dir: Optional[Path]
    use_prompt_caching: bool
    screenshot_delay: float
    max_trajectory_budget: dict | None
```

### List of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
CREATE libs/deepagents-cli/deepagents_cli/integrations/cua.py:
  - Add CuaConfig dataclass and env parsing helpers (load dotenv if needed).
  - Lazy-import CUA packages (agent, computer) and return None if missing.
  - Implement build_cua_subagent(...) that returns CompiledSubAgent.

Task 2:
CREATE CUA subagent runner inside cua.py:
  - Wrap CUA ComputerAgent.run() in a Runnable/async function.
  - Extract user instruction from state["messages"] (last HumanMessage).
  - Collect output items and return a single AIMessage summary.

Task 3:
MODIFY libs/deepagents-cli/deepagents_cli/agent.py:
  - Add parameters: enable_cua: bool, cua_config: CuaConfig | None, subagents: list | None.
  - If enable_cua, call build_cua_subagent and append to subagents list.
  - Pass subagents to create_deep_agent(...).

Task 4:
MODIFY libs/deepagents-cli/deepagents_cli/main.py:
  - Add CLI flags: --cua (bool), --cua-model, --cua-provider, --cua-os, --cua-trajectory-dir.
  - Pass flag values to create_cli_agent.

Task 5:
MODIFY libs/deepagents-cli/pyproject.toml (if required):
  - Add optional dependencies for CUA (cua-agent, cua-computer).
  - Keep integration optional; avoid import errors when deps missing.

Task 6:
MODIFY README.md:
  - Add "Project structure" section (monorepo layout).
  - Add "Computer-use subagent (CUA)" section: env vars and usage.

Task 7:
CREATE libs/deepagents-cli/tests/unit_tests/test_cua_integration.py:
  - Validate env parsing + error messaging when deps or env are missing.
  - Validate output parsing (message extraction) using mocked CUA outputs.

Task 8:
(Optional) If deepagents core API changes:
  - Update libs/deepagents/tests/integration_tests/test_deepagents.py to cover new subagent wiring.
```

### Per task pseudocode as needed added to each task
```python
# Task 2: CUA subagent runner (in cua.py)
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableLambda

async def _run_cua_subagent(state: dict, config: dict) -> dict:
    # Extract instruction (default to last HumanMessage content)
    instruction = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, HumanMessage):
            instruction = msg.content
            break

    if not instruction:
        return {"messages": [AIMessage(content="No instruction provided for computer-use task.")]}

    # Build CUA Computer + ComputerAgent (async context manager)
    async with Computer(
        os_type=cua_config.os_type,
        provider_type=cua_config.provider_type,
        name=cua_config.container_name or "",
        api_key=cua_config.api_key,
    ) as computer:
        agent = ComputerAgent(
            model=cua_config.model,
            tools=[computer],
            only_n_most_recent_images=cua_config.only_n_most_recent_images,
            trajectory_dir=str(cua_config.trajectory_dir) if cua_config.trajectory_dir else None,
            screenshot_delay=cua_config.screenshot_delay,
            use_prompt_caching=cua_config.use_prompt_caching,
            max_trajectory_budget=cua_config.max_trajectory_budget,
        )

        output_items = []
        async for result in agent.run([{"role": "user", "content": instruction}], stream=False):
            output_items.extend(result.get("output", []))

    # Extract final assistant text
    final_text = extract_last_message_text(output_items)
    return {"messages": [AIMessage(content=final_text)]}

def extract_last_message_text(output_items: list[dict]) -> str:
    # Prefer last "message" item with text content
    for item in reversed(output_items):
        if item.get("type") == "message":
            content = item.get("content", [])
            if isinstance(content, list):
                texts = [c.get("text", "") for c in content if c.get("text")]
                if texts:
                    return "\n".join(texts).strip()
    return "Computer task finished, but no assistant message was returned."

# build_cua_subagent returns CompiledSubAgent with RunnableLambda(_run_cua_subagent).
```

### Integration Points
```yaml
ENV:
  - CUA_API_KEY: API key for cloud provider (required for provider_type=cloud)
  - CUA_CONTAINER_NAME: Cloud container name (example.py requirement)
  - CUA_MODEL: Model string for ComputerAgent (default to claude-sonnet-4-5-20250929)
  - CUA_OS_TYPE: "linux" | "macos" (default "linux")
  - CUA_PROVIDER_TYPE: "cloud" | "lume" | "docker" (default "cloud")
  - CUA_TRAJECTORY_DIR: Optional path for logs/screenshots

CONFIG:
  - Add CLI args in main.py and pass into create_cli_agent
  - Reuse dotenv.load_dotenv() pattern from config.py

TOOLS:
  - Subagent invoked via task tool with subagent_type="computer-use"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
cd libs/deepagents-cli
ruff check deepagents_cli/ --fix
mypy deepagents_cli/
```

### Level 2: Unit Tests
```bash
cd libs/deepagents-cli
uv run pytest tests/unit_tests/test_cua_integration.py -v
```

### Level 3: Manual Integration Test
```bash
# Run CLI with CUA enabled (ensure env vars are set)
deepagents --cua --model claude-sonnet-4-5-20250929

# Prompt example:
# "Open Firefox and search for Cua, then summarize the top result."
```

## Final Validation Checklist
- [ ] All tests pass: `uv run pytest tests/unit_tests/test_cua_integration.py -v`
- [ ] No lint errors: `ruff check deepagents_cli/`
- [ ] No type errors: `mypy deepagents_cli/`
- [ ] CUA subagent appears in task tool list when enabled
- [ ] Missing deps/env returns a clear user-facing error
- [ ] README updated with project structure and CUA usage notes

---

## Anti-Patterns to Avoid
- Don't hardcode CUA secrets or container names in code.
- Don't import CUA modules at import time (keep optional).
- Don't return raw screenshots or tool outputs to the main agent.
- Don't bypass the task tool approval flow for CUA subagent execution.
- Don't introduce new subagent patterns when SubAgentMiddleware already works.

---

## Confidence Score: 7/10

Strengths:
- Clear wiring through existing subagent infrastructure.
- CUA example and source provide concrete integration patterns.
- CLI already has HITL and optional integration patterns.

Risks:
- Python version compatibility (CUA 3.12/3.13 vs CLI 3.11).
- Output parsing differences across CUA agent loops.
- Provider-specific setup (cloud vs local) can cause runtime failures.

## Quality Checklist
- [ ] All necessary context included
- [ ] Validation gates are executable by AI
- [ ] References existing patterns
- [ ] Clear implementation path
- [ ] Error handling documented

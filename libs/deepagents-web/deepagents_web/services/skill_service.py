"""Skill service for CRUD operations."""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import TYPE_CHECKING

from deepagents_cli.config import Settings
from deepagents_cli.skills.load import MAX_SKILL_NAME_LENGTH, list_skills

from deepagents_web.models.recording import ActionType, RecordedAction
from deepagents_web.models.skill import SkillResponse

if TYPE_CHECKING:
    from deepagents_web.models.recording import RecordingSession


class SkillService:
    """Service for managing skills."""

    def __init__(self, agent_name: str = "agent") -> None:
        """Initialize the skill service."""
        self.agent_name = agent_name
        self.settings = Settings.from_environment()

    def list_skills(self, *, project_only: bool = False) -> list[SkillResponse]:
        """List all skills."""
        user_skills_dir = (
            None if project_only else self.settings.get_user_skills_dir(self.agent_name)
        )
        project_skills_dir = self.settings.get_project_skills_dir()

        skills = list_skills(
            user_skills_dir=user_skills_dir,
            project_skills_dir=project_skills_dir,
        )

        return [
            SkillResponse(
                name=s["name"],
                description=s["description"],
                path=s["path"],
                source=s["source"],
            )
            for s in skills
        ]

    def get_skill(self, name: str) -> SkillResponse | None:
        """Get a skill by name with full content."""
        skills = self.list_skills()
        skill = next((s for s in skills if s.name == name), None)
        if not skill:
            return None

        skill_path = Path(skill.path)
        if skill_path.exists():
            skill.content = skill_path.read_text(encoding="utf-8")
        return skill

    def create_skill(
        self,
        name: str,
        description: str,
        content: str | None = None,
        *,
        project: bool = False,
    ) -> SkillResponse:
        """Create a new skill."""
        self._validate_name(name)

        if project:
            if not self.settings.project_root:
                msg = "Not in a project directory"
                raise ValueError(msg)
            skills_dir = self.settings.ensure_project_skills_dir()
        else:
            skills_dir = self.settings.ensure_user_skills_dir(self.agent_name)

        if skills_dir is None:
            msg = "Could not determine skills directory"
            raise ValueError(msg)

        skill_dir = skills_dir / name
        if skill_dir.exists():
            msg = f"Skill '{name}' already exists"
            raise ValueError(msg)

        skill_dir.mkdir(parents=True, exist_ok=True)

        if content is None:
            content = self._get_template(name, description)

        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(content, encoding="utf-8")

        return SkillResponse(
            name=name,
            description=description,
            path=str(skill_md),
            source="project" if project else "user",
            content=content,
        )

    def update_skill(
        self,
        name: str,
        content: str,
        description: str | None = None,
    ) -> SkillResponse:
        """Update an existing skill."""
        skill = self.get_skill(name)
        if not skill:
            msg = f"Skill '{name}' not found"
            raise ValueError(msg)

        skill_path = Path(skill.path)
        skill_path.write_text(content, encoding="utf-8")

        return SkillResponse(
            name=name,
            description=description or skill.description,
            path=skill.path,
            source=skill.source,
            content=content,
        )

    def delete_skill(self, name: str) -> None:
        """Delete a skill."""
        skill = self.get_skill(name)
        if not skill:
            msg = f"Skill '{name}' not found"
            raise ValueError(msg)

        skill_path = Path(skill.path)
        skill_dir = skill_path.parent
        shutil.rmtree(skill_dir)

    def _validate_name(self, name: str) -> None:
        """Validate skill name per Agent Skills spec."""
        if not name or not name.strip():
            msg = "name cannot be empty"
            raise ValueError(msg)
        if len(name) > MAX_SKILL_NAME_LENGTH:
            msg = "name cannot exceed 64 characters"
            raise ValueError(msg)
        if ".." in name or "/" in name or "\\" in name:
            msg = "name cannot contain path components"
            raise ValueError(msg)
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name):
            msg = "name must be lowercase alphanumeric with single hyphens only"
            raise ValueError(msg)

    def _get_template(self, name: str, description: str) -> str:
        """Get the default SKILL.md template."""
        title = name.title().replace("-", " ")
        return f"""---
name: {name}
description: {description}
---

# {title} Skill

## Description

{description}

## When to Use

- [Scenario 1: When the user asks...]
- [Scenario 2: When you need to...]

## How to Use

### Step 1: [First Action]
[Explain what to do first]

### Step 2: [Second Action]
[Explain what to do next]

## Best Practices

- [Best practice 1]
- [Best practice 2]
"""

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

        from deepagents_cli.config import create_model

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

        model = create_model()
        response = await model.ainvoke([{"role": "user", "content": prompt}])
        content = response.content if hasattr(response, "content") else str(response)

        if not content.startswith("---"):
            content = self._wrap_with_frontmatter(name, goal, content)

        return self.create_skill(name=name, description=goal, content=content, project=project)

    async def create_skill_from_recording(
        self,
        name: str,
        description: str,
        session: RecordingSession,
        *,
        project: bool = False,
    ) -> SkillResponse:
        """Create skill from recorded browser actions using LLM."""
        self._validate_name(name)

        from deepagents_cli.config import create_model

        # Convert recorded actions to description with robust selectors
        actions_desc = self._describe_recorded_actions(session.actions)

        # Use LLM to generate smart Playwright script with improved prompt
        prompt = f"""You are an expert at writing Playwright browser automation scripts.

Based on the following recorded browser actions, generate a robust Python script using Playwright.

## Task Description
{description}

## Recorded Actions
{actions_desc}

## Requirements
1. Use playwright.sync_api with sync_playwright()
2. Launch browser with headless=False so user can see the automation
3. **CRITICAL: Use Playwright's recommended locator strategies in this priority order:**
   - page.get_by_role("button", name="Submit") - BEST for buttons, links, headings
   - page.get_by_text("Click me") - GOOD for text content
   - page.get_by_label("Email") - GOOD for form inputs with labels
   - page.get_by_placeholder("Enter email") - GOOD for inputs with placeholders
   - page.get_by_test_id("submit-btn") - GOOD if data-testid exists
   - page.locator("css=...") - LAST RESORT only
4. Add proper waits after each action:
   - After navigation: page.wait_for_load_state('networkidle')
   - After clicks: page.wait_for_load_state('domcontentloaded')
   - For dynamic elements: expect(locator).to_be_visible()
5. Handle potential timing issues with explicit waits
6. Extract and return page content as a dict with keys: url, title, content, links, tables, lists
7. Include comprehensive error handling with try/except
8. The script must be self-contained and executable with `python script.py`
9. Output result as JSON to stdout

## CRITICAL: Main block must have try/except
The if __name__ == "__main__": block MUST wrap everything in try/except and print JSON:

```python
if __name__ == "__main__":
    try:
        result = run_skill()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        import traceback
        error_data = {{"error": str(e), "traceback": traceback.format_exc()}}
        print(json.dumps(error_data, ensure_ascii=False))
```

## Output Format
Output ONLY the Python code, no markdown code blocks, no explanations.
"""

        model = create_model()
        response = await model.ainvoke([{"role": "user", "content": prompt}])
        playwright_code = response.content if hasattr(response, "content") else str(response)

        # Clean up code if wrapped in markdown
        playwright_code = self._clean_code_block(playwright_code)

        # Ensure proper encoding header
        if "sys.stdout" not in playwright_code:
            encoding_header = """import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

"""
            playwright_code = encoding_header + playwright_code

        # Generate SKILL.md
        skill_content = self._generate_browser_skill_md(name, description, actions_desc)

        # Create skill directory and files
        if project:
            if not self.settings.project_root:
                msg = "Not in a project directory"
                raise ValueError(msg)
            skills_dir = self.settings.ensure_project_skills_dir()
        else:
            skills_dir = self.settings.ensure_user_skills_dir(self.agent_name)

        if skills_dir is None:
            msg = "Could not determine skills directory"
            raise ValueError(msg)

        skill_dir = skills_dir / name
        if skill_dir.exists():
            msg = f"Skill '{name}' already exists"
            raise ValueError(msg)

        skill_dir.mkdir(parents=True, exist_ok=True)

        # Write files
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(skill_content, encoding="utf-8")

        script_py = skill_dir / "script.py"
        script_py.write_text(playwright_code, encoding="utf-8")

        return SkillResponse(
            name=name,
            description=description,
            path=str(skill_md),
            source="project" if project else "user",
            content=skill_content,
        )

    def _describe_recorded_actions(self, actions: list[RecordedAction]) -> str:
        """Convert recorded actions to human-readable description."""
        lines = []
        for i, action in enumerate(actions, 1):
            if action.type == ActionType.NAVIGATE:
                lines.append(f"{i}. Navigate to URL: {action.value}")
            elif action.type == ActionType.CLICK:
                text = action.value.strip() if action.value else ""
                selector = action.selector or ""
                if action.x is not None and action.y is not None:
                    lines.append(
                        f'{i}. Click at ({action.x}, {action.y}), '
                        f'element: {selector}, text: "{text}"'
                    )
                else:
                    lines.append(f'{i}. Click on element: {selector}, text: "{text}"')
            elif action.type == ActionType.FILL:
                lines.append(f'{i}. Fill input {action.selector} with: "{action.value}"')
            elif action.type == ActionType.PRESS:
                lines.append(f"{i}. Press key {action.value} on {action.selector}")
            elif action.type == ActionType.SELECT:
                lines.append(f"{i}. Select option {action.value} in {action.selector}")
            elif action.type == ActionType.CHECK:
                lines.append(f"{i}. Check checkbox: {action.selector}")
            elif action.type == ActionType.UNCHECK:
                lines.append(f"{i}. Uncheck checkbox: {action.selector}")
        return "\n".join(lines) if lines else "No actions recorded."

    def _clean_code_block(self, code: str) -> str:
        """Remove markdown code block wrapper if present."""
        code = code.strip()
        if code.startswith("```python"):
            code = code[9:]
        elif code.startswith("```"):
            code = code[3:]
        code = code.removesuffix("```")
        return code.strip()

    def _wrap_with_frontmatter(self, name: str, description: str, content: str) -> str:
        """Wrap content with YAML frontmatter."""
        return f"""---
name: {name}
description: {description}
---

{content}
"""

    def _generate_browser_skill_md(
        self,
        name: str,
        description: str,
        actions_md: str,
    ) -> str:
        """Generate SKILL.md content for browser skill."""
        title = name.replace("-", " ").title()
        return f"""---
name: {name}
description: {description}
type: browser
---

# {title}

## Description

{description}

## Recorded Actions

{actions_md}

## Execution

To execute this skill, run the `script.py` file in this directory:

```bash
python script.py
```

The script will:
1. Launch a browser window
2. Execute the recorded actions
3. Extract and return page content as JSON

## When to Use

- When you need to automate this specific browser workflow
- When the user requests this action
"""

    def ai_extract(self, content: str, prompt: str) -> str:
        """Use LLM to extract information from page content."""
        import asyncio

        from deepagents_cli.config import create_model

        full_prompt = f"""Extract information from the following web page content.

User Request: {prompt}

Page Content:
{content}

Respond with ONLY the extracted information, no explanations."""

        model = create_model()

        async def _invoke() -> str:
            response = await model.ainvoke([{"role": "user", "content": full_prompt}])
            return response.content if hasattr(response, "content") else str(response)

        return asyncio.get_event_loop().run_until_complete(_invoke())

    def ai_generate(self, prompt: str) -> str:
        """Use LLM to generate content for form filling."""
        import asyncio

        from deepagents_cli.config import create_model

        full_prompt = f"""Generate content based on the following request.

Request: {prompt}

Respond with ONLY the generated content, no explanations or formatting."""

        model = create_model()

        async def _invoke() -> str:
            response = await model.ainvoke([{"role": "user", "content": full_prompt}])
            return response.content if hasattr(response, "content") else str(response)

        return asyncio.get_event_loop().run_until_complete(_invoke())

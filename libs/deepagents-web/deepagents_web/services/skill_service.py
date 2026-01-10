"""Skill service for CRUD operations."""

import re
import shutil
from pathlib import Path

from deepagents_cli.config import Settings
from deepagents_cli.skills.load import MAX_SKILL_NAME_LENGTH, list_skills

from deepagents_web.models.skill import SkillResponse


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

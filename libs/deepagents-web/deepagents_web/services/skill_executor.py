"""Skill executor for testing skills."""

from __future__ import annotations

import asyncio
import json
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import TYPE_CHECKING

import yaml

from deepagents_web.models.skill import SkillTestResult

if TYPE_CHECKING:
    from deepagents_web.models.skill import SkillResponse


class SkillExecutor:
    """Execute skills for testing."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=1)

    async def execute_skill(self, skill: SkillResponse) -> SkillTestResult:
        """Execute a skill and return results."""
        start_time = time.time()

        try:
            if skill.content and self._is_browser_skill(skill.content):
                return await self._execute_browser_skill(skill, start_time)
            return await self._execute_manual_skill(skill, start_time)
        except Exception as e:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )

    def _is_browser_skill(self, content: str) -> bool:
        """Check if skill is a browser skill."""
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if match:
            try:
                frontmatter = yaml.safe_load(match.group(1))
                return frontmatter.get("type") == "browser"
            except yaml.YAMLError:
                pass
        return False

    def _run_script_file(self, script_path: Path) -> dict:
        """Run script.py file and capture output."""
        import os
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        # Use Popen for better control over encoding on Windows
        process = subprocess.Popen(
            ["python", "-u", str(script_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=script_path.parent,
            env=env,
        )

        try:
            stdout_bytes, stderr_bytes = process.communicate(timeout=120)
        except subprocess.TimeoutExpired:
            process.kill()
            raise RuntimeError("Script execution timed out")

        # Decode with error handling
        stdout = stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""
        stderr = stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""

        # Check for errors
        if process.returncode != 0:
            error_msg = stderr.strip() if stderr else "Script execution failed"
            raise RuntimeError(error_msg)

        # Check for output
        stdout = stdout.strip()
        if not stdout:
            raise RuntimeError(f"Script produced no output. stderr: {stderr.strip()}")

        # Parse JSON output
        try:
            return json.loads(stdout)
        except json.JSONDecodeError as e:
            # Return raw output if not valid JSON
            return {"message": stdout[:2000], "parse_error": str(e)}

    async def _execute_browser_skill(
        self, skill: SkillResponse, start_time: float
    ) -> SkillTestResult:
        """Execute browser skill using script.py file."""
        if not skill.path:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error="Skill has no path",
            )

        skill_dir = Path(skill.path).parent
        script_path = skill_dir / "script.py"

        if not script_path.exists():
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"Script file not found: {script_path}",
            )

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(self._executor, self._run_script_file, script_path)

            # Format the result as readable output
            output = self._format_result(result)

            return SkillTestResult(
                success=True,
                duration_ms=(time.time() - start_time) * 1000,
                output=output,
            )
        except Exception as e:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"Execution failed: {e}",
            )

    def _format_result(self, result: dict) -> str:
        """Format result dict as readable output."""
        if not isinstance(result, dict):
            return str(result)

        output_parts = []

        if result.get("title"):
            output_parts.append(f"Page Title: {result['title']}")
        if result.get("url"):
            output_parts.append(f"URL: {result['url']}")

        # Handle content - could be string, list of strings, or list of dicts
        content = result.get("content")
        if content:
            output_parts.append("\n--- Page Content ---")
            if isinstance(content, str):
                output_parts.append(content[:2000])
            elif isinstance(content, list):
                for item in content[:5]:
                    if isinstance(item, dict):
                        output_parts.append(str(item.get("text", item))[:1000])
                    else:
                        output_parts.append(str(item)[:1000])

        # Handle tables
        tables = result.get("tables")
        if tables and isinstance(tables, list):
            output_parts.append("\n--- Tables ---")
            for i, table in enumerate(tables[:3], 1):
                output_parts.append(f"\nTable {i}:")
                if isinstance(table, list):
                    for row in table[:10]:
                        if isinstance(row, list):
                            output_parts.append(" | ".join(str(cell) for cell in row))
                        else:
                            output_parts.append(str(row))

        # Handle lists
        lists = result.get("lists")
        if lists and isinstance(lists, list):
            output_parts.append("\n--- Lists ---")
            for lst in lists[:5]:
                if isinstance(lst, list):
                    for item in lst[:10]:
                        output_parts.append(f"  • {item}")
                else:
                    output_parts.append(f"  • {lst}")

        # Handle links
        links = result.get("links")
        if links and isinstance(links, list):
            output_parts.append("\n--- Links ---")
            for link in links[:10]:
                if isinstance(link, dict):
                    output_parts.append(f"  [{link.get('text', '')}]({link.get('href', '')})")
                else:
                    output_parts.append(f"  {link}")

        # Handle error field
        if result.get("error"):
            output_parts.append(f"\n--- Error ---\n{result['error']}")

        # Handle message field
        if result.get("message"):
            output_parts.append(f"\n{result['message']}")

        return "\n".join(output_parts) if output_parts else json.dumps(result, indent=2, ensure_ascii=False)

    async def _execute_manual_skill(
        self, skill: SkillResponse, start_time: float
    ) -> SkillTestResult:
        """Execute manual skill (validation only for now)."""
        if not skill.content:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error="Skill has no content",
            )

        match = re.match(r"^---\s*\n(.*?)\n---", skill.content, re.DOTALL)
        if not match:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error="Invalid SKILL.md format: missing frontmatter",
            )

        try:
            frontmatter = yaml.safe_load(match.group(1))
            if not frontmatter.get("name") or not frontmatter.get("description"):
                return SkillTestResult(
                    success=False,
                    duration_ms=(time.time() - start_time) * 1000,
                    error="Invalid frontmatter: missing name or description",
                )
        except yaml.YAMLError as e:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"Invalid YAML frontmatter: {e}",
            )

        return SkillTestResult(
            success=True,
            duration_ms=(time.time() - start_time) * 1000,
            output="Manual skill validated successfully",
        )

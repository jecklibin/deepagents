"""Skill executor for testing skills."""

from __future__ import annotations

import asyncio
import json
import os
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

from deepagents_web.models.skill import SkillTestResult

if TYPE_CHECKING:
    from deepagents_web.models.skill import SkillResponse


class SkillExecutor:
    """Execute skills for testing."""

    def __init__(self) -> None:
        """Initialize the skill executor."""
        self._executor = ThreadPoolExecutor(max_workers=1)

    async def execute_skill(self, skill: SkillResponse) -> SkillTestResult:
        """Execute a skill and return results."""
        start_time = time.time()

        try:
            if skill.content and self._is_rpa_skill(skill.content):
                return await self._execute_rpa_skill(skill, start_time)
            if skill.content and self._is_browser_skill(skill.content):
                return await self._execute_browser_skill(skill, start_time)
            return await self._execute_manual_skill(skill, start_time)
        except Exception as e:  # noqa: BLE001
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )

    def _is_rpa_skill(self, content: str | None) -> bool:
        """Check if skill is an RPA skill."""
        if not content:
            return False
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if match:
            try:
                frontmatter = yaml.safe_load(match.group(1))
                return frontmatter.get("type") == "rpa"
            except yaml.YAMLError:
                pass
        return False

    def _is_browser_skill(self, content: str | None) -> bool:
        """Check if skill is a browser skill."""
        if not content:
            return False
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if match:
            try:
                frontmatter = yaml.safe_load(match.group(1))
                return frontmatter.get("type") == "browser"
            except yaml.YAMLError:
                pass
        return False

    def _run_script_file(self, script_path: Path) -> dict[str, Any]:
        """Run script.py file and capture output."""
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        # Use Popen for better control over encoding on Windows
        # Security: script_path is validated to be within skill directory
        process = subprocess.Popen(  # noqa: S603
            ["python", "-u", str(script_path)],  # noqa: S607
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=script_path.parent,
            env=env,
        )

        try:
            stdout_bytes, stderr_bytes = process.communicate(timeout=120)
        except subprocess.TimeoutExpired:
            process.kill()
            msg = "Script execution timed out"
            raise RuntimeError(msg) from None

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
            msg = f"Script produced no output. stderr: {stderr.strip()}"
            raise RuntimeError(msg)

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
        except Exception as e:  # noqa: BLE001
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"Execution failed: {e}",
            )

    async def _execute_rpa_skill(self, skill: SkillResponse, start_time: float) -> SkillTestResult:
        """Execute RPA skill using workflow.json file."""
        if not skill.path:
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error="Skill has no path",
            )

        skill_dir = Path(skill.path).parent
        workflow_path = skill_dir / "workflow.json"

        if not workflow_path.exists():
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"Workflow file not found: {workflow_path}",
            )

        try:
            from deepagents_web.models.rpa import RPAWorkflow
            from deepagents_web.rpa.engine import RPAEngine

            # Load workflow
            workflow_data = json.loads(workflow_path.read_text(encoding="utf-8"))
            workflow = RPAWorkflow.model_validate(workflow_data)

            # Execute in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            engine = RPAEngine()
            result = await loop.run_in_executor(self._executor, engine.execute, workflow, {})

            # Format output
            if result.success:
                output = json.dumps(result.output, indent=2, ensure_ascii=False)
                return SkillTestResult(
                    success=True,
                    duration_ms=(time.time() - start_time) * 1000,
                    output=output,
                )
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=result.error or "RPA execution failed",
            )
        except Exception as e:  # noqa: BLE001
            return SkillTestResult(
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                error=f"RPA execution failed: {e}",
            )

    def _format_result(self, result: dict[str, Any]) -> str:
        """Format result dict as readable output."""
        if not isinstance(result, dict):
            return str(result)

        extracted = result.get("extracted")
        if self._has_meaningful_extracted(extracted):
            # When the user recorded extraction steps, default to showing only the
            # extracted payload.
            # Page context can still be inspected by re-running with no extraction steps.
            return json.dumps({"extracted": extracted}, indent=2, ensure_ascii=False)

        output_parts: list[str] = []

        if result.get("title"):
            output_parts.append(f"Page Title: {result['title']}")
        if result.get("url"):
            output_parts.append(f"URL: {result['url']}")

        self._format_content(result, output_parts)
        self._format_tables(result, output_parts)
        self._format_lists(result, output_parts)
        self._format_links(result, output_parts)

        # Handle error field
        if result.get("error"):
            output_parts.append(f"\n--- Error ---\n{result['error']}")

        # Handle message field
        if result.get("message"):
            output_parts.append(f"\n{result['message']}")

        if output_parts:
            return "\n".join(output_parts)
        return json.dumps(result, indent=2, ensure_ascii=False)

    def _has_meaningful_extracted(self, extracted: Any) -> bool:
        if not isinstance(extracted, dict):
            return False
        if not extracted:
            return False
        for value in extracted.values():
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            if isinstance(value, (list, dict)) and not value:
                continue
            return True
        return False

    def _format_content(self, result: dict[str, Any], output_parts: list[str]) -> None:
        """Format content section."""
        content = result.get("content")
        if not content:
            return
        output_parts.append("\n--- Page Content ---")
        if isinstance(content, str):
            output_parts.append(content[:2000])
        elif isinstance(content, list):
            for item in content[:5]:
                if isinstance(item, dict):
                    output_parts.append(str(item.get("text", item))[:1000])
                else:
                    output_parts.append(str(item)[:1000])

    def _format_tables(self, result: dict[str, Any], output_parts: list[str]) -> None:
        """Format tables section."""
        tables = result.get("tables")
        if not tables or not isinstance(tables, list):
            return
        output_parts.append("\n--- Tables ---")
        for i, table in enumerate(tables[:3], 1):
            output_parts.append(f"\nTable {i}:")
            if isinstance(table, list):
                for row in table[:10]:
                    if isinstance(row, list):
                        output_parts.append(" | ".join(str(cell) for cell in row))
                    else:
                        output_parts.append(str(row))

    def _format_lists(self, result: dict[str, Any], output_parts: list[str]) -> None:
        """Format lists section."""
        lists = result.get("lists")
        if not lists or not isinstance(lists, list):
            return
        output_parts.append("\n--- Lists ---")
        for lst in lists[:5]:
            if isinstance(lst, list):
                output_parts.extend(f"  • {item}" for item in lst[:10])
            else:
                output_parts.append(f"  • {lst}")

    def _format_links(self, result: dict[str, Any], output_parts: list[str]) -> None:
        """Format links section."""
        links = result.get("links")
        if not links or not isinstance(links, list):
            return
        output_parts.append("\n--- Links ---")
        for link in links[:10]:
            if isinstance(link, dict):
                text = link.get("text", "")
                href = link.get("href", "")
                output_parts.append(f"  [{text}]({href})")
            else:
                output_parts.append(f"  {link}")

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

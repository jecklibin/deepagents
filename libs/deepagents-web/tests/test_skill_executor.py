"""Tests for skill executor service."""

import pytest

from deepagents_web.models.skill import SkillResponse, SkillTestResult
from deepagents_web.services.skill_executor import SkillExecutor


@pytest.fixture
def executor():
    """Create a skill executor instance."""
    return SkillExecutor()


def test_skill_executor_creation(executor):
    """Test SkillExecutor can be instantiated."""
    assert executor is not None


def test_is_browser_skill_with_type(executor):
    """Test _is_browser_skill detects browser type in frontmatter."""
    skill = SkillResponse(
        name="test-browser-skill",
        description="A browser skill",
        path="/test/path/SKILL.md",
        source="user",
        content="---\nname: test\ntype: browser\n---\n# Test",
    )
    assert executor._is_browser_skill(skill.content) is True


def test_is_browser_skill_without_type(executor):
    """Test _is_browser_skill returns False for non-browser skills."""
    skill = SkillResponse(
        name="test-manual-skill",
        description="A manual skill",
        path="/test/path/SKILL.md",
        source="user",
        content="---\nname: test\ndescription: test\n---\n# Test",
    )
    assert executor._is_browser_skill(skill.content) is False


def test_is_browser_skill_no_content(executor):
    """Test _is_browser_skill handles None content."""
    skill = SkillResponse(
        name="test-skill",
        description="A skill",
        path="/test/path/SKILL.md",
        source="user",
        content=None,
    )
    assert executor._is_browser_skill(skill.content) is False


@pytest.mark.asyncio
async def test_execute_manual_skill(executor):
    """Test executing a manual skill validates format."""
    skill = SkillResponse(
        name="test-manual",
        description="A manual skill",
        path="/test/path/SKILL.md",
        source="user",
        content="---\nname: test-manual\ndescription: A manual skill\n---\n# Test Manual\n\nInstructions here.",
    )
    result = await executor.execute_skill(skill)
    assert isinstance(result, SkillTestResult)
    assert result.success is True
    assert result.duration_ms >= 0


@pytest.mark.asyncio
async def test_execute_skill_no_content(executor):
    """Test executing a skill with no content fails."""
    skill = SkillResponse(
        name="empty-skill",
        description="Empty skill",
        path="/test/path/SKILL.md",
        source="user",
        content=None,
    )
    result = await executor.execute_skill(skill)
    assert result.success is False
    assert "no content" in result.error.lower()


@pytest.mark.asyncio
async def test_execute_skill_invalid_frontmatter(executor):
    """Test executing a skill with invalid frontmatter fails."""
    skill = SkillResponse(
        name="bad-skill",
        description="Bad skill",
        path="/test/path/SKILL.md",
        source="user",
        content="No frontmatter here, just text.",
    )
    result = await executor.execute_skill(skill)
    assert result.success is False
    assert "frontmatter" in result.error.lower()


def test_skill_test_result_model():
    """Test SkillTestResult model creation."""
    result = SkillTestResult(
        success=True,
        duration_ms=123.45,
        output="Test passed",
    )
    assert result.success is True
    assert result.duration_ms == 123.45
    assert result.output == "Test passed"
    assert result.error is None
    assert result.screenshots == []


def test_skill_test_result_with_error():
    """Test SkillTestResult with error."""
    result = SkillTestResult(
        success=False,
        duration_ms=50.0,
        error="Something went wrong",
    )
    assert result.success is False
    assert result.error == "Something went wrong"

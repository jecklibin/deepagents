"""Tests for recording service."""

import pytest

from deepagents_web.models.recording import ActionType, RecordedAction, RecordingSession


def test_action_type_enum():
    """Test ActionType enum values."""
    assert ActionType.NAVIGATE == "navigate"
    assert ActionType.CLICK == "click"
    assert ActionType.FILL == "fill"
    assert ActionType.SELECT == "select"
    assert ActionType.CHECK == "check"
    assert ActionType.UNCHECK == "uncheck"
    assert ActionType.PRESS == "press"
    assert ActionType.SCROLL == "scroll"
    assert ActionType.WAIT == "wait"


def test_recorded_action_model():
    """Test RecordedAction model creation."""
    action = RecordedAction(
        type=ActionType.CLICK,
        selector="#submit-btn",
        timestamp=1234567890.0,
    )
    assert action.type == ActionType.CLICK
    assert action.selector == "#submit-btn"
    assert action.value is None
    assert action.timestamp == 1234567890.0
    assert action.screenshot is None


def test_recorded_action_with_value():
    """Test RecordedAction with value field."""
    action = RecordedAction(
        type=ActionType.FILL,
        selector="input[name='email']",
        value="test@example.com",
        timestamp=1234567890.0,
    )
    assert action.type == ActionType.FILL
    assert action.value == "test@example.com"


def test_recording_session_model():
    """Test RecordingSession model creation."""
    session = RecordingSession(
        session_id="test-session-123",
        status="idle",
    )
    assert session.session_id == "test-session-123"
    assert session.status == "idle"
    assert session.actions == []
    assert session.start_url is None


def test_recording_session_with_actions():
    """Test RecordingSession with actions."""
    actions = [
        RecordedAction(type=ActionType.NAVIGATE, value="https://example.com", timestamp=1.0),
        RecordedAction(type=ActionType.CLICK, selector="#btn", timestamp=2.0),
    ]
    session = RecordingSession(
        session_id="test-session",
        status="stopped",
        actions=actions,
        start_url="https://example.com",
    )
    assert len(session.actions) == 2
    assert session.start_url == "https://example.com"
    assert session.status == "stopped"


@pytest.mark.asyncio
async def test_recording_service_singleton():
    """Test RecordingService singleton pattern."""
    from deepagents_web.services.recording_service import RecordingService

    service1 = await RecordingService.get_instance()
    service2 = await RecordingService.get_instance()
    assert service1 is service2


def test_recording_session_status_values():
    """Test valid status values for RecordingSession."""
    for status in ["idle", "recording", "stopped"]:
        session = RecordingSession(session_id="test", status=status)
        assert session.status == status

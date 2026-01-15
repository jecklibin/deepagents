"""Tests for enhanced browser recording features."""

from deepagents_web.services.recording_service import RecordingService


def test_recorder_js_loads() -> None:
    """Verify recorder.js can be loaded."""
    service = RecordingService()
    script = service._load_recorder_script()
    assert "__deepagentsRecorder__" in script
    assert "createRecorderUI" in script
    assert "getXPath" in script


def test_recorder_js_persistence_markers() -> None:
    """Ensure recorder.js uses sessionStorage persistence and AI polling hooks."""
    service = RecordingService()
    script = service._load_recorder_script()
    assert "__deepagents_actions__" in script
    assert "__aiExtractionRequest__" in script
    assert "__aiExtractionResponse__" in script
    assert "__aiFormFillResponse__" in script


def test_action_normalization_execute_js() -> None:
    """Verify execute_js actions normalize with JS code and variable names."""
    service = RecordingService()
    raw = {
        "type": "execute_js",
        "timestamp": 123,
        "js_code": "return { ok: true };",
        "variable_name": "ai_data_1",
        "selector": "#target",
        "xpath": "//div[@id='target']",
    }
    action = service._normalize_action(raw)
    assert action is not None
    assert action.type.value == "execute_js"
    assert action.js_code == "return { ok: true };"
    assert action.variable_name == "ai_data_1"

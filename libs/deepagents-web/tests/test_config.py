"""Tests for web configuration."""

from deepagents_web.config import WebSettings


def test_web_settings_cua_overrides(monkeypatch):
    """Ensure CUA web settings read overrides from environment."""
    monkeypatch.setenv("DEEPAGENTS_WEB_ENABLE_CUA", "false")
    monkeypatch.setenv("DEEPAGENTS_WEB_CUA_MODEL", "custom-model")
    monkeypatch.setenv("DEEPAGENTS_WEB_CUA_PROVIDER", "cloud")
    monkeypatch.setenv("DEEPAGENTS_WEB_CUA_OS", "linux")
    monkeypatch.setenv("DEEPAGENTS_WEB_CUA_TRAJECTORY_DIR", "C:\\tmp\\cua")

    settings = WebSettings.from_environment()

    assert settings.enable_cua is False
    assert settings.cua_model == "custom-model"
    assert settings.cua_provider == "cloud"
    assert settings.cua_os == "linux"
    assert settings.cua_trajectory_dir == "C:\\tmp\\cua"

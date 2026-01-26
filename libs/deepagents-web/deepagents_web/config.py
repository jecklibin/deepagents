"""Configuration for deepagents-web."""

import os
from pathlib import Path
from dataclasses import dataclass

import dotenv

dotenv.load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
dotenv.load_dotenv()


@dataclass
class WebSettings:
    """Web-specific settings for deepagents-web."""

    host: str
    port: int
    cors_origins: list[str]
    auto_approve: bool
    enable_cua: bool
    cua_model: str | None
    cua_provider: str | None
    cua_os: str | None
    cua_trajectory_dir: str | None
    vnc_url: str | None
    vnc_view_only: bool
    vnc_ws_url: str | None
    vnc_host: str
    vnc_port: int
    vnc_password: str | None
    playwright_ws_url: str | None
    playwright_cdp_url: str | None
    enable_mcp: bool

    @classmethod
    def from_environment(cls) -> "WebSettings":
        """Create settings from environment variables."""
        host = os.getenv("DEEPAGENTS_WEB_HOST", "0.0.0.0")  # noqa: S104
        port = int(os.getenv("DEEPAGENTS_WEB_PORT", "8000"))
        cors_origins_str = os.getenv("DEEPAGENTS_WEB_CORS_ORIGINS", "*")
        cors_origins = [o.strip() for o in cors_origins_str.split(",")]
        auto_approve = os.getenv("DEEPAGENTS_WEB_AUTO_APPROVE", "false").lower() == "true"
        enable_cua = os.getenv("DEEPAGENTS_WEB_ENABLE_CUA", "true").lower() == "true"

        cua_model = _optional_env("DEEPAGENTS_WEB_CUA_MODEL")
        cua_provider = _optional_env("DEEPAGENTS_WEB_CUA_PROVIDER")
        cua_os = _optional_env("DEEPAGENTS_WEB_CUA_OS")
        cua_trajectory_dir = _optional_env("DEEPAGENTS_WEB_CUA_TRAJECTORY_DIR")
        vnc_url = _optional_env("DEEPAGENTS_WEB_VNC_URL") or "/vnc/"
        vnc_view_only = os.getenv("DEEPAGENTS_WEB_VNC_VIEW_ONLY", "false").lower() == "true"
        vnc_ws_url = _optional_env("DEEPAGENTS_WEB_VNC_WS_URL")
        vnc_host = os.getenv("DEEPAGENTS_WEB_VNC_HOST", "127.0.0.1")
        vnc_port = int(os.getenv("DEEPAGENTS_WEB_VNC_PORT", "5900"))
        vnc_password = _optional_env("DEEPAGENTS_WEB_VNC_PASSWORD")
        playwright_ws_url = _optional_env("DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL")
        playwright_cdp_url = _optional_env("DEEPAGENTS_WEB_PLAYWRIGHT_CDP_URL")
        enable_mcp_env = _optional_env("DEEPAGENTS_WEB_ENABLE_MCP")
        if enable_mcp_env is None:
            enable_mcp = not (playwright_ws_url or playwright_cdp_url)
        else:
            enable_mcp = enable_mcp_env.lower() == "true"

        return cls(
            host=host,
            port=port,
            cors_origins=cors_origins,
            auto_approve=auto_approve,
            enable_cua=enable_cua,
            cua_model=cua_model,
            cua_provider=cua_provider,
            cua_os=cua_os,
            cua_trajectory_dir=cua_trajectory_dir,
            vnc_url=vnc_url,
            vnc_view_only=vnc_view_only,
            vnc_ws_url=vnc_ws_url,
            vnc_host=vnc_host,
            vnc_port=vnc_port,
            vnc_password=vnc_password,
            playwright_ws_url=playwright_ws_url,
            playwright_cdp_url=playwright_cdp_url,
            enable_mcp=enable_mcp,
        )


def _optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


web_settings = WebSettings.from_environment()

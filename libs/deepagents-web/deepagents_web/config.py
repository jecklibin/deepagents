"""Configuration for deepagents-web."""

import os
from dataclasses import dataclass

import dotenv

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
        )


def _optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


web_settings = WebSettings.from_environment()

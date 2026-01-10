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

    @classmethod
    def from_environment(cls) -> "WebSettings":
        """Create settings from environment variables."""
        host = os.getenv("DEEPAGENTS_WEB_HOST", "0.0.0.0")  # noqa: S104
        port = int(os.getenv("DEEPAGENTS_WEB_PORT", "8000"))
        cors_origins_str = os.getenv("DEEPAGENTS_WEB_CORS_ORIGINS", "*")
        cors_origins = [o.strip() for o in cors_origins_str.split(",")]
        auto_approve = os.getenv("DEEPAGENTS_WEB_AUTO_APPROVE", "false").lower() == "true"

        return cls(
            host=host,
            port=port,
            cors_origins=cors_origins,
            auto_approve=auto_approve,
        )


web_settings = WebSettings.from_environment()

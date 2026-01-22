"""Browser profile management service."""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from deepagents_web.models.browser import BrowserProfile, BrowserProfileResponse


class BrowserService:
    """Service for managing browser profiles."""

    def __init__(self, profiles_dir: Path | None = None) -> None:
        """Initialize the browser service."""
        if profiles_dir is None:
            profiles_dir = Path.home() / ".deepagents" / "browser-profiles"
        self.profiles_dir = profiles_dir
        self.profiles_dir.mkdir(parents=True, exist_ok=True)

    def list_profiles(self) -> list[BrowserProfileResponse]:
        """List all browser profiles."""
        profiles = []
        for profile_dir in self.profiles_dir.iterdir():
            if profile_dir.is_dir():
                metadata_file = profile_dir / "metadata.json"
                if metadata_file.exists():
                    data = json.loads(metadata_file.read_text(encoding="utf-8"))
                    profiles.append(
                        BrowserProfileResponse(
                            id=data["id"],
                            name=data["name"],
                            created_at=datetime.fromisoformat(data["created_at"]),
                            last_used_at=(
                                datetime.fromisoformat(data["last_used_at"])
                                if data.get("last_used_at")
                                else None
                            ),
                        )
                    )
        return sorted(profiles, key=lambda p: p.created_at, reverse=True)

    def create_profile(self, name: str) -> BrowserProfileResponse:
        """Create a new browser profile."""
        profile_id = str(uuid.uuid4())
        profile_dir = self.profiles_dir / profile_id
        profile_dir.mkdir(parents=True, exist_ok=True)

        now = datetime.now(tz=UTC)
        metadata = {
            "id": profile_id,
            "name": name,
            "created_at": now.isoformat(),
            "last_used_at": None,
        }

        metadata_file = profile_dir / "metadata.json"
        metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        return BrowserProfileResponse(
            id=profile_id,
            name=name,
            created_at=now,
            last_used_at=None,
        )

    def get_profile(self, profile_id: str) -> BrowserProfile | None:
        """Get a browser profile by ID."""
        profile_dir = self.profiles_dir / profile_id
        metadata_file = profile_dir / "metadata.json"

        if not metadata_file.exists():
            return None

        data = json.loads(metadata_file.read_text(encoding="utf-8"))
        storage_state_path = profile_dir / "storage_state.json"

        return BrowserProfile(
            id=data["id"],
            name=data["name"],
            created_at=datetime.fromisoformat(data["created_at"]),
            last_used_at=(
                datetime.fromisoformat(data["last_used_at"]) if data.get("last_used_at") else None
            ),
            storage_state_path=str(storage_state_path) if storage_state_path.exists() else None,
        )

    def delete_profile(self, profile_id: str) -> bool:
        """Delete a browser profile."""
        profile_dir = self.profiles_dir / profile_id
        if not profile_dir.exists():
            return False
        shutil.rmtree(profile_dir)
        return True

    def get_storage_state_path(self, profile_id: str) -> Path | None:
        """Get the storage state file path for a profile."""
        profile_dir = self.profiles_dir / profile_id
        if not profile_dir.exists():
            return None
        return profile_dir / "storage_state.json"

    def update_last_used(self, profile_id: str) -> None:
        """Update the last used timestamp for a profile."""
        profile_dir = self.profiles_dir / profile_id
        metadata_file = profile_dir / "metadata.json"

        if not metadata_file.exists():
            return

        data = json.loads(metadata_file.read_text(encoding="utf-8"))
        data["last_used_at"] = datetime.now(tz=UTC).isoformat()
        metadata_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

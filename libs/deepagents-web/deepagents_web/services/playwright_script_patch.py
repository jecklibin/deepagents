"""Patch Playwright scripts to use remote connections when configured."""

from __future__ import annotations

import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Optional

def prepare_script_for_remote(script_path: Path) -> tuple[Path, Optional[Path]]:
    """Return a patched script path if remote Playwright is configured."""
    if not _has_remote_config():
        return script_path, None

    code = script_path.read_text(encoding="utf-8")
    patched = _patch_playwright_launch(code)
    if not patched:
        return script_path, None

    temp_dir = Path(tempfile.mkdtemp(prefix="deepagents-playwright-"))
    patched_path = temp_dir / script_path.name
    patched_path.write_text(patched, encoding="utf-8")
    return patched_path, temp_dir


def cleanup_patched_script(temp_dir: Optional[Path]) -> None:
    """Remove temporary patch directory."""
    if not temp_dir:
        return
    shutil.rmtree(temp_dir, ignore_errors=True)


def _patch_playwright_launch(code: str) -> str | None:
    if "sync_playwright" not in code:
        return None
    if "_connect_or_launch" in code:
        return None

    launch_pattern = re.compile(
        r"(?m)^(?P<indent>\\s*)browser\\s*=\\s*p\\.(?P<type>chromium|firefox|webkit)"
        r"\\.launch\\((?P<args>[^)]*)\\)"
    )
    match = launch_pattern.search(code)
    if not match:
        return None

    headless = "False"
    headless_match = re.search(r"headless\\s*=\\s*(True|False)", match.group("args"))
    if headless_match:
        headless = headless_match.group(1)

    indent = match.group("indent")
    browser_type = match.group("type")
    launch_block = _render_connection_block(indent, browser_type, headless)
    code = code[: match.start()] + launch_block + code[match.end() :]

    import_pattern = re.compile(
        r"^\\s*from\\s+playwright\\.sync_api\\s+import\\s+.*\\bsync_playwright\\b.*$",
        re.M,
    )
    import_match = import_pattern.search(code)
    if not import_match:
        return None

    insert_at = import_match.end()
    injection = "\nimport os\n"
    return code[:insert_at] + injection + code[insert_at:]


def patch_script_in_place(script_path: Path) -> bool:
    """Patch a Playwright script in place when remote config is set."""
    if not _has_remote_config():
        return False
    code = script_path.read_text(encoding="utf-8")
    patched = _patch_playwright_launch(code)
    if not patched or patched == code:
        return False
    script_path.write_text(patched, encoding="utf-8")
    return True


def _has_remote_config() -> bool:
    return bool(
        os.getenv("DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL")
        or os.getenv("DEEPAGENTS_WEB_PLAYWRIGHT_CDP_URL")
    )


def _render_connection_block(indent: str, browser_type: str, headless: str) -> str:
    connect_line = f"{indent}    browser = p.{browser_type}.connect(ws_url)"
    cdp_line = (
        f"{indent}    browser = p.chromium.connect_over_cdp(cdp_url)"
        if browser_type == "chromium"
        else f"{indent}    browser = p.{browser_type}.launch(headless={headless})"
    )
    return (
        f"{indent}ws_url = os.getenv(\"DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL\")\n"
        f"{indent}cdp_url = os.getenv(\"DEEPAGENTS_WEB_PLAYWRIGHT_CDP_URL\")\n"
        f"{indent}if ws_url:\n"
        f"{connect_line}\n"
        f"{indent}elif cdp_url:\n"
        f"{cdp_line}\n"
        f"{indent}else:\n"
        f"{indent}    browser = p.{browser_type}.launch(headless={headless})"
    )

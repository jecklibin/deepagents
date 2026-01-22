"""File atomic operations for RPA."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from deepagents_web.rpa.actions.base import ExecutionContext, action


@action(
    "file_read",
    name="Read File",
    description="Read content from a file",
    category="file",
    params=[
        {"key": "path", "type": "string", "required": True},
        {"key": "encoding", "type": "string", "default": "utf-8"},
    ],
    output_type="string",
)
def file_read(
    context: ExecutionContext,  # noqa: ARG001
    *,
    path: str,
    encoding: str = "utf-8",
    **kwargs: Any,  # noqa: ARG001
) -> str:
    """Read content from a file."""
    file_path = Path(path)
    if not file_path.exists():
        msg = f"File not found: {path}"
        raise FileNotFoundError(msg)
    return file_path.read_text(encoding=encoding)


@action(
    "file_write",
    name="Write File",
    description="Write content to a file",
    category="file",
    params=[
        {"key": "path", "type": "string", "required": True},
        {"key": "content", "type": "string", "required": True},
        {"key": "encoding", "type": "string", "default": "utf-8"},
        {"key": "append", "type": "bool", "default": False},
    ],
)
def file_write(
    context: ExecutionContext,  # noqa: ARG001
    *,
    path: str,
    content: str,
    encoding: str = "utf-8",
    append: bool = False,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Write content to a file."""
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)

    mode = "a" if append else "w"
    with file_path.open(mode, encoding=encoding) as f:
        f.write(content)


@action(
    "file_exists",
    name="Check File Exists",
    description="Check if a file or directory exists",
    category="file",
    params=[
        {"key": "path", "type": "string", "required": True},
    ],
    output_type="bool",
)
def file_exists(
    context: ExecutionContext,  # noqa: ARG001
    *,
    path: str,
    **kwargs: Any,  # noqa: ARG001
) -> bool:
    """Check if a file exists."""
    return Path(path).exists()


@action(
    "file_delete",
    name="Delete File",
    description="Delete a file or directory",
    category="file",
    params=[
        {"key": "path", "type": "string", "required": True},
        {"key": "recursive", "type": "bool", "default": False},
    ],
)
def file_delete(
    context: ExecutionContext,  # noqa: ARG001
    *,
    path: str,
    recursive: bool = False,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Delete a file or directory."""
    file_path = Path(path)
    if not file_path.exists():
        return

    if file_path.is_dir():
        if recursive:
            shutil.rmtree(file_path)
        else:
            file_path.rmdir()
    else:
        file_path.unlink()


@action(
    "file_copy",
    name="Copy File",
    description="Copy a file or directory",
    category="file",
    params=[
        {"key": "source", "type": "string", "required": True},
        {"key": "destination", "type": "string", "required": True},
    ],
)
def file_copy(
    context: ExecutionContext,  # noqa: ARG001
    *,
    source: str,
    destination: str,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Copy a file or directory."""
    src_path = Path(source)
    dst_path = Path(destination)

    if not src_path.exists():
        msg = f"Source not found: {source}"
        raise FileNotFoundError(msg)

    dst_path.parent.mkdir(parents=True, exist_ok=True)

    if src_path.is_dir():
        shutil.copytree(src_path, dst_path)
    else:
        shutil.copy2(src_path, dst_path)


@action(
    "file_move",
    name="Move File",
    description="Move a file or directory",
    category="file",
    params=[
        {"key": "source", "type": "string", "required": True},
        {"key": "destination", "type": "string", "required": True},
    ],
)
def file_move(
    context: ExecutionContext,  # noqa: ARG001
    *,
    source: str,
    destination: str,
    **kwargs: Any,  # noqa: ARG001
) -> None:
    """Move a file or directory."""
    src_path = Path(source)
    dst_path = Path(destination)

    if not src_path.exists():
        msg = f"Source not found: {source}"
        raise FileNotFoundError(msg)

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src_path), str(dst_path))

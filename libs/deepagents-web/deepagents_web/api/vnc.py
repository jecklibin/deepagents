"""REST API endpoints for VNC configuration and proxy."""

from __future__ import annotations

import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from deepagents_web.config import web_settings

router = APIRouter(prefix="/vnc", tags=["vnc"])


class VncConfigResponse(BaseModel):
    """Response model for VNC configuration."""

    url: str | None
    view_only: bool
    ws_url: str | None
    password: str | None


@router.get("/config")
async def get_config() -> VncConfigResponse:
    """Return VNC configuration defaults for the frontend."""
    return VncConfigResponse(
        url=web_settings.vnc_url,
        view_only=web_settings.vnc_view_only,
        ws_url=web_settings.vnc_ws_url,
        password=web_settings.vnc_password,
    )


@router.websocket("/ws")
async def websocket_vnc_proxy(websocket: WebSocket) -> None:
    """Proxy VNC TCP traffic over WebSocket (websockify-style)."""
    await websocket.accept()
    try:
        reader, writer = await asyncio.open_connection(web_settings.vnc_host, web_settings.vnc_port)
    except Exception:  # noqa: BLE001
        await websocket.close(code=1011)
        return

    async def _ws_to_tcp() -> None:
        try:
            while True:
                data = await websocket.receive_bytes()
                if not data:
                    break
                writer.write(data)
                await writer.drain()
        except WebSocketDisconnect:
            pass
        except Exception:  # noqa: BLE001
            pass

    async def _tcp_to_ws() -> None:
        try:
            while True:
                data = await reader.read(8192)
                if not data:
                    break
                await websocket.send_bytes(data)
        except WebSocketDisconnect:
            pass
        except Exception:  # noqa: BLE001
            pass

    ws_task = asyncio.create_task(_ws_to_tcp())
    tcp_task = asyncio.create_task(_tcp_to_ws())
    done, pending = await asyncio.wait({ws_task, tcp_task}, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    writer.close()
    with contextlib.suppress(Exception):
        await writer.wait_closed()
    with contextlib.suppress(Exception):
        await websocket.close()

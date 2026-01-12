"""WebSocket endpoint for browser recording."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from deepagents_web.models.recording import RecordedAction, RecordingWebSocketMessage
from deepagents_web.services.recording_service import RecordingService

router = APIRouter(tags=["recording"])
logger = logging.getLogger(__name__)

# Store background tasks to prevent garbage collection
_background_tasks: set[asyncio.Task[Any]] = set()


async def _handle_start(
    websocket: WebSocket,
    service: RecordingService,
    data: dict[str, Any],
) -> str:
    """Handle start recording message."""
    start_url = data.get("start_url", "about:blank")

    def on_action(action: RecordedAction) -> None:
        task = asyncio.create_task(
            websocket.send_json(
                RecordingWebSocketMessage(
                    type="action", data=action.model_dump()
                ).model_dump()
            )
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    session = await service.start_recording(start_url=start_url, on_action=on_action)

    await websocket.send_json(
        RecordingWebSocketMessage(
            type="session",
            data={
                "session_id": session.session_id,
                "status": session.status,
                "start_url": session.start_url,
            },
        ).model_dump()
    )
    return session.session_id


async def _handle_stop(
    websocket: WebSocket,
    service: RecordingService,
    data: dict[str, Any],
    current_session_id: str | None,
) -> None:
    """Handle stop recording message."""
    session_id = data.get("session_id") or current_session_id
    if not session_id:
        await websocket.send_json(
            RecordingWebSocketMessage(
                type="error", data="No active recording session"
            ).model_dump()
        )
        return

    session = await service.stop_recording(session_id)

    await websocket.send_json(
        RecordingWebSocketMessage(
            type="session",
            data={
                "session_id": session.session_id,
                "status": session.status,
                "actions": [a.model_dump() for a in session.actions],
            },
        ).model_dump()
    )


async def _handle_status(
    websocket: WebSocket,
    service: RecordingService,
    data: dict[str, Any],
    current_session_id: str | None,
) -> None:
    """Handle status request message."""
    session_id = data.get("session_id") or current_session_id
    if not session_id:
        await websocket.send_json(
            RecordingWebSocketMessage(
                type="status", data={"session_id": None, "status": "idle"}
            ).model_dump()
        )
        return

    session = service.get_session(session_id)
    if session:
        await websocket.send_json(
            RecordingWebSocketMessage(
                type="status",
                data={
                    "session_id": session.session_id,
                    "status": session.status,
                    "action_count": len(session.actions),
                },
            ).model_dump()
        )
    else:
        await websocket.send_json(
            RecordingWebSocketMessage(type="error", data="Session not found").model_dump()
        )


@router.websocket("/ws/recording")
async def websocket_recording(websocket: WebSocket) -> None:
    """WebSocket endpoint for browser recording."""
    await websocket.accept()

    service = await RecordingService.get_instance()
    current_session_id: str | None = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                current_session_id = await _handle_start(websocket, service, data)
            elif msg_type == "stop":
                await _handle_stop(websocket, service, data, current_session_id)
                current_session_id = None
            elif msg_type == "status":
                await _handle_status(websocket, service, data, current_session_id)

    except WebSocketDisconnect:
        if current_session_id:
            with contextlib.suppress(Exception):
                await service.stop_recording(current_session_id)
    except Exception as e:
        logger.exception("Recording WebSocket error")
        with contextlib.suppress(Exception):
            await websocket.send_json(
                RecordingWebSocketMessage(type="error", data=str(e)).model_dump()
            )

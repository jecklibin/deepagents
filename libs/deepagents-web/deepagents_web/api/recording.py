"""WebSocket endpoint for browser recording."""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from deepagents_web.models.recording import RecordingWebSocketMessage
from deepagents_web.services.recording_service import RecordingService

router = APIRouter(tags=["recording"])
logger = logging.getLogger(__name__)


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
                start_url = data.get("start_url", "about:blank")

                def on_action(action):
                    import asyncio

                    asyncio.create_task(
                        websocket.send_json(
                            RecordingWebSocketMessage(
                                type="action", data=action.model_dump()
                            ).model_dump()
                        )
                    )

                session = await service.start_recording(
                    start_url=start_url, on_action=on_action
                )
                current_session_id = session.session_id

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

            elif msg_type == "stop":
                session_id = data.get("session_id") or current_session_id
                if not session_id:
                    await websocket.send_json(
                        RecordingWebSocketMessage(
                            type="error", data="No active recording session"
                        ).model_dump()
                    )
                    continue

                session = await service.stop_recording(session_id)
                current_session_id = None

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

            elif msg_type == "status":
                session_id = data.get("session_id") or current_session_id
                if session_id:
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
                            RecordingWebSocketMessage(
                                type="error", data="Session not found"
                            ).model_dump()
                        )
                else:
                    await websocket.send_json(
                        RecordingWebSocketMessage(
                            type="status", data={"session_id": None, "status": "idle"}
                        ).model_dump()
                    )

    except WebSocketDisconnect:
        if current_session_id:
            try:
                await service.stop_recording(current_session_id)
            except Exception:
                pass
    except Exception as e:
        logger.exception("Recording WebSocket error")
        try:
            await websocket.send_json(
                RecordingWebSocketMessage(type="error", data=str(e)).model_dump()
            )
        except Exception:
            pass

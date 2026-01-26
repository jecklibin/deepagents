"""WebSocket endpoint for chat."""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from deepagents_web.config import web_settings
from deepagents_web.models.chat import InterruptResponse, UserMessage, WebSocketMessage
from deepagents_web.services.agent_service import AgentService

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)

# Global agent service instance
_agent_service: AgentService | None = None


def get_agent_service() -> AgentService:
    """Get or create the agent service."""
    global _agent_service  # noqa: PLW0603
    if _agent_service is None:
        _agent_service = AgentService(
            auto_approve=web_settings.auto_approve,
            enable_cua=web_settings.enable_cua,
            enable_mcp=web_settings.enable_mcp,
            cua_model=web_settings.cua_model,
            cua_provider=web_settings.cua_provider,
            cua_os=web_settings.cua_os,
            cua_trajectory_dir=web_settings.cua_trajectory_dir,
        )
    return _agent_service


async def _receive_stop_signal(websocket: WebSocket, session: object) -> None:
    """Listen for stop signal while streaming."""
    while True:
        try:
            data = await websocket.receive_json()
            msg = UserMessage(**data)
            if msg.type == "stop":
                session.cancel()  # type: ignore[attr-defined]
                break
        except Exception:  # noqa: BLE001
            break


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, agent: str = "agent") -> None:  # noqa: ARG001
    """WebSocket endpoint for real-time chat with the agent."""
    await websocket.accept()

    service = get_agent_service()
    session_id = await service.create_session()
    session = service.get_session(session_id)

    if not session:
        await websocket.close(code=1011, reason="Failed to create session")
        return

    try:
        await websocket.send_json({"type": "session", "data": {"session_id": session_id}})

        while True:
            data = await websocket.receive_json()
            msg = UserMessage(**data)

            if msg.type == "message" and msg.content:
                # Start listening for stop signal concurrently
                stop_task = asyncio.create_task(_receive_stop_signal(websocket, session))

                try:
                    async for ws_msg in service.stream_response(session, msg.content):
                        await websocket.send_json(ws_msg.model_dump())
                finally:
                    stop_task.cancel()
                    with suppress(asyncio.CancelledError):
                        await stop_task

                await websocket.send_json(WebSocketMessage(type="done", data=None).model_dump())

            elif msg.type == "stop":
                session.cancel()

            elif msg.type == "interrupt_response" and msg.data:
                response = InterruptResponse(**msg.data)
                # Start listening for stop signal concurrently
                stop_task = asyncio.create_task(_receive_stop_signal(websocket, session))

                try:
                    async for ws_msg in service.resume_with_decision(session, response):
                        await websocket.send_json(ws_msg.model_dump())
                finally:
                    stop_task.cancel()
                    with suppress(asyncio.CancelledError):
                        await stop_task

                await websocket.send_json(WebSocketMessage(type="done", data=None).model_dump())

    except WebSocketDisconnect:
        service.delete_session(session_id)
    except (ValueError, KeyError, RuntimeError) as e:
        logger.exception("WebSocket error")
        await websocket.send_json(WebSocketMessage(type="error", data=str(e)).model_dump())
        service.delete_session(session_id)

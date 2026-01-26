"""FastAPI application entry point for deepagents-web."""

from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from deepagents_web.api import browsers, chat, hybrid, recording, rpa, sessions, skills, vnc
from deepagents_web.config import web_settings

app = FastAPI(
    title="DeepAgents Web",
    description="Web interface for DeepAgents",
    version="0.0.1",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=web_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(browsers.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(recording.router, prefix="/api")
app.include_router(rpa.router, prefix="/api")
app.include_router(hybrid.router, prefix="/api")
app.include_router(vnc.router, prefix="/api")

# Mount static files
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    vnc_dir = static_dir / "vnc"
    if vnc_dir.exists():
        app.mount("/vnc", StaticFiles(directory=str(vnc_dir), html=True), name="vnc")


@app.get("/")
async def root() -> dict[str, str]:
    """Redirect to the main page."""
    from fastapi.responses import RedirectResponse

    return RedirectResponse(url="/static/index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


def main() -> None:
    """Run the web server."""
    uvicorn.run(
        "deepagents_web:app",
        host=web_settings.host,
        port=web_settings.port,
        reload=False,
    )


if __name__ == "__main__":
    main()

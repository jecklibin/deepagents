#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-$USER}"
mkdir -p "$XDG_RUNTIME_DIR"

VNC_PORT="${VNC_PORT:-5900}"
VNC_PASSWORD="${VNC_PASSWORD:-}"
PW_SERVER_PORT="${PW_SERVER_PORT:-9323}"

if [[ -z "$VNC_PASSWORD" ]]; then
  echo "VNC_PASSWORD is required" >&2
  exit 1
fi

Xvfb "$DISPLAY" -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

if command -v openbox-session >/dev/null 2>&1; then
  openbox-session &
elif command -v openbox >/dev/null 2>&1; then
  openbox &
fi

x11vnc -display "$DISPLAY" -forever -shared -rfbport "$VNC_PORT" -passwd "$VNC_PASSWORD" -listen 0.0.0.0 &

if ! command -v python >/dev/null 2>&1; then
  echo "python is required to run the Playwright server." >&2
  wait "$XVFB_PID"
  exit 1
fi

if ! python -m playwright --help >/dev/null 2>&1; then
  echo "Playwright CLI is missing. Run: python -m pip install playwright && python -m playwright install chromium" >&2
  wait "$XVFB_PID"
  exit 1
fi

CONFIG_PATH="$(mktemp)"
trap 'rm -f "$CONFIG_PATH"' EXIT
cat >"$CONFIG_PATH" <<JSON
{
  "headless": false,
  "host": "0.0.0.0",
  "port": ${PW_SERVER_PORT},
  "args": ["--start-maximized"]
}
JSON

python -m playwright launch-server --browser chromium --config "$CONFIG_PATH"

wait "$XVFB_PID"

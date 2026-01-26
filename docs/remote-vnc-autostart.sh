#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-$USER}"
mkdir -p "$XDG_RUNTIME_DIR"

VNC_PORT="${VNC_PORT:-5900}"
VNC_PASSWORD="${VNC_PASSWORD:-}"
CDP_PORT="${CDP_PORT:-9222}"

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

if command -v google-chrome >/dev/null 2>&1; then
  BROWSER=google-chrome
elif command -v chromium-browser >/dev/null 2>&1; then
  BROWSER=chromium-browser
elif command -v chromium >/dev/null 2>&1; then
  BROWSER=chromium
elif command -v firefox >/dev/null 2>&1; then
  BROWSER=firefox
else
  echo "No browser found (google-chrome/chromium/firefox)." >&2
  wait "$XVFB_PID"
  exit 1
fi

BROWSER_ARGS=(--no-sandbox --disable-dev-shm-usage --disable-gpu --user-data-dir=/tmp/deepagents-browser --start-maximized)
if [[ "$BROWSER" == "google-chrome" || "$BROWSER" == "chromium" || "$BROWSER" == "chromium-browser" ]]; then
  BROWSER_ARGS+=(--remote-debugging-port="$CDP_PORT" --remote-debugging-address=0.0.0.0)
fi

"$BROWSER" "${BROWSER_ARGS[@]}" about:blank &

wait "$XVFB_PID"

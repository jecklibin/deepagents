# Local/Remote VNC + DeepAgents Web Setup

This guide shows how to run a local or remote VNC server and let deepagents-web proxy it at `/vnc/`.

## Architecture

- VNC server provides a desktop session (local or remote).
- deepagents-web exposes a WebSocket proxy at `/api/vnc/ws` and serves a noVNC page at `/vnc/`.
- deepagents-ui loads `/vnc/` in the center panel, so the browser you automate appears there.

## 1) Install a VNC server (Windows)

Recommended: TightVNC Server.

1. Download and install TightVNC Server.
2. Set a VNC password (required for remote control).
3. Start the TightVNC Server service.
4. Confirm it listens on TCP port `5900`.

> Note: If Windows Firewall prompts, allow inbound TCP 5900 on private network.

## 2) Configure deepagents-web

Set environment variables (PowerShell examples):

```powershell
$env:DEEPAGENTS_WEB_VNC_HOST = "127.0.0.1" # remote host IP if VNC runs elsewhere
$env:DEEPAGENTS_WEB_VNC_PORT = "5900"
$env:DEEPAGENTS_WEB_VNC_PASSWORD = "your_vnc_password"
$env:DEEPAGENTS_WEB_VNC_VIEW_ONLY = "false"
```

Defaults:
- `DEEPAGENTS_WEB_VNC_URL` is `/vnc/` by default.
- `DEEPAGENTS_WEB_VNC_WS_URL` can be set if you use an external websockify, but is optional here.

Optional (remote Playwright):

```powershell
$env:DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL = "ws://REMOTE_LINUX_IP:9323/"
# Optional: CDP mode (Chrome with --remote-debugging-port):
# $env:DEEPAGENTS_WEB_PLAYWRIGHT_CDP_URL = "http://REMOTE_LINUX_IP:9222"
```

Notes:
- Playwright Server is recommended; it gives the agent a remote browser instance.
- CDP requires a Chromium/Chrome with `--remote-debugging-port=9222`.
- Expose the port carefully (prefer VPN/allowlist).

## 3) Start deepagents-web (backend)

```powershell
cd D:\code\deepagents\libs\deepagents-web
uv sync --all-groups
uv run deepagents-web
```

Backend will serve:
- API: `http://localhost:8000/api/...`
- noVNC page: `http://localhost:8000/vnc/`
- VNC WebSocket proxy: `ws://localhost:8000/api/vnc/ws`

## 4) Start deepagents-ui (frontend)

```powershell
cd D:\code\deepagents\libs\deepagents-web\frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/vnc` to the backend.
Open the UI at:

```
http://localhost:3000
```

## 5) Verify

1. In the UI, the center panel should show the VNC desktop.
2. Start browser recording or run a browser skill.
3. The Playwright-launched browser will appear inside the VNC panel.

## Troubleshooting

- Blank VNC panel:
  - Confirm TightVNC is running and port 5900 is open.
  - Check `DEEPAGENTS_WEB_VNC_PASSWORD` matches your VNC server password.
  - Open `http://localhost:8000/vnc/` directly to confirm the viewer loads.
  - Ensure `DEEPAGENTS_WEB_VNC_HOST` points to the correct machine and restart `deepagents-web`.

- Vite dev server shows 404 for `/vnc/`:
  - Ensure you are using `libs/deepagents-web/frontend/vite.config.js` with `/vnc` proxy.

- CDN blocked for noVNC:
  - The `/vnc/` page loads noVNC from a CDN. If your network blocks it, let me know and I will vendor the JS locally.

## Optional: Linux (headless)

If you later test on Linux, you can run a headless desktop like this:

```bash
sudo apt-get install -y xvfb x11vnc openbox
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99
openbox &
x11vnc -display :99 -forever -shared -rfbport 5900 -passwd your_vnc_password -listen 0.0.0.0
```

Point `DEEPAGENTS_WEB_VNC_HOST` to that host and keep the rest the same.

## Remote Linux VNC (deepagents-web runs locally)

1) On the remote Linux server:

```bash
sudo apt-get install -y xvfb x11vnc openbox
python -m pip install playwright
python -m playwright install chromium
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99
openbox &
x11vnc -display :99 -forever -shared -rfbport 5900 -passwd your_vnc_password -listen 0.0.0.0
```

2) Start a Playwright Server (recommended)

Use the helper script that starts Xvfb + openbox + x11vnc + Playwright server:

```bash
chmod +x /path/to/deepagents/docs/remote-playwright-server.sh
VNC_PASSWORD="your_vnc_password" PW_SERVER_PORT="9323" /path/to/deepagents/docs/remote-playwright-server.sh
```

If you want a custom VNC port:

```bash
VNC_PASSWORD="your_vnc_password" VNC_PORT="5900" PW_SERVER_PORT="9323" /path/to/deepagents/docs/remote-playwright-server.sh
```

Keep the script running (tmux/systemd) so the VNC desktop stays available.
The script prints a `ws://...` endpoint; use that value (replace `0.0.0.0` with the server IP) for `DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL`.

Optional (CDP mode instead of Playwright Server):

```bash
chmod +x /path/to/deepagents/docs/remote-vnc-autostart.sh
VNC_PASSWORD="your_vnc_password" CDP_PORT="9222" /path/to/deepagents/docs/remote-vnc-autostart.sh
```

3) On the local machine (where deepagents-web runs):

```powershell
$env:DEEPAGENTS_WEB_VNC_HOST = "REMOTE_LINUX_IP"
$env:DEEPAGENTS_WEB_VNC_PORT = "5900"
$env:DEEPAGENTS_WEB_VNC_PASSWORD = "your_vnc_password"
$env:DEEPAGENTS_WEB_PLAYWRIGHT_WS_URL = "ws://REMOTE_LINUX_IP:9323/"
```

4) Open the port on the remote server/security group (TCP 5900 and 9323).

5) Validate TCP reachability from local machine:

```powershell
Test-NetConnection REMOTE_LINUX_IP -Port 5900
```

If TCP is not reachable, the viewer will stay on "Connecting".


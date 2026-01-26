/**
 * VNC manager for embedding a remote browser session via a VNC web client.
 */

class VncManager {
    constructor() {
        this.urlInput = document.getElementById('vnc-url');
        this.connectBtn = document.getElementById('vnc-connect-btn');
        this.disconnectBtn = document.getElementById('vnc-disconnect-btn');
        this.openBtn = document.getElementById('vnc-open-btn');
        this.statusEl = document.getElementById('vnc-status');
        this.frame = document.getElementById('vnc-frame');
        this.storageKey = 'deepagents.vnc.url';
        this.connected = false;
        this.viewOnly = false;
    }

    async init() {
        if (!this.urlInput || !this.connectBtn || !this.disconnectBtn || !this.frame) {
            return;
        }

        this.bindEvents();
        this.loadSavedUrl();
        await this.loadServerConfig();
        this.updateStatus('Idle');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.urlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.connect();
            }
        });
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => this.openInNewTab());
        }
        this.frame.addEventListener('load', () => {
            if (this.connected) {
                this.updateStatus('Connected', 'connected');
            }
        });
    }

    loadSavedUrl() {
        const saved = window.localStorage.getItem(this.storageKey);
        if (saved && this.urlInput.value.trim() === '') {
            this.urlInput.value = saved;
        }
    }

    async loadServerConfig() {
        try {
            const response = await fetch('/api/vnc/config');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            if (data && data.url && this.urlInput.value.trim() === '') {
                this.urlInput.value = data.url;
            }
            this.viewOnly = Boolean(data && data.view_only);
        } catch (error) {
            // Ignore missing config endpoint.
        }
    }

    connect() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.updateStatus('VNC URL is required', 'error');
            return;
        }
        this.frame.src = url;
        window.localStorage.setItem(this.storageKey, url);
        this.connected = true;
        this.connectBtn.disabled = true;
        this.disconnectBtn.disabled = false;
        const modeHint = this.viewOnly ? ' (view-only)' : '';
        this.updateStatus(`Loading session${modeHint}...`);
    }

    disconnect() {
        this.frame.src = 'about:blank';
        this.connected = false;
        this.connectBtn.disabled = false;
        this.disconnectBtn.disabled = true;
        this.updateStatus('Disconnected');
    }

    openInNewTab() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.updateStatus('VNC URL is required', 'error');
            return;
        }
        window.open(url, '_blank', 'noopener');
    }

    updateStatus(message, state = '') {
        if (!this.statusEl) {
            return;
        }
        this.statusEl.textContent = message;
        this.statusEl.classList.remove('connected', 'error');
        if (state) {
            this.statusEl.classList.add(state);
        }
    }
}

window.VncManager = VncManager;

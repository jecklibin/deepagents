/**
 * Recording manager for browser action recording
 */

class RecordingManager {
    constructor() {
        this.ws = null;
        this.sessionId = null;
        this.actions = [];
        this.status = 'idle';
        this.onActionCallback = null;
        this.onStatusCallback = null;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/recording`);

            this.ws.onopen = () => {
                console.log('Recording WebSocket connected');
                resolve();
            };

            this.ws.onerror = (error) => {
                console.error('Recording WebSocket error:', error);
                reject(error);
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                console.log('Recording WebSocket closed');
                this.status = 'idle';
                if (this.onStatusCallback) {
                    this.onStatusCallback(this.status);
                }
            };
        });
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'session':
                this.sessionId = msg.data.session_id;
                this.status = msg.data.status;
                if (msg.data.actions) {
                    this.actions = msg.data.actions;
                }
                if (this.onStatusCallback) {
                    this.onStatusCallback(this.status, msg.data);
                }
                break;

            case 'action':
                this.actions.push(msg.data);
                if (this.onActionCallback) {
                    this.onActionCallback(msg.data);
                }
                break;

            case 'status':
                this.status = msg.data.status;
                if (this.onStatusCallback) {
                    this.onStatusCallback(this.status, msg.data);
                }
                break;

            case 'error':
                console.error('Recording error:', msg.data);
                if (this.onStatusCallback) {
                    this.onStatusCallback('error', { error: msg.data });
                }
                break;
        }
    }

    async startRecording(startUrl, profileId = null) {
        await this.connect();
        this.actions = [];
        this.ws.send(JSON.stringify({
            type: 'start',
            start_url: startUrl || 'about:blank',
            profile_id: profileId
        }));
    }

    async stopRecording() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected');
        }
        this.ws.send(JSON.stringify({
            type: 'stop',
            session_id: this.sessionId
        }));
    }

    getActions() {
        return this.actions;
    }

    getSessionId() {
        return this.sessionId;
    }

    onAction(callback) {
        this.onActionCallback = callback;
    }

    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.sessionId = null;
        this.actions = [];
        this.status = 'idle';
    }
}

// Export for use in skills.js
window.RecordingManager = RecordingManager;

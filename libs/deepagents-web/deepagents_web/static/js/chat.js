/**
 * Chat WebSocket handling for DeepAgents Web
 */

class ChatManager {
    constructor() {
        this.ws = null;
        this.sessionId = null;
        this.messagesEl = document.getElementById('messages');
        this.todoListEl = document.getElementById('todo-list');
        this.inputEl = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.currentAssistantMessage = null;
        this.pendingInterrupt = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.inputEl.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 200) + 'px';
        });

        // Interrupt modal buttons
        document.getElementById('approve-btn').addEventListener('click', () => {
            this.handleInterruptDecision('approve');
        });
        document.getElementById('reject-btn').addEventListener('click', () => {
            this.handleInterruptDecision('reject');
        });
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/chat`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.sendBtn.disabled = false;
        };

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.sendBtn.disabled = true;
            // Reconnect after delay
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'session':
                this.sessionId = msg.data.session_id;
                break;
            case 'text':
                this.appendText(msg.data);
                break;
            case 'tool_call':
                this.showToolCall(msg.data);
                break;
            case 'interrupt':
                this.showInterrupt(msg.data);
                break;
            case 'todo':
                this.updateTodoList(msg.data);
                break;
            case 'error':
                this.showError(msg.data);
                break;
            case 'done':
                this.finishMessage();
                break;
        }
    }

    sendMessage() {
        const content = this.inputEl.value.trim();
        if (!content || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Show user message
        this.addMessage('user', content);

        // Send to server
        this.ws.send(JSON.stringify({
            type: 'message',
            content: content
        }));

        // Clear input
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
        this.sendBtn.disabled = true;
    }

    addMessage(role, content) {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${role}`;
        msgEl.innerHTML = this.renderMarkdown(content);
        this.messagesEl.appendChild(msgEl);
        this.scrollToBottom();
        return msgEl;
    }

    appendText(text) {
        if (!this.currentAssistantMessage) {
            this.currentAssistantMessage = this.addMessage('assistant', '');
            this.currentAssistantMessage.textContent = '';
        }
        this.currentAssistantMessage.textContent += text;
        this.scrollToBottom();
    }

    showToolCall(data) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message tool';
        msgEl.innerHTML = `<strong>🔧 ${data.name}</strong><pre>${JSON.stringify(data.args, null, 2)}</pre>`;
        this.messagesEl.appendChild(msgEl);
        this.scrollToBottom();
    }

    showInterrupt(data) {
        this.pendingInterrupt = data;
        const detailsEl = document.getElementById('interrupt-details');
        detailsEl.innerHTML = `
            <div class="tool-name">🔧 ${data.tool_name}</div>
            <p>${data.description || 'Tool requires approval'}</p>
            <pre>${JSON.stringify(data.args, null, 2)}</pre>
        `;
        document.getElementById('interrupt-modal').classList.remove('hidden');
    }

    handleInterruptDecision(decision) {
        if (!this.pendingInterrupt || !this.ws) return;

        this.ws.send(JSON.stringify({
            type: 'interrupt_response',
            data: {
                interrupt_id: this.pendingInterrupt.interrupt_id,
                decision: decision
            }
        }));

        document.getElementById('interrupt-modal').classList.add('hidden');
        this.pendingInterrupt = null;
    }

    updateTodoList(todos) {
        if (!todos || todos.length === 0) {
            this.todoListEl.classList.add('hidden');
            return;
        }

        this.todoListEl.classList.remove('hidden');
        this.todoListEl.innerHTML = '<h4>📋 Tasks</h4>';

        todos.forEach(todo => {
            const itemEl = document.createElement('div');
            itemEl.className = `todo-item ${todo.status}`;
            const icon = todo.status === 'completed' ? '✓' :
                        todo.status === 'in_progress' ? '⏳' : '○';
            itemEl.textContent = `${icon} ${todo.content}`;
            this.todoListEl.appendChild(itemEl);
        });
    }

    showError(error) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message error';
        msgEl.textContent = `Error: ${error}`;
        this.messagesEl.appendChild(msgEl);
        this.scrollToBottom();
    }

    finishMessage() {
        if (this.currentAssistantMessage) {
            // Render markdown for the complete message
            const text = this.currentAssistantMessage.textContent;
            this.currentAssistantMessage.innerHTML = this.renderMarkdown(text);
        }
        this.currentAssistantMessage = null;
        this.sendBtn.disabled = false;
    }

    renderMarkdown(text) {
        // Simple markdown rendering
        return text
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        this.messagesEl.parentElement.scrollTop = this.messagesEl.parentElement.scrollHeight;
    }
}

// Export for use in app.js
window.ChatManager = ChatManager;

/**
 * Skills management UI for DeepAgents Web
 */

class SkillsManager {
    constructor() {
        this.skillsListEl = document.getElementById('skills-list');
        this.modal = document.getElementById('skill-modal');
        this.testResultModal = document.getElementById('test-result-modal');
        this.editingSkill = null;
        this.activeTab = 'manual';
        this.recordingManager = new RecordingManager();
        this.browserManager = new BrowserManager();
        this.actionEditor = new ActionEditor('recorded-actions');

        this.setupEventListeners();
        this.setupTabListeners();
        this.setupRecordingListeners();
        this.initBrowserProfiles();
    }

    // Normalize skill name to valid format (lowercase, hyphens)
    normalizeName(name) {
        return name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    setupEventListeners() {
        document.getElementById('create-skill-btn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('save-skill-btn').addEventListener('click', () => {
            this.saveSkill();
        });

        document.getElementById('test-skill-btn').addEventListener('click', () => {
            this.testSkill();
        });

        document.getElementById('generate-skill-btn').addEventListener('click', () => {
            this.generateFromNL();
        });

        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        this.modal.querySelector('.modal-cancel').addEventListener('click', () => {
            this.closeModal();
        });

        // Test result modal
        if (this.testResultModal) {
            this.testResultModal.querySelector('.modal-close').addEventListener('click', () => {
                this.testResultModal.classList.add('hidden');
            });
            this.testResultModal.querySelector('.modal-close-btn').addEventListener('click', () => {
                this.testResultModal.classList.add('hidden');
            });
        }
    }

    setupTabListeners() {
        const tabs = this.modal.querySelectorAll('.skill-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    setupRecordingListeners() {
        document.getElementById('start-recording-btn').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('stop-recording-btn').addEventListener('click', () => {
            this.stopRecording();
        });

        // Preview and export buttons
        const previewBtn = document.getElementById('preview-recording-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewRecording());
        }

        const exportMcpBtn = document.getElementById('export-mcp-btn');
        if (exportMcpBtn) {
            exportMcpBtn.addEventListener('click', () => this.exportAsMCP());
        }

        this.recordingManager.onAction((action) => {
            this.actionEditor.addAction(action);
        });

        this.recordingManager.onStatus((status, data) => {
            this.updateRecordingStatus(status, data);
        });

        // Listen for action editor changes
        this.actionEditor.onChange((actions) => {
            this.recordingManager.actions = actions;
        });
    }

    async initBrowserProfiles() {
        await this.browserManager.loadProfiles();
        this.browserManager.renderProfileSelector('profile-selector-container');
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        this.modal.querySelectorAll('.skill-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.modal.querySelectorAll('.skill-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    async loadSkills() {
        try {
            const response = await fetch('/api/skills');
            const data = await response.json();
            this.renderSkills(data.skills);
        } catch (error) {
            console.error('Failed to load skills:', error);
        }
    }

    renderSkills(skills) {
        this.skillsListEl.innerHTML = '';

        if (skills.length === 0) {
            this.skillsListEl.innerHTML = '<p style="color: var(--text-dim);">No skills found. Create your first skill!</p>';
            return;
        }

        skills.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.innerHTML = `
                <div class="skill-card-header">
                    <h4>${skill.name}</h4>
                    <div class="skill-card-actions">
                        <button class="btn-small btn-test" data-name="${skill.name}">Test</button>
                        <button class="btn-small btn-delete" data-name="${skill.name}">Delete</button>
                    </div>
                </div>
                <p>${skill.description}</p>
                <span class="skill-source ${skill.source}">${skill.source}</span>
            `;
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-test') && !e.target.classList.contains('btn-delete')) {
                    this.openSkill(skill.name);
                }
            });
            card.querySelector('.btn-test').addEventListener('click', (e) => {
                e.stopPropagation();
                this.testSkillByName(skill.name);
            });
            card.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSkill(skill.name);
            });
            this.skillsListEl.appendChild(card);
        });
    }

    async openSkill(name) {
        try {
            const response = await fetch(`/api/skills/${name}`);
            if (!response.ok) throw new Error('Skill not found');
            const skill = await response.json();
            this.openModal(skill);
        } catch (error) {
            console.error('Failed to load skill:', error);
        }
    }

    openModal(skill = null) {
        this.editingSkill = skill;
        const titleEl = document.getElementById('modal-title');
        const nameEl = document.getElementById('skill-name');
        const descEl = document.getElementById('skill-description');
        const contentEl = document.getElementById('skill-content');
        const testBtn = document.getElementById('test-skill-btn');

        // Reset to manual tab
        this.switchTab('manual');

        if (skill) {
            titleEl.textContent = 'Edit Skill';
            nameEl.value = skill.name;
            nameEl.disabled = true;
            descEl.value = skill.description;
            contentEl.value = skill.content || '';
            testBtn.style.display = 'inline-block';
        } else {
            titleEl.textContent = 'Create Skill';
            nameEl.value = '';
            nameEl.disabled = false;
            descEl.value = '';
            contentEl.value = '';
            testBtn.style.display = 'none';

            // Clear NL fields
            document.getElementById('nl-skill-name').value = '';
            document.getElementById('nl-skill-goal').value = '';
            document.getElementById('nl-skill-steps').value = '';

            // Clear recording fields
            document.getElementById('rec-skill-name').value = '';
            document.getElementById('rec-skill-description').value = '';
            document.getElementById('rec-start-url').value = '';
            this.actionEditor.setActions([]);
            document.getElementById('recording-status').textContent = '';
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.editingSkill = null;
        this.recordingManager.disconnect();
    }

    async saveSkill() {
        if (this.activeTab === 'natural-language') {
            await this.saveFromNL();
        } else if (this.activeTab === 'record-browser') {
            await this.saveFromRecording();
        } else {
            await this.saveManual();
        }
    }

    async saveManual() {
        const name = document.getElementById('skill-name').value.trim();
        const description = document.getElementById('skill-description').value.trim();
        const content = document.getElementById('skill-content').value;

        if (!name || !description) {
            alert('Name and description are required');
            return;
        }

        try {
            let response;
            if (this.editingSkill) {
                response = await fetch(`/api/skills/${name}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description, content })
                });
            } else {
                response = await fetch('/api/skills', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description, content: content || null })
                });
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save skill');
            }

            this.closeModal();
            this.loadSkills();
        } catch (error) {
            alert(error.message);
        }
    }

    async generateFromNL() {
        const name = document.getElementById('nl-skill-name').value.trim();
        const goal = document.getElementById('nl-skill-goal').value.trim();
        const steps = document.getElementById('nl-skill-steps').value.trim();

        if (!name || !goal || !steps) {
            alert('Name, goal, and steps are required');
            return;
        }

        const btn = document.getElementById('generate-skill-btn');
        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            const response = await fetch('/api/skills/from-nl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, goal, steps })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate skill');
            }

            this.closeModal();
            this.loadSkills();
        } catch (error) {
            alert(error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate SKILL.md';
        }
    }

    async saveFromNL() {
        await this.generateFromNL();
    }

    async saveFromRecording() {
        const rawName = document.getElementById('rec-skill-name').value.trim();
        const name = this.normalizeName(rawName);
        const description = document.getElementById('rec-skill-description').value.trim();
        const sessionId = this.recordingManager.getSessionId();

        if (!name || !description) {
            alert('Name and description are required');
            return;
        }

        if (!sessionId) {
            alert('No recording session. Please record browser actions first.');
            return;
        }

        try {
            const response = await fetch('/api/skills/from-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, session_id: sessionId })
            });

            if (!response.ok) {
                const error = await response.json();
                const detail = error.detail;
                if (Array.isArray(detail)) {
                    throw new Error(detail.map(e => e.msg).join(', '));
                }
                throw new Error(detail || 'Failed to create skill from recording');
            }

            this.closeModal();
            this.loadSkills();
        } catch (error) {
            alert(error.message);
        }
    }

    async startRecording() {
        const startUrl = document.getElementById('rec-start-url').value.trim() || 'about:blank';
        const profileId = this.browserManager.getSelectedProfileId();

        document.getElementById('start-recording-btn').disabled = true;
        document.getElementById('stop-recording-btn').disabled = false;
        document.getElementById('recorded-actions').innerHTML = '';
        document.getElementById('recording-status').textContent = 'Starting...';

        try {
            await this.recordingManager.startRecording(startUrl, profileId);
        } catch (error) {
            alert('Failed to start recording: ' + error.message);
            document.getElementById('start-recording-btn').disabled = false;
            document.getElementById('stop-recording-btn').disabled = true;
        }
    }

    async stopRecording() {
        document.getElementById('recording-status').textContent = 'Stopping...';

        try {
            await this.recordingManager.stopRecording();
            document.getElementById('start-recording-btn').disabled = false;
            document.getElementById('stop-recording-btn').disabled = true;
        } catch (error) {
            alert('Failed to stop recording: ' + error.message);
        }
    }

    updateRecordingStatus(status, data) {
        const statusEl = document.getElementById('recording-status');

        if (status === 'recording') {
            statusEl.textContent = 'Recording... Perform actions in the browser window.';
            statusEl.className = 'recording-status recording';
        } else if (status === 'stopped') {
            statusEl.textContent = `Recording stopped. ${data.actions?.length || 0} actions captured.`;
            statusEl.className = 'recording-status stopped';
            document.getElementById('start-recording-btn').disabled = false;
            document.getElementById('stop-recording-btn').disabled = true;

            // Load actions into editor
            if (data.actions) {
                this.actionEditor.setActions(data.actions);
            }
        } else if (status === 'error') {
            statusEl.textContent = 'Error: ' + (data.error || 'Unknown error');
            statusEl.className = 'recording-status error';
        } else {
            statusEl.textContent = '';
            statusEl.className = 'recording-status';
        }
    }

    async previewRecording() {
        const actions = this.actionEditor.getActions();
        if (actions.length === 0) {
            alert('No actions to preview. Record some actions first.');
            return;
        }

        const profileId = this.browserManager.getSelectedProfileId();

        try {
            const response = await fetch('/api/recording/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions, profile_id: profileId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Preview failed');
            }

            const result = await response.json();
            alert(`Preview completed!\nURL: ${result.url}\nTitle: ${result.title}`);
        } catch (error) {
            alert('Preview failed: ' + error.message);
        }
    }

    exportAsMCP() {
        const actions = this.actionEditor.getActions();
        if (actions.length === 0) {
            alert('No actions to export. Record some actions first.');
            return;
        }

        const mcpCommands = this.actionEditor.exportAsMCP();
        const json = JSON.stringify(mcpCommands, null, 2);

        // Show in modal
        this.showExportModal('MCP Commands', json);
    }

    showExportModal(title, content) {
        let modal = document.getElementById('export-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'export-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea class="export-content" readonly>${content}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="copy-export-btn">Copy to Clipboard</button>
                    <button class="btn-primary modal-close-btn">Close</button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('#copy-export-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                alert('Copied to clipboard!');
            });
        });
    }

    async testSkill() {
        if (!this.editingSkill) return;
        await this.testSkillByName(this.editingSkill.name);
    }

    async testSkillByName(name) {
        try {
            const response = await fetch(`/api/skills/${name}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const result = await response.json();
            this.showTestResult(name, result);
        } catch (error) {
            this.showTestResult(name, {
                success: false,
                error: error.message,
                duration_ms: 0
            });
        }
    }

    showTestResult(name, result) {
        const contentEl = document.getElementById('test-result-content');

        const statusClass = result.success ? 'test-success' : 'test-failure';
        const statusText = result.success ? 'Success' : 'Failed';

        contentEl.innerHTML = `
            <div class="test-result ${statusClass}">
                <h4>Skill: ${name}</h4>
                <p class="test-status">${statusText}</p>
                <p class="test-duration">Duration: ${result.duration_ms.toFixed(2)}ms</p>
                ${result.output ? `<p class="test-output">${result.output}</p>` : ''}
                ${result.error ? `<p class="test-error">${result.error}</p>` : ''}
            </div>
        `;

        this.testResultModal.classList.remove('hidden');
    }

    async deleteSkill(name) {
        if (!confirm(`Delete skill "${name}"?`)) return;

        try {
            const response = await fetch(`/api/skills/${name}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete skill');
            }

            this.loadSkills();
        } catch (error) {
            alert(error.message);
        }
    }
}

// Export for use in app.js
window.SkillsManager = SkillsManager;

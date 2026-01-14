/**
 * Action Editor - BrowserWing-style visual action editor
 * Allows editing, reordering, and deleting recorded browser actions
 */

class ActionEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.actions = [];
        this.selectedIndex = -1;
        this.onChangeCallback = null;
        this.draggedIndex = null;
    }

    setActions(actions) {
        this.actions = actions.map((a, i) => ({ ...a, id: i }));
        this.render();
    }

    getActions() {
        return this.actions;
    }

    onChange(callback) {
        this.onChangeCallback = callback;
    }

    addAction(action) {
        this.actions.push({ ...action, id: this.actions.length });
        this.render();
        this.notifyChange();
    }

    updateAction(index, updates) {
        if (index >= 0 && index < this.actions.length) {
            this.actions[index] = { ...this.actions[index], ...updates };
            this.render();
            this.notifyChange();
        }
    }

    deleteAction(index) {
        if (index >= 0 && index < this.actions.length) {
            this.actions.splice(index, 1);
            this.selectedIndex = -1;
            this.render();
            this.notifyChange();
        }
    }

    moveAction(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        const [action] = this.actions.splice(fromIndex, 1);
        this.actions.splice(toIndex, 0, action);
        this.render();
        this.notifyChange();
    }

    notifyChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback(this.actions);
        }
    }

    render() {
        if (!this.container) return;

        if (this.actions.length === 0) {
            this.container.innerHTML = `
                <div class="action-editor-empty">
                    <p>No actions recorded yet.</p>
                    <p class="hint">Start recording to capture browser actions, or add AI actions manually.</p>
                    <div class="add-action-buttons">
                        <button class="btn-small btn-add-extract" title="Add Extract action">+ Extract</button>
                        <button class="btn-small btn-add-ai-extract" title="Add AI Extract action">+ AI Extract</button>
                        <button class="btn-small btn-add-ai-fill" title="Add AI Fill action">+ AI Fill</button>
                    </div>
                </div>
            `;
            this.setupAddButtons();
            return;
        }

        this.container.innerHTML = `
            <div class="action-editor-toolbar">
                <span class="action-count">${this.actions.length} actions</span>
                <div class="toolbar-buttons">
                    <button class="btn-small btn-add-extract" title="Add Extract">+ Extract</button>
                    <button class="btn-small btn-add-ai-extract" title="Add AI Extract">+ AI Extract</button>
                    <button class="btn-small btn-add-ai-fill" title="Add AI Fill">+ AI Fill</button>
                    <button class="btn-small btn-clear-all" title="Clear all">Clear All</button>
                </div>
            </div>
            <div class="action-list"></div>
        `;

        const listEl = this.container.querySelector('.action-list');

        this.actions.forEach((action, index) => {
            const item = this.createActionItem(action, index);
            listEl.appendChild(item);
        });

        this.setupAddButtons();

        // Clear all button
        this.container.querySelector('.btn-clear-all').addEventListener('click', () => {
            if (confirm('Clear all recorded actions?')) {
                this.actions = [];
                this.render();
                this.notifyChange();
            }
        });
    }

    setupAddButtons() {
        const addExtract = this.container.querySelector('.btn-add-extract');
        const addAiExtract = this.container.querySelector('.btn-add-ai-extract');
        const addAiFill = this.container.querySelector('.btn-add-ai-fill');

        if (addExtract) {
            addExtract.addEventListener('click', () => {
                this.addAction({
                    type: 'extract',
                    selector: '',
                    output_key: 'extracted',
                    timestamp: Date.now()
                });
                this.openEditDialog(this.actions.length - 1);
            });
        }

        if (addAiExtract) {
            addAiExtract.addEventListener('click', () => {
                this.addAction({
                    type: 'ai_extract',
                    prompt: '',
                    output_key: 'ai_extracted',
                    timestamp: Date.now()
                });
                this.openEditDialog(this.actions.length - 1);
            });
        }

        if (addAiFill) {
            addAiFill.addEventListener('click', () => {
                this.addAction({
                    type: 'ai_fill',
                    selector: '',
                    prompt: '',
                    timestamp: Date.now()
                });
                this.openEditDialog(this.actions.length - 1);
            });
        }
    }

    createActionItem(action, index) {
        const item = document.createElement('div');
        item.className = 'action-item';
        item.draggable = true;
        item.dataset.index = index;

        if (index === this.selectedIndex) {
            item.classList.add('selected');
        }

        const icon = this.getActionIcon(action.type);
        const description = this.formatActionDescription(action);

        item.innerHTML = `
            <div class="action-drag-handle" title="Drag to reorder">&#x2630;</div>
            <div class="action-icon">${icon}</div>
            <div class="action-content">
                <div class="action-type">${action.type}</div>
                <div class="action-desc">${description}</div>
            </div>
            <div class="action-buttons">
                <button class="btn-icon btn-edit" title="Edit action">&#x270E;</button>
                <button class="btn-icon btn-delete" title="Delete action">&#x2715;</button>
            </div>
        `;

        // Click to select
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.action-buttons') && !e.target.closest('.action-drag-handle')) {
                this.selectedIndex = index;
                this.render();
            }
        });

        // Edit button
        item.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditDialog(index);
        });

        // Delete button
        item.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAction(index);
        });

        // Drag and drop
        item.addEventListener('dragstart', (e) => {
            this.draggedIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.draggedIndex = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (this.draggedIndex !== null && this.draggedIndex !== index) {
                this.moveAction(this.draggedIndex, index);
            }
        });

        return item;
    }

    getActionIcon(type) {
        const icons = {
            'navigate': '&#x1F310;',
            'click': '&#x1F446;',
            'fill': '&#x270D;',
            'press': '&#x2328;',
            'select': '&#x25BC;',
            'check': '&#x2611;',
            'uncheck': '&#x2610;',
            'scroll': '&#x2195;',
            'hover': '&#x1F5B1;',
            'drag': '&#x2194;',
            'extract': '&#x1F4E5;',
            'ai_extract': '&#x1F916;',
            'ai_fill': '&#x2728;'
        };
        return icons[type] || '&#x2022;';
    }

    formatActionDescription(action) {
        let desc = '';

        if (action.type === 'navigate') {
            desc = action.value || '';
        } else if (action.type === 'extract') {
            desc = `${action.selector || ''} → ${action.output_key || 'extracted'}`;
        } else if (action.type === 'ai_extract') {
            desc = `"${this.truncate(action.prompt || '', 30)}" → ${action.output_key || 'ai_extracted'}`;
        } else if (action.type === 'ai_fill') {
            desc = `${action.selector || ''} ← AI: "${this.truncate(action.prompt || '', 25)}"`;
        } else if (action.selector) {
            desc = `${action.selector}`;
            if (action.value) {
                desc += ` = "${this.truncate(action.value, 30)}"`;
            }
        } else if (action.value) {
            desc = `"${this.truncate(action.value, 40)}"`;
        }

        return this.escapeHtml(desc);
    }

    truncate(str, maxLen) {
        if (!str) return '';
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    openEditDialog(index) {
        const action = this.actions[index];

        // Create modal
        let modal = document.getElementById('action-edit-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'action-edit-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const isAiAction = ['extract', 'ai_extract', 'ai_fill'].includes(action.type);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Action</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Action Type</label>
                        <select id="edit-action-type">
                            <option value="navigate">Navigate</option>
                            <option value="click">Click</option>
                            <option value="fill">Fill</option>
                            <option value="press">Press Key</option>
                            <option value="select">Select</option>
                            <option value="check">Check</option>
                            <option value="uncheck">Uncheck</option>
                            <option value="scroll">Scroll</option>
                            <option value="hover">Hover</option>
                            <option value="extract">Extract Data</option>
                            <option value="ai_extract">AI Extract</option>
                            <option value="ai_fill">AI Fill</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Selector</label>
                        <input type="text" id="edit-action-selector" placeholder="CSS selector">
                    </div>
                    <div class="form-group">
                        <label>Value</label>
                        <input type="text" id="edit-action-value" placeholder="Value (URL, text, etc.)">
                    </div>
                    <div class="form-group" id="prompt-group" style="display:${isAiAction ? 'block' : 'none'}">
                        <label>AI Prompt</label>
                        <textarea id="edit-action-prompt" rows="3" placeholder="Describe what to extract or generate"></textarea>
                    </div>
                    <div class="form-group" id="output-key-group" style="display:${['extract', 'ai_extract'].includes(action.type) ? 'block' : 'none'}">
                        <label>Output Key</label>
                        <input type="text" id="edit-action-output-key" placeholder="Variable name to store result">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-cancel">Cancel</button>
                    <button class="btn-primary modal-save">Save</button>
                </div>
            </div>
        `;

        // Populate fields
        modal.querySelector('#edit-action-type').value = action.type;
        modal.querySelector('#edit-action-selector').value = action.selector || '';
        modal.querySelector('#edit-action-value').value = action.value || '';
        modal.querySelector('#edit-action-prompt').value = action.prompt || '';
        modal.querySelector('#edit-action-output-key').value = action.output_key || '';

        // Show/hide AI fields based on type
        modal.querySelector('#edit-action-type').addEventListener('change', (e) => {
            const type = e.target.value;
            const showPrompt = ['extract', 'ai_extract', 'ai_fill'].includes(type);
            const showOutputKey = ['extract', 'ai_extract'].includes(type);
            modal.querySelector('#prompt-group').style.display = showPrompt ? 'block' : 'none';
            modal.querySelector('#output-key-group').style.display = showOutputKey ? 'block' : 'none';
        });

        modal.classList.remove('hidden');

        // Event handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('.modal-save').addEventListener('click', () => {
            const updates = {
                type: modal.querySelector('#edit-action-type').value,
                selector: modal.querySelector('#edit-action-selector').value || null,
                value: modal.querySelector('#edit-action-value').value || null,
                prompt: modal.querySelector('#edit-action-prompt').value || null,
                output_key: modal.querySelector('#edit-action-output-key').value || null
            };
            this.updateAction(index, updates);
            modal.classList.add('hidden');
        });
    }

    // Export actions as MCP commands
    exportAsMCP() {
        const commands = this.actions.map(action => {
            return this.actionToMCPCommand(action);
        });
        return commands;
    }

    actionToMCPCommand(action) {
        const baseCmd = {
            tool: 'browser_action',
            args: {
                action: action.type
            }
        };

        if (action.selector) {
            baseCmd.args.selector = action.selector;
        }
        if (action.value) {
            baseCmd.args.value = action.value;
        }
        if (action.x !== null && action.y !== null) {
            baseCmd.args.coordinates = { x: action.x, y: action.y };
        }
        if (action.prompt) {
            baseCmd.args.prompt = action.prompt;
        }
        if (action.output_key) {
            baseCmd.args.output_key = action.output_key;
        }

        return baseCmd;
    }

    // Export as Playwright script
    exportAsPlaywright() {
        let script = `from playwright.sync_api import sync_playwright
import json

def run_skill():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
`;

        this.actions.forEach(action => {
            script += this.actionToPlaywrightCode(action);
        });

        script += `
            # Extract page content
            result = {
                "url": page.url,
                "title": page.title(),
                "content": page.content()[:5000]
            }
            return result
        finally:
            browser.close()

if __name__ == "__main__":
    result = run_skill()
    print(json.dumps(result, ensure_ascii=False, indent=2))
`;
        return script;
    }

    actionToPlaywrightCode(action) {
        const indent = '            ';
        let code = '';

        switch (action.type) {
            case 'navigate':
                code = `page.goto("${action.value}")\n`;
                code += `${indent}page.wait_for_load_state('networkidle')\n`;
                break;
            case 'click':
                if (action.robust_selector) {
                    code = `page.${action.robust_selector}.click()\n`;
                } else if (action.selector) {
                    code = `page.locator("${action.selector}").click()\n`;
                } else if (action.x !== null && action.y !== null) {
                    code = `page.mouse.click(${action.x}, ${action.y})\n`;
                }
                code += `${indent}page.wait_for_load_state('domcontentloaded')\n`;
                break;
            case 'fill':
                if (action.robust_selector) {
                    code = `page.${action.robust_selector}.fill("${action.value}")\n`;
                } else if (action.selector) {
                    code = `page.locator("${action.selector}").fill("${action.value}")\n`;
                }
                break;
            case 'press':
                code = `page.keyboard.press("${action.value}")\n`;
                break;
            case 'select':
                if (action.selector) {
                    code = `page.locator("${action.selector}").select_option("${action.value}")\n`;
                }
                break;
            case 'check':
                if (action.selector) {
                    code = `page.locator("${action.selector}").check()\n`;
                }
                break;
            case 'uncheck':
                if (action.selector) {
                    code = `page.locator("${action.selector}").uncheck()\n`;
                }
                break;
            case 'scroll':
                code = `page.evaluate("window.scrollTo(0, ${action.value || 0})")\n`;
                break;
            case 'hover':
                if (action.selector) {
                    code = `page.locator("${action.selector}").hover()\n`;
                }
                break;
            case 'extract':
                if (action.selector) {
                    const key = action.output_key || 'extracted';
                    code = `${key} = page.locator("${action.selector}").first.text_content()\n`;
                }
                break;
            case 'ai_extract':
                const aiKey = action.output_key || 'ai_extracted';
                const prompt = (action.prompt || '').replace(/"/g, '\\"');
                code = `# AI Extract: ${prompt}\n`;
                code += `${indent}content = page.content()[:10000]\n`;
                code += `${indent}${aiKey} = ai_extract(content, "${prompt}")\n`;
                break;
            case 'ai_fill':
                if (action.selector) {
                    const fillPrompt = (action.prompt || '').replace(/"/g, '\\"');
                    code = `# AI Fill: ${fillPrompt}\n`;
                    code += `${indent}generated = ai_generate("${fillPrompt}")\n`;
                    code += `${indent}page.locator("${action.selector}").fill(generated)\n`;
                }
                break;
        }

        return indent + code;
    }
}

// Export for use in other modules
window.ActionEditor = ActionEditor;

/**
 * Skills management UI for DeepAgents Web
 */

class SkillsManager {
    constructor() {
        this.skillsListEl = document.getElementById('skills-list');
        this.modal = document.getElementById('skill-modal');
        this.editingSkill = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('create-skill-btn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('save-skill-btn').addEventListener('click', () => {
            this.saveSkill();
        });

        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        this.modal.querySelector('.modal-cancel').addEventListener('click', () => {
            this.closeModal();
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
                <h4>${skill.name}</h4>
                <p>${skill.description}</p>
                <span class="skill-source ${skill.source}">${skill.source}</span>
            `;
            card.addEventListener('click', () => this.openSkill(skill.name));
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

        if (skill) {
            titleEl.textContent = 'Edit Skill';
            nameEl.value = skill.name;
            nameEl.disabled = true;
            descEl.value = skill.description;
            contentEl.value = skill.content || '';
        } else {
            titleEl.textContent = 'Create Skill';
            nameEl.value = '';
            nameEl.disabled = false;
            descEl.value = '';
            contentEl.value = '';
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.editingSkill = null;
    }

    async saveSkill() {
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
                // Update existing skill
                response = await fetch(`/api/skills/${name}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description, content })
                });
            } else {
                // Create new skill
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

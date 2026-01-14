/**
 * Browser profile management UI for DeepAgents Web
 */

class BrowserManager {
    constructor() {
        this.profiles = [];
        this.selectedProfileId = null;
        this.onSelectCallback = null;
    }

    async loadProfiles() {
        try {
            const response = await fetch('/api/browsers/profiles');
            const data = await response.json();
            this.profiles = data.profiles;
            return this.profiles;
        } catch (error) {
            console.error('Failed to load browser profiles:', error);
            return [];
        }
    }

    async createProfile(name) {
        const response = await fetch('/api/browsers/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create profile');
        }

        return await response.json();
    }

    async deleteProfile(profileId) {
        const response = await fetch(`/api/browsers/profiles/${profileId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete profile');
        }
    }

    getSelectedProfileId() {
        return this.selectedProfileId;
    }

    setSelectedProfile(profileId) {
        this.selectedProfileId = profileId;
        if (this.onSelectCallback) {
            this.onSelectCallback(profileId);
        }
    }

    onSelect(callback) {
        this.onSelectCallback = callback;
    }

    renderProfileSelector(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="profile-selector">
                <label for="browser-profile">Browser Profile</label>
                <div class="profile-selector-row">
                    <select id="browser-profile">
                        <option value="">No profile (fresh session)</option>
                    </select>
                    <button id="manage-profiles-btn" class="btn-small">Manage</button>
                </div>
            </div>
        `;

        const select = container.querySelector('#browser-profile');
        this.profiles.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = profile.name;
            if (profile.id === this.selectedProfileId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.setSelectedProfile(select.value || null);
        });

        container.querySelector('#manage-profiles-btn').addEventListener('click', () => {
            this.openManageModal();
        });
    }

    openManageModal() {
        let modal = document.getElementById('browser-profiles-modal');
        if (!modal) {
            modal = this.createManageModal();
            document.body.appendChild(modal);
        }
        this.renderProfileList();
        modal.classList.remove('hidden');
    }

    createManageModal() {
        const modal = document.createElement('div');
        modal.id = 'browser-profiles-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Browser Profiles</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-profile-name">New Profile Name</label>
                        <div class="profile-create-row">
                            <input type="text" id="new-profile-name" placeholder="My Profile">
                            <button id="create-profile-btn" class="btn-primary">Create</button>
                        </div>
                    </div>
                    <div id="profiles-list" class="profiles-list"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary modal-close-btn">Done</button>
                </div>
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('#create-profile-btn').addEventListener('click', async () => {
            const nameInput = modal.querySelector('#new-profile-name');
            const name = nameInput.value.trim();
            if (!name) {
                alert('Profile name is required');
                return;
            }

            try {
                await this.createProfile(name);
                nameInput.value = '';
                await this.loadProfiles();
                this.renderProfileList();
                this.renderProfileSelector('profile-selector-container');
            } catch (error) {
                alert(error.message);
            }
        });

        return modal;
    }

    renderProfileList() {
        const listEl = document.getElementById('profiles-list');
        if (!listEl) return;

        if (this.profiles.length === 0) {
            listEl.innerHTML = '<p class="no-profiles">No profiles yet. Create one to persist browser sessions.</p>';
            return;
        }

        listEl.innerHTML = '';
        this.profiles.forEach(profile => {
            const item = document.createElement('div');
            item.className = 'profile-item';
            item.innerHTML = `
                <div class="profile-info">
                    <span class="profile-name">${profile.name}</span>
                    <span class="profile-date">${this.formatDate(profile.created_at)}</span>
                </div>
                <button class="btn-small btn-danger" data-id="${profile.id}">Delete</button>
            `;

            item.querySelector('.btn-danger').addEventListener('click', async () => {
                if (!confirm(`Delete profile "${profile.name}"?`)) return;
                try {
                    await this.deleteProfile(profile.id);
                    if (this.selectedProfileId === profile.id) {
                        this.setSelectedProfile(null);
                    }
                    await this.loadProfiles();
                    this.renderProfileList();
                    this.renderProfileSelector('profile-selector-container');
                } catch (error) {
                    alert(error.message);
                }
            });

            listEl.appendChild(item);
        });
    }

    formatDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString();
    }
}

// Export for use in other modules
window.BrowserManager = BrowserManager;

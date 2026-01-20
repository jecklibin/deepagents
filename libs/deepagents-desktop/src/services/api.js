import config from './config';

class ApiService {
  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  }

  // Skills API
  async getSkills() {
    const response = await this.request(config.endpoints.skills);
    // API returns { skills: [...] }
    return response.skills || [];
  }

  async getSkill(name) {
    return this.request(`${config.endpoints.skills}/${encodeURIComponent(name)}`);
  }

  async createSkill(skillData) {
    return this.request(config.endpoints.skills, {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  }

  async updateSkill(name, skillData) {
    return this.request(`${config.endpoints.skills}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(skillData),
    });
  }

  async deleteSkill(name) {
    return this.request(`${config.endpoints.skills}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  async createSkillFromNL(data) {
    return this.request(config.endpoints.skillFromNL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSkillFromRecording(data) {
    return this.request(config.endpoints.skillFromRecording, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testSkill(name, params = {}) {
    return this.request(`${config.endpoints.skills}/${encodeURIComponent(name)}/test`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Browser Profiles API
  async getBrowserProfiles() {
    return this.request(config.endpoints.browserProfiles);
  }

  async createBrowserProfile(data) {
    return this.request(config.endpoints.browserProfiles, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBrowserProfile(id) {
    return this.request(`${config.endpoints.browserProfiles}/${id}`, {
      method: 'DELETE',
    });
  }

  // Recording Preview
  async previewRecording(actions, profileId = null) {
    return this.request(config.endpoints.recordingPreview, {
      method: 'POST',
      body: JSON.stringify({ actions, profile_id: profileId }),
    });
  }

  // Sessions API
  async getSessions() {
    return this.request(config.endpoints.sessions);
  }

  async createSession(data) {
    return this.request(config.endpoints.sessions, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id) {
    return this.request(`${config.endpoints.sessions}/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;

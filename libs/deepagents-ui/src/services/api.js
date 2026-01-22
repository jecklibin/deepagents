// Configurable API Service Factory
export function createApiService(config = {}) {
  const baseUrl = config.apiBaseUrl || 'http://localhost:8000';
  const endpoints = {
    skills: '/api/skills',
    skillFromNL: '/api/skills/from-nl',
    skillFromRecording: '/api/skills/from-recording',
    browserProfiles: '/api/browsers/profiles',
    recordingPreview: '/api/recording/preview',
    sessions: '/api/sessions',
    rpaActions: '/api/rpa/actions',
    rpaSkills: '/api/rpa/skills',
    hybridSkills: '/api/hybrid/skills',
    hybridStepTypes: '/api/hybrid/step-types',
    ...config.endpoints
  };

  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
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

  return {
    baseUrl,
    endpoints,

    // Skills API
    async getSkills() {
      const response = await request(endpoints.skills);
      return response.skills || [];
    },

    async getSkill(name) {
      return request(`${endpoints.skills}/${encodeURIComponent(name)}`);
    },

    async createSkill(skillData) {
      return request(endpoints.skills, {
        method: 'POST',
        body: JSON.stringify(skillData),
      });
    },

    async updateSkill(name, skillData) {
      return request(`${endpoints.skills}/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify(skillData),
      });
    },

    async deleteSkill(name) {
      return request(`${endpoints.skills}/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
    },

    async createSkillFromNL(data) {
      return request(endpoints.skillFromNL, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async createSkillFromRecording(data) {
      return request(endpoints.skillFromRecording, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async testSkill(name, params = {}) {
      return request(`${endpoints.skills}/${encodeURIComponent(name)}/test`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    // Browser Profiles API
    async getBrowserProfiles() {
      const response = await request(endpoints.browserProfiles);
      return response.profiles || [];
    },

    async createBrowserProfile(data) {
      return request(endpoints.browserProfiles, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteBrowserProfile(id) {
      return request(`${endpoints.browserProfiles}/${id}`, {
        method: 'DELETE',
      });
    },

    // Recording Preview
    async previewRecording(actions, profileId = null) {
      return request(endpoints.recordingPreview, {
        method: 'POST',
        body: JSON.stringify({ actions, profile_id: profileId }),
      });
    },

    // Sessions API
    async getSessions() {
      return request(endpoints.sessions);
    },

    async createSession(data) {
      return request(endpoints.sessions, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteSession(id) {
      return request(`${endpoints.sessions}/${id}`, {
        method: 'DELETE',
      });
    },

    // RPA API
    async getRPAActions() {
      return request(endpoints.rpaActions);
    },

    async createRPASkill(skillData) {
      return request(endpoints.rpaSkills, {
        method: 'POST',
        body: JSON.stringify(skillData),
      });
    },

    async getRPASkill(name) {
      return request(`${endpoints.rpaSkills}/${encodeURIComponent(name)}`);
    },

    async updateRPASkill(name, skillData) {
      return request(`${endpoints.rpaSkills}/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify(skillData),
      });
    },

    async executeRPASkill(name, params = {}) {
      return request(`${endpoints.rpaSkills}/${encodeURIComponent(name)}/execute`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    // Hybrid Skills API
    async getHybridSkills() {
      return request(endpoints.hybridSkills);
    },

    async getHybridSkill(name) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(name)}`);
    },

    async createHybridSkill(skillData) {
      return request(endpoints.hybridSkills, {
        method: 'POST',
        body: JSON.stringify(skillData),
      });
    },

    async updateHybridSkill(name, skillData) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify(skillData),
      });
    },

    async deleteHybridSkill(name) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
    },

    async executeHybridSkill(name, params = {}) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(name)}/execute`, {
        method: 'POST',
        body: JSON.stringify({ params }),
      });
    },

    async addHybridStep(skillName, stepData) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(skillName)}/steps`, {
        method: 'POST',
        body: JSON.stringify(stepData),
      });
    },

    async removeHybridStep(skillName, stepId) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(skillName)}/steps/${encodeURIComponent(stepId)}`, {
        method: 'DELETE',
      });
    },

    async reorderHybridSteps(skillName, stepIds) {
      return request(`${endpoints.hybridSkills}/${encodeURIComponent(skillName)}/steps/reorder`, {
        method: 'PUT',
        body: JSON.stringify(stepIds),
      });
    },

    async getHybridStepTypes() {
      return request(endpoints.hybridStepTypes);
    },
  };
}

export default createApiService;

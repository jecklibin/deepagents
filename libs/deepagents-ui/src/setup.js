// Setup file for initializing the shared UI package
import { createApiService } from './services/api';
import { createWsService } from './services/websocket';
import { initSkillsStore } from './store/skillsStore';
import { initChatStore } from './store/chatStore';
import { initRecordingStore } from './store/recordingStore';
import { initRPAStore } from './store/rpaStore';
import { initHybridStore } from './store/hybridStore';

let initialized = false;
let services = null;

/**
 * Initialize the DeepAgents UI package with configuration
 * @param {Object} config - Configuration object
 * @param {string} config.apiBaseUrl - Base URL for API (default: 'http://localhost:8000')
 * @param {string} config.wsBaseUrl - Base URL for WebSocket (default: 'ws://localhost:8000')
 */
export const initDeepAgentsUI = (config = {}) => {
  if (initialized) {
    console.warn('DeepAgents UI already initialized');
    return services;
  }

  const apiBaseUrl = config.apiBaseUrl || 'http://localhost:8000';
  const wsBaseUrl = config.wsBaseUrl || 'ws://localhost:8000';

  // Create services
  const apiService = createApiService({ apiBaseUrl });
  const wsService = createWsService({ wsBaseUrl });

  // Initialize stores with services
  const skillsStore = initSkillsStore(apiService);
  const chatStore = initChatStore(wsService);
  const recordingStore = initRecordingStore(apiService, wsService);
  const rpaStore = initRPAStore(apiService);
  const hybridStore = initHybridStore(apiService);

  services = {
    apiService,
    wsService,
    stores: {
      skills: skillsStore,
      chat: chatStore,
      recording: recordingStore,
      rpa: rpaStore,
      hybrid: hybridStore,
    },
  };

  initialized = true;
  return services;
};

/**
 * Get the initialized services
 * @returns {Object|null} Services object or null if not initialized
 */
export const getServices = () => services;

/**
 * Check if the package is initialized
 * @returns {boolean}
 */
export const isInitialized = () => initialized;

export default { initDeepAgentsUI, getServices, isInitialized };

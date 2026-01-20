// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const config = {
  apiBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  endpoints: {
    // Skills
    skills: '/api/skills',
    skillFromNL: '/api/skills/from-nl',
    skillFromRecording: '/api/skills/from-recording',
    // Browsers
    browserProfiles: '/api/browsers/profiles',
    // Recording
    recordingPreview: '/api/recording/preview',
    // Sessions
    sessions: '/api/sessions',
  },
  ws: {
    chat: '/api/ws/chat',
    recording: '/api/ws/recording',
  },
};

export default config;

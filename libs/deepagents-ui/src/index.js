// Setup and initialization
export { initDeepAgentsUI, getServices, isInitialized } from './setup';

// Shared UI Components
export { default as Header } from './components/Header';
export { default as SkillsSidebar } from './components/SkillsSidebar';
export { default as ChatArea } from './components/ChatArea';
export { default as ExecutionPanel } from './components/ExecutionPanel';
export { default as RiskModal } from './components/RiskModal';
export { default as RecordingModal } from './components/RecordingModal';
export { default as SkillDetailModal } from './components/SkillDetailModal';
export { default as RPAWorkflowBuilder } from './components/RPAWorkflowBuilder';

// Stores (use after initialization)
export { useAppStore, createAppStore } from './store/appStore';
export { useChatStore, createChatStore, initChatStore } from './store/chatStore';
export { useSkillsStore, createSkillsStore, initSkillsStore } from './store/skillsStore';
export { useRecordingStore, createRecordingStore, initRecordingStore } from './store/recordingStore';
export { useRPAStore, createRPAStore, initRPAStore } from './store/rpaStore';

// Services
export { createApiService } from './services/api';
export { createWsService } from './services/websocket';

// Main App Component
export { default as DeepAgentsApp } from './App';

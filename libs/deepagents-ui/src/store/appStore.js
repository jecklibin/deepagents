import { create } from 'zustand';

export const createAppStore = () => create((set) => ({
  // UI State
  activeTab: 'my-skills',
  showRiskModal: false,
  riskModalData: null,
  showCreateSkillModal: false,
  createSkillMode: null,
  showSkillDetailModal: false,
  skillDetailMode: 'view',
  showRPABuilderModal: false,
  rpaBuilderMode: 'create',
  editingRPASkillName: null,
  showHybridBuilderModal: false,
  hybridBuilderMode: 'create',
  editingHybridSkillName: null,
  showRecordingModal: false,
  recordingConfig: null,  // Config for embedded recording

  // System status
  systemStatus: 'online',
  apiConnected: false,

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  showRiskConfirmation: (data) => set({ showRiskModal: true, riskModalData: data }),
  hideRiskConfirmation: () => set({ showRiskModal: false, riskModalData: null }),

  openCreateSkillModal: (mode) => set({ showCreateSkillModal: true, createSkillMode: mode }),
  closeCreateSkillModal: () => set({ showCreateSkillModal: false, createSkillMode: null }),

  openSkillDetailModal: (mode = 'view') => set({ showSkillDetailModal: true, skillDetailMode: mode }),
  closeSkillDetailModal: () => set({ showSkillDetailModal: false, skillDetailMode: 'view' }),

  openRPABuilderModal: (mode = 'create', skillName = null) => set({
    showRPABuilderModal: true,
    rpaBuilderMode: mode,
    editingRPASkillName: skillName,
  }),
  closeRPABuilderModal: () => set({
    showRPABuilderModal: false,
    rpaBuilderMode: 'create',
    editingRPASkillName: null,
  }),

  openHybridBuilderModal: (mode = 'create', skillName = null) => set({
    showHybridBuilderModal: true,
    hybridBuilderMode: mode,
    editingHybridSkillName: skillName,
  }),
  closeHybridBuilderModal: () => set({
    showHybridBuilderModal: false,
    hybridBuilderMode: 'create',
    editingHybridSkillName: null,
  }),

  openRecordingModal: (config = null) => set({ showRecordingModal: true, recordingConfig: config }),
  closeRecordingModal: () => set({ showRecordingModal: false, recordingConfig: null }),

  setSystemStatus: (status) => set({ systemStatus: status }),
  setApiConnected: (connected) => set({ apiConnected: connected }),
}));

// Default store instance
export const useAppStore = createAppStore();

export default useAppStore;

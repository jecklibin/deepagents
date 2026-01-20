import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // UI State
  activeTab: 'my-skills', // 'my-skills' | 'market'
  showRiskModal: false,
  riskModalData: null,
  showCreateSkillModal: false,
  createSkillMode: null, // 'manual' | 'nl' | 'recording'
  showSkillDetailModal: false,
  skillDetailMode: 'view', // 'view' | 'edit'

  // System status
  systemStatus: 'online', // 'online' | 'offline' | 'error'
  apiConnected: false,

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  showRiskConfirmation: (data) => set({ showRiskModal: true, riskModalData: data }),
  hideRiskConfirmation: () => set({ showRiskModal: false, riskModalData: null }),

  openCreateSkillModal: (mode) => set({ showCreateSkillModal: true, createSkillMode: mode }),
  closeCreateSkillModal: () => set({ showCreateSkillModal: false, createSkillMode: null }),

  openSkillDetailModal: (mode = 'view') => set({ showSkillDetailModal: true, skillDetailMode: mode }),
  closeSkillDetailModal: () => set({ showSkillDetailModal: false, skillDetailMode: 'view' }),

  setSystemStatus: (status) => set({ systemStatus: status }),
  setApiConnected: (connected) => set({ apiConnected: connected }),
}));

export default useAppStore;

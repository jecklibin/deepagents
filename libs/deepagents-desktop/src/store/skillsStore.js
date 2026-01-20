import { create } from 'zustand';
import apiService from '../services/api';

export const useSkillsStore = create((set, get) => ({
  skills: [],
  selectedSkill: null,
  loading: false,
  error: null,

  fetchSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await apiService.getSkills();
      // Ensure skills is always an array
      set({ skills: Array.isArray(skills) ? skills : [], loading: false });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      set({ error: error.message, loading: false, skills: [] });
    }
  },

  selectSkill: async (name) => {
    if (!name) {
      set({ selectedSkill: null });
      return;
    }
    try {
      const skill = await apiService.getSkill(name);
      set({ selectedSkill: skill });
    } catch (error) {
      set({ error: error.message });
    }
  },

  createSkill: async (skillData) => {
    set({ loading: true, error: null });
    try {
      const skill = await apiService.createSkill(skillData);
      set((state) => ({
        skills: [...state.skills, skill],
        loading: false,
      }));
      return skill;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createSkillFromNL: async (data) => {
    set({ loading: true, error: null });
    try {
      const skill = await apiService.createSkillFromNL(data);
      set((state) => ({
        skills: [...state.skills, skill],
        loading: false,
      }));
      return skill;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createSkillFromRecording: async (data) => {
    set({ loading: true, error: null });
    try {
      const skill = await apiService.createSkillFromRecording(data);
      set((state) => ({
        skills: [...state.skills, skill],
        loading: false,
      }));
      return skill;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateSkill: async (name, skillData) => {
    set({ loading: true, error: null });
    try {
      const skill = await apiService.updateSkill(name, skillData);
      set((state) => ({
        skills: state.skills.map((s) => (s.name === name ? skill : s)),
        selectedSkill: state.selectedSkill?.name === name ? skill : state.selectedSkill,
        loading: false,
      }));
      return skill;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteSkill: async (name) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteSkill(name);
      set((state) => ({
        skills: state.skills.filter((s) => s.name !== name),
        selectedSkill: state.selectedSkill?.name === name ? null : state.selectedSkill,
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  testSkill: async (name, params = {}) => {
    try {
      const result = await apiService.testSkill(name, params);
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useSkillsStore;

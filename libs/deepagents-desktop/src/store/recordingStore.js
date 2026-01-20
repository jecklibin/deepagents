import { create } from 'zustand';
import wsService from '../services/websocket';
import apiService from '../services/api';

export const useRecordingStore = create((set, get) => ({
  isRecording: false,
  isConnected: false,
  actions: [],
  currentUrl: '',
  browserProfiles: [],
  selectedProfileId: null,
  error: null,

  // Browser profiles
  fetchBrowserProfiles: async () => {
    try {
      const profiles = await apiService.getBrowserProfiles();
      set({ browserProfiles: profiles });
    } catch (error) {
      set({ error: error.message });
    }
  },

  createBrowserProfile: async (name) => {
    try {
      const profile = await apiService.createBrowserProfile({ name });
      set((state) => ({
        browserProfiles: [...state.browserProfiles, profile],
      }));
      return profile;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteBrowserProfile: async (id) => {
    try {
      await apiService.deleteBrowserProfile(id);
      set((state) => ({
        browserProfiles: state.browserProfiles.filter((p) => p.id !== id),
        selectedProfileId: state.selectedProfileId === id ? null : state.selectedProfileId,
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  selectProfile: (profileId) => {
    set({ selectedProfileId: profileId });
  },

  // Recording WebSocket
  connect: () => {
    const handlers = {
      onOpen: () => {
        set({ isConnected: true, error: null });
      },
      onMessage: (data) => {
        const { handleMessage } = get();
        handleMessage(data);
      },
      onError: (error) => {
        set({ error: 'Recording connection error', isConnected: false });
      },
      onClose: () => {
        set({ isConnected: false, isRecording: false });
      },
    };

    wsService.connect('recording', 'default', handlers);
  },

  disconnect: () => {
    wsService.disconnect('recording', 'default');
    set({ isConnected: false, isRecording: false });
  },

  handleMessage: (data) => {
    const { type, action, actions: allActions, status, error } = data;

    switch (type) {
      case 'status':
        set({ isRecording: status === 'recording' });
        break;

      case 'action':
        set((state) => ({
          actions: [...state.actions, action],
        }));
        break;

      case 'actions':
        set({ actions: allActions || [] });
        break;

      case 'error':
        set({ error: error, isRecording: false });
        break;

      default:
        console.log('Unknown recording message:', type, data);
    }
  },

  // Start recording
  startRecording: (url) => {
    const { isConnected, selectedProfileId } = get();
    if (!isConnected) return false;

    set({ actions: [], currentUrl: url });

    return wsService.send('recording', 'default', {
      type: 'start',
      url,
      profile_id: selectedProfileId,
    });
  },

  // Stop recording
  stopRecording: () => {
    const { isConnected } = get();
    if (!isConnected) return false;

    wsService.send('recording', 'default', { type: 'stop' });
    set({ isRecording: false });
    return true;
  },

  // Preview recording
  previewRecording: async () => {
    const { actions, selectedProfileId } = get();
    try {
      const result = await apiService.previewRecording(actions, selectedProfileId);
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Update action
  updateAction: (index, updatedAction) => {
    set((state) => {
      const actions = [...state.actions];
      actions[index] = { ...actions[index], ...updatedAction };
      return { actions };
    });
  },

  // Remove action
  removeAction: (index) => {
    set((state) => ({
      actions: state.actions.filter((_, i) => i !== index),
    }));
  },

  // Clear actions
  clearActions: () => {
    set({ actions: [] });
  },

  clearError: () => set({ error: null }),
}));

export default useRecordingStore;

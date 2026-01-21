import { create } from 'zustand';

// Factory function to create chat store with injected services
export const createChatStore = (wsService) => create((set, get) => ({
  sessions: [],
  currentSessionId: null,
  sessionId: null,
  messages: [],
  isConnected: false,
  isStreaming: false,
  pendingInterrupt: null,
  todos: [],
  toolCalls: [],
  error: null,

  // Session management
  setCurrentSession: (sessionId) => {
    const { currentSessionId } = get();
    if (currentSessionId && currentSessionId !== sessionId) {
      wsService.disconnect('chat', currentSessionId);
    }
    set({ currentSessionId: sessionId, messages: [], todos: [], toolCalls: [] });
  },

  addSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session],
    }));
  },

  removeSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
    }));
  },

  // WebSocket connection
  connect: (sessionId) => {
    const handlers = {
      onOpen: () => {
        set({ isConnected: true, error: null });
      },
      onMessage: (data) => {
        const { handleMessage } = get();
        handleMessage(data);
      },
      onError: (error) => {
        set({ error: 'WebSocket connection error', isConnected: false });
      },
      onClose: () => {
        set({ isConnected: false, isStreaming: false });
      },
    };

    wsService.connect('chat', sessionId, handlers);
  },

  disconnect: () => {
    const { currentSessionId } = get();
    if (currentSessionId) {
      wsService.disconnect('chat', currentSessionId);
    }
    set({ isConnected: false, isStreaming: false });
  },

  // Message handling
  handleMessage: (data) => {
    const { type, data: msgData } = data;

    switch (type) {
      case 'session':
        console.log('Session initialized:', msgData?.session_id);
        set({ sessionId: msgData?.session_id });
        break;

      case 'text':
        const textContent = typeof msgData === 'string' ? msgData : '';
        if (textContent) {
          set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.type === 'assistant' && lastMessage.isStreaming) {
              lastMessage.content += textContent;
            } else {
              messages.push({
                id: Date.now(),
                type: 'assistant',
                content: textContent,
                timestamp: new Date().toISOString(),
                isStreaming: true,
              });
            }
            return { messages };
          });
        }
        break;

      case 'tool_call':
        if (msgData) {
          set((state) => ({
            toolCalls: [...state.toolCalls, {
              id: msgData.id,
              name: msgData.name,
              input: msgData.args,
              status: 'running'
            }],
          }));
        }
        break;

      case 'tool_result':
        if (msgData) {
          set((state) => ({
            toolCalls: state.toolCalls.map((tc) =>
              tc.id === msgData.id
                ? { ...tc, result: msgData.result, status: 'completed' }
                : tc
            ),
          }));
        }
        break;

      case 'interrupt':
        if (msgData) {
          set({
            pendingInterrupt: {
              interrupt_id: msgData.interrupt_id,
              tool_name: msgData.tool_name,
              description: msgData.description,
              args: msgData.args,
            },
            isStreaming: false,
          });
        }
        break;

      case 'todo':
        set({ todos: Array.isArray(msgData) ? msgData : [] });
        break;

      case 'done':
        set((state) => {
          const messages = state.messages.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          );
          return { messages, isStreaming: false };
        });
        break;

      case 'error':
        const errorContent = typeof msgData === 'string' ? msgData : 'Unknown error';
        set({ error: errorContent, isStreaming: false });
        break;

      default:
        console.log('Unknown message type:', type, data);
    }
  },

  // Send message
  sendMessage: (content) => {
    const { currentSessionId, isConnected } = get();
    if (!currentSessionId || !isConnected) return false;

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          type: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
      isStreaming: true,
    }));

    return wsService.send('chat', currentSessionId, { type: 'message', content });
  },

  // Stop streaming
  stopStreaming: () => {
    const { currentSessionId } = get();
    if (currentSessionId) {
      wsService.send('chat', currentSessionId, { type: 'stop' });
    }
    set({ isStreaming: false });
  },

  // Handle interrupt response
  respondToInterrupt: (decision, message = null) => {
    const { currentSessionId, pendingInterrupt } = get();
    if (!currentSessionId || !pendingInterrupt) return;

    wsService.send('chat', currentSessionId, {
      type: 'interrupt_response',
      data: {
        interrupt_id: pendingInterrupt.interrupt_id,
        decision,
        message,
      },
    });

    set({ pendingInterrupt: null, isStreaming: true });
  },

  // Clear messages
  clearMessages: () => {
    set({ messages: [], todos: [], toolCalls: [] });
  },

  clearError: () => set({ error: null }),
}));

// Will be initialized with services
export let useChatStore = null;

export const initChatStore = (wsService) => {
  useChatStore = createChatStore(wsService);
  return useChatStore;
};

export default { createChatStore, initChatStore };

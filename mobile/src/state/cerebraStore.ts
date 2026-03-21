import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  usingAI?: boolean;
}

// Legacy interface kept for backward compat with CerebraCard
interface CerebraMessage {
  id: string;
  message: string;
  suggestion?: string;
  actionable: boolean;
  timestamp: Date;
}

interface CerebraState {
  // Legacy messages (for CerebraCard)
  messages: CerebraMessage[];
  loading: boolean;
  addMessage: (message: Omit<CerebraMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;

  // Chat conversation
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;
  setChatLoading: (loading: boolean) => void;
}

export const useCerebraStore = create<CerebraState>((set) => ({
  // Legacy
  messages: [],
  loading: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).slice(2),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (loading) => set({ loading }),

  // Chat
  chatMessages: [],
  chatLoading: false,
  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          ...msg,
          id: Math.random().toString(36).slice(2),
          timestamp: new Date(),
        },
      ],
    })),
  clearChat: () => set({ chatMessages: [] }),
  setChatLoading: (loading) => set({ chatLoading: loading }),
}));

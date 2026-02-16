// ============================================
// CareerOS — Chat Store (Zustand)
// ============================================

import { create } from "zustand";
import type { ChatMessage, CareerAnalysis } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isAnalysisComplete: boolean;
  careerAnalysis: CareerAnalysis | null;
  conversationId: string | null;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setAnalysisComplete: (complete: boolean) => void;
  setCareerAnalysis: (analysis: CareerAnalysis) => void;
  setConversationId: (id: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isAnalysisComplete: false,
  careerAnalysis: null,
  conversationId: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setLoading: (isLoading) => set({ isLoading }),

  setAnalysisComplete: (isAnalysisComplete) => set({ isAnalysisComplete }),

  setCareerAnalysis: (careerAnalysis) =>
    set({ careerAnalysis, isAnalysisComplete: true }),

  setConversationId: (conversationId) => set({ conversationId }),

  reset: () =>
    set({
      messages: [],
      isLoading: false,
      isAnalysisComplete: false,
      careerAnalysis: null,
      conversationId: null,
    }),
}));

// ============================================
// CareerOS 2.0 — Chat Store (Zustand)
// ============================================

import { create } from "zustand";
import type { ChatMessage, PlacementAnalysis } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isAnalysisComplete: boolean;
  placementAnalysis: PlacementAnalysis | null;
  conversationId: string | null;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setAnalysisComplete: (complete: boolean) => void;
  setPlacementAnalysis: (analysis: PlacementAnalysis) => void;
  setConversationId: (id: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isAnalysisComplete: false,
  placementAnalysis: null,
  conversationId: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setLoading: (isLoading) => set({ isLoading }),

  setAnalysisComplete: (isAnalysisComplete) => set({ isAnalysisComplete }),

  setPlacementAnalysis: (placementAnalysis) =>
    set({ placementAnalysis, isAnalysisComplete: true }),

  setConversationId: (conversationId) => set({ conversationId }),

  reset: () =>
    set({
      messages: [],
      isLoading: false,
      isAnalysisComplete: false,
      placementAnalysis: null,
      conversationId: null,
    }),
}));

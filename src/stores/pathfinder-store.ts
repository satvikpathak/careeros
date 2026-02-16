// ============================================
// CareerOS — Pathfinder Store (Zustand)
// ============================================

import { create } from "zustand";
import type {
  ChatMessage,
  PathfinderAnalysis,
  ConversationProgress,
  RoadmapWithResources,
} from "@/lib/types";

interface PathfinderState {
  // Interest selection
  selectedInterests: string[];

  // Conversation
  messages: ChatMessage[];
  isLoading: boolean;
  progress: ConversationProgress;

  // Analysis
  isAnalysisComplete: boolean;
  analysis: PathfinderAnalysis | null;

  // Roadmap with resources (for roadmap page)
  roadmap: RoadmapWithResources | null;
  isLoadingResources: boolean;

  // Current step in the flow
  step: "interests" | "conversation" | "results";

  // Actions
  setSelectedInterests: (interests: string[]) => void;
  toggleInterest: (interestId: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setProgress: (progress: ConversationProgress) => void;
  setAnalysisComplete: (complete: boolean) => void;
  setAnalysis: (analysis: PathfinderAnalysis) => void;
  setRoadmap: (roadmap: RoadmapWithResources) => void;
  setLoadingResources: (loading: boolean) => void;
  setStep: (step: "interests" | "conversation" | "results") => void;
  reset: () => void;
}

const initialProgress: ConversationProgress = {
  stage: "interests",
  percentage: 0,
  stagesCompleted: [],
  totalStages: 6,
  currentStageLabel: "Understanding Interests",
  isComplete: false,
};

export const usePathfinderStore = create<PathfinderState>((set) => ({
  selectedInterests: [],
  messages: [],
  isLoading: false,
  progress: initialProgress,
  isAnalysisComplete: false,
  analysis: null,
  roadmap: null,
  isLoadingResources: false,
  step: "interests",

  setSelectedInterests: (selectedInterests) => set({ selectedInterests }),

  toggleInterest: (interestId) =>
    set((state) => {
      const exists = state.selectedInterests.includes(interestId);
      return {
        selectedInterests: exists
          ? state.selectedInterests.filter((id) => id !== interestId)
          : [...state.selectedInterests, interestId],
      };
    }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setLoading: (isLoading) => set({ isLoading }),

  setProgress: (progress) => set({ progress }),

  setAnalysisComplete: (isAnalysisComplete) => set({ isAnalysisComplete }),

  setAnalysis: (analysis) =>
    set({ analysis, isAnalysisComplete: true, step: "results" }),

  setRoadmap: (roadmap) => set({ roadmap }),

  setLoadingResources: (isLoadingResources) => set({ isLoadingResources }),

  setStep: (step) => set({ step }),

  reset: () =>
    set({
      selectedInterests: [],
      messages: [],
      isLoading: false,
      progress: initialProgress,
      isAnalysisComplete: false,
      analysis: null,
      roadmap: null,
      isLoadingResources: false,
      step: "interests",
    }),
}));

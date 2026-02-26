// ============================================
// CareerOS — Roadmap Store (Zustand)
// Persists auto-generated roadmap, checklist,
// quiz results, and per-phase resource state
// ============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---- Types ----

export interface RoadmapStep {
  phase: string;
  description?: string;
  topics: string[];
  projects?: string[];
  milestones?: string[];
}

export interface Roadmap {
  title: string;
  estimated_duration?: string;
  difficulty?: string;
  steps: RoadmapStep[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number; // index of correct option
  explanation?: string;
}

export interface QuizResult {
  phaseIndex: number;
  score: number;
  total: number;
  answers: Record<string, number>; // questionId -> selected index
  completedAt: string;
}

export interface PhaseResources {
  youtube_playlists?: any[];
  courses?: any[];
  blogs?: any[];
  documentation?: any[];
}

// ---- Store ----

interface RoadmapState {
  // Core roadmap
  roadmap: Roadmap | null;
  isGenerating: boolean;
  sourceType: "auto" | "manual" | null; // "auto" = from resume parse, "manual" = user searched

  // Per-phase state
  expandedPhases: Record<number, boolean>;
  completedPhases: Record<number, boolean>;

  // Topic checklist: phaseIndex -> topicIndex -> completed
  topicChecklist: Record<number, Record<number, boolean>>;

  // Per-phase resources (cached)
  phaseResources: Record<number, PhaseResources>;
  loadingResources: Record<number, boolean>;

  // Quizzes
  phaseQuizzes: Record<number, QuizQuestion[]>;
  quizResults: Record<number, QuizResult>;
  loadingQuiz: Record<number, boolean>;

  // Context from resume audit
  skillGaps: string[];
  currentSkills: string[];
  targetRole: string;

  // Actions
  setRoadmap: (roadmap: Roadmap, source: "auto" | "manual") => void;
  setGenerating: (val: boolean) => void;
  togglePhase: (index: number) => void;
  togglePhaseComplete: (index: number) => void;
  toggleTopic: (phaseIndex: number, topicIndex: number) => void;
  setPhaseResources: (phaseIndex: number, resources: PhaseResources) => void;
  setLoadingResources: (phaseIndex: number, val: boolean) => void;
  setPhaseQuiz: (phaseIndex: number, questions: QuizQuestion[]) => void;
  setQuizResult: (phaseIndex: number, result: QuizResult) => void;
  setLoadingQuiz: (phaseIndex: number, val: boolean) => void;
  setAuditContext: (skillGaps: string[], currentSkills: string[], targetRole: string) => void;
  getPhaseProgress: (phaseIndex: number) => number;
  getOverallProgress: () => number;
  reset: () => void;
}

const initialState = {
  roadmap: null,
  isGenerating: false,
  sourceType: null as "auto" | "manual" | null,
  expandedPhases: {},
  completedPhases: {},
  topicChecklist: {},
  phaseResources: {},
  loadingResources: {},
  phaseQuizzes: {},
  quizResults: {},
  loadingQuiz: {},
  skillGaps: [] as string[],
  currentSkills: [] as string[],
  targetRole: "",
};

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRoadmap: (roadmap, source) =>
        set({
          roadmap,
          sourceType: source,
          expandedPhases: { 0: true }, // auto-expand first phase
          completedPhases: {},
          topicChecklist: {},
          phaseResources: {},
          phaseQuizzes: {},
          quizResults: {},
        }),

      setGenerating: (isGenerating) => set({ isGenerating }),

      togglePhase: (index) =>
        set((s) => ({
          expandedPhases: { ...s.expandedPhases, [index]: !s.expandedPhases[index] },
        })),

      togglePhaseComplete: (index) =>
        set((s) => ({
          completedPhases: { ...s.completedPhases, [index]: !s.completedPhases[index] },
        })),

      toggleTopic: (phaseIndex, topicIndex) =>
        set((s) => {
          const phaseTopics = { ...(s.topicChecklist[phaseIndex] || {}) };
          phaseTopics[topicIndex] = !phaseTopics[topicIndex];
          return {
            topicChecklist: { ...s.topicChecklist, [phaseIndex]: phaseTopics },
          };
        }),

      setPhaseResources: (phaseIndex, resources) =>
        set((s) => ({
          phaseResources: { ...s.phaseResources, [phaseIndex]: resources },
          loadingResources: { ...s.loadingResources, [phaseIndex]: false },
        })),

      setLoadingResources: (phaseIndex, val) =>
        set((s) => ({
          loadingResources: { ...s.loadingResources, [phaseIndex]: val },
        })),

      setPhaseQuiz: (phaseIndex, questions) =>
        set((s) => ({
          phaseQuizzes: { ...s.phaseQuizzes, [phaseIndex]: questions },
          loadingQuiz: { ...s.loadingQuiz, [phaseIndex]: false },
        })),

      setQuizResult: (phaseIndex, result) =>
        set((s) => ({
          quizResults: { ...s.quizResults, [phaseIndex]: result },
        })),

      setLoadingQuiz: (phaseIndex, val) =>
        set((s) => ({
          loadingQuiz: { ...s.loadingQuiz, [phaseIndex]: val },
        })),

      setAuditContext: (skillGaps, currentSkills, targetRole) =>
        set({ skillGaps, currentSkills, targetRole }),

      getPhaseProgress: (phaseIndex) => {
        const state = get();
        const step = state.roadmap?.steps[phaseIndex];
        if (!step) return 0;
        const checked = state.topicChecklist[phaseIndex] || {};
        const total = step.topics.length;
        if (total === 0) return 0;
        const done = Object.values(checked).filter(Boolean).length;
        return Math.round((done / total) * 100);
      },

      getOverallProgress: () => {
        const state = get();
        if (!state.roadmap) return 0;
        const totalPhases = state.roadmap.steps.length;
        if (totalPhases === 0) return 0;
        const completed = Object.values(state.completedPhases).filter(Boolean).length;
        return Math.round((completed / totalPhases) * 100);
      },

      reset: () => set(initialState),
    }),
    {
      name: "careeros-roadmap",
      // Only persist these fields (not loading states)
      partialize: (state) => ({
        roadmap: state.roadmap,
        sourceType: state.sourceType,
        expandedPhases: state.expandedPhases,
        completedPhases: state.completedPhases,
        topicChecklist: state.topicChecklist,
        phaseResources: state.phaseResources,
        phaseQuizzes: state.phaseQuizzes,
        quizResults: state.quizResults,
        skillGaps: state.skillGaps,
        currentSkills: state.currentSkills,
        targetRole: state.targetRole,
      }),
      onRehydrateStorage: () => {
        return (_state, _error) => {
          // After rehydration, no-op — DB sync happens on actions
        };
      },
    }
  )
);

// Debounced sync of progress to DB
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function syncProgressToDb() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const state = useRoadmapStore.getState();
      if (!state.roadmap) return;
      await fetch("/api/roadmap/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedPhases: state.completedPhases,
          topicChecklist: state.topicChecklist,
        }),
      });
    } catch {
      // Silent fail — local state is still saved via Zustand persist
    }
  }, 2000);
}

// Subscribe to changes that should sync to DB
useRoadmapStore.subscribe(
  (state, prevState) => {
    if (
      state.completedPhases !== prevState.completedPhases ||
      state.topicChecklist !== prevState.topicChecklist
    ) {
      syncProgressToDb();
    }
  }
);

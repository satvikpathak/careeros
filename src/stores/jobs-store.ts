// ============================================
// CareerOS — Jobs Store (Zustand)
// ============================================

import { create } from "zustand";
import type { Job, Match, NormalizedJob } from "@/lib/types";

interface JobsState {
  jobs: NormalizedJob[];
  matches: Match[];
  isSearching: boolean;
  isMatching: boolean;
  searchQuery: string;
  searchLocation: string;
  selectedSource: "all" | "linkedin" | "indeed" | "naukri";

  setJobs: (jobs: NormalizedJob[]) => void;
  addJobs: (jobs: NormalizedJob[]) => void;
  setMatches: (matches: Match[]) => void;
  setSearching: (searching: boolean) => void;
  setMatching: (matching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchLocation: (location: string) => void;
  setSelectedSource: (source: "all" | "linkedin" | "indeed" | "naukri") => void;
  reset: () => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  matches: [],
  isSearching: false,
  isMatching: false,
  searchQuery: "",
  searchLocation: "",
  selectedSource: "all",

  setJobs: (jobs) => set({ jobs }),
  addJobs: (newJobs) => set((state) => ({ jobs: [...state.jobs, ...newJobs] })),
  setMatches: (matches) => set({ matches }),
  setSearching: (isSearching) => set({ isSearching }),
  setMatching: (isMatching) => set({ isMatching }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchLocation: (searchLocation) => set({ searchLocation }),
  setSelectedSource: (selectedSource) => set({ selectedSource }),
  reset: () =>
    set({
      jobs: [],
      matches: [],
      isSearching: false,
      isMatching: false,
      searchQuery: "",
      searchLocation: "",
      selectedSource: "all",
    }),
}));

// ============================================
// CareerOS — Profile Store (Zustand)
// ============================================

import { create } from "zustand";
import type { Profile, ParsedResume } from "@/lib/types";

interface ProfileState {
  profile: Profile | null;
  parsedResume: ParsedResume | null;
  atsScore: number;
  isUploading: boolean;
  isParsing: boolean;

  setProfile: (profile: Profile) => void;
  setParsedResume: (resume: ParsedResume) => void;
  setAtsScore: (score: number) => void;
  setUploading: (uploading: boolean) => void;
  setParsing: (parsing: boolean) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  parsedResume: null,
  atsScore: 0,
  isUploading: false,
  isParsing: false,

  setProfile: (profile) => set({ profile }),
  setParsedResume: (parsedResume) => set({ parsedResume }),
  setAtsScore: (atsScore) => set({ atsScore }),
  setUploading: (isUploading) => set({ isUploading }),
  setParsing: (isParsing) => set({ isParsing }),
  reset: () =>
    set({
      profile: null,
      parsedResume: null,
      atsScore: 0,
      isUploading: false,
      isParsing: false,
    }),
}));

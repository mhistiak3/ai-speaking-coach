"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/types";

interface SettingsState extends UserSettings {
  update: (patch: Partial<UserSettings>) => void;
  reset: () => void;
}

/**
 * Persisted user settings. Deliberately small — everything here is safe to
 * read client-side (no secrets, no provider keys).
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: "asc.settings.v1",
      partialize: (state) => ({
        nativeLanguage: state.nativeLanguage,
        targetLanguage: state.targetLanguage,
        level: state.level,
        voiceId: state.voiceId,
        playbackRate: state.playbackRate,
        autoPlayVoice: state.autoPlayVoice,
        muted: state.muted,
        voiceGender: state.voiceGender,
        handsFree: state.handsFree,
        correctionFrequency: state.correctionFrequency,
        pronunciationFeedback: state.pronunciationFeedback,
        theme: state.theme,
      }),
    },
  ),
);

export function getSettingsSnapshot(): UserSettings {
  const s = useSettingsStore.getState();
  return {
    nativeLanguage: s.nativeLanguage,
    targetLanguage: s.targetLanguage,
    level: s.level,
    voiceId: s.voiceId,
    playbackRate: s.playbackRate,
    autoPlayVoice: s.autoPlayVoice,
    muted: s.muted,
    voiceGender: s.voiceGender,
    handsFree: s.handsFree,
    correctionFrequency: s.correctionFrequency,
    pronunciationFeedback: s.pronunciationFeedback,
    theme: s.theme,
  };
}

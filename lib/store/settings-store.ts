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
      version: 2,
      // v2: pauseTolerance default became "medium" (2.8s). One-time
      // migration so already-saved settings pick up the new default.
      migrate: (persisted, from) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (from < 2) s.pauseTolerance = "medium";
        return s;
      },
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
        pauseTolerance: state.pauseTolerance,
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
    pauseTolerance: s.pauseTolerance,
    pronunciationFeedback: s.pronunciationFeedback,
    theme: s.theme,
  };
}

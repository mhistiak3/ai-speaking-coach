"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WordAttempt, WordPracticeRecord, WordProfile } from "@/lib/types";
import { normalizeWord } from "@/lib/utils";

interface WordPracticeState {
  /** Key: `${language}:${lowercasedWord}` */
  words: Record<string, WordPracticeRecord>;
  recordAttempt: (input: {
    word: string;
    language: string;
    attempt: WordAttempt;
  }) => void;
  setProfile: (word: string, language: string, profile: WordProfile) => void;
  noteSeenInSession: (words: string[], language: string) => void;
  clearWord: (word: string, language: string) => void;
}

function key(word: string, language: string): string {
  return `${language}:${normalizeWord(word)}`;
}

/**
 * Tracks per-word practice attempts and cached word profiles so the word
 * panel and "difficult words" list work offline.
 */
export const useWordPracticeStore = create<WordPracticeState>()(
  persist(
    (set) => ({
      words: {},

      recordAttempt: ({ word, language, attempt }) =>
        set((state) => {
          const k = key(word, language);
          const existing = state.words[k];
          const attempts = [...(existing?.attempts ?? []), attempt].slice(-20);
          const record: WordPracticeRecord = {
            word: existing?.word ?? word,
            language,
            profile: existing?.profile ?? null,
            attempts,
            seenInSessions: existing?.seenInSessions ?? 0,
            lastPracticedAt: Date.now(),
          };
          return { words: { ...state.words, [k]: record } };
        }),

      setProfile: (word, language, profile) =>
        set((state) => {
          const k = key(word, language);
          const existing = state.words[k];
          return {
            words: {
              ...state.words,
              [k]: {
                word,
                language,
                profile,
                attempts: existing?.attempts ?? [],
                seenInSessions: existing?.seenInSessions ?? 0,
                lastPracticedAt: existing?.lastPracticedAt ?? null,
              },
            },
          };
        }),

      noteSeenInSession: (words, language) =>
        set((state) => {
          const next = { ...state.words };
          for (const w of words) {
            const k = key(w, language);
            const existing = next[k];
            next[k] = existing
              ? { ...existing, seenInSessions: existing.seenInSessions + 1 }
              : {
                  word: w,
                  language,
                  profile: null,
                  attempts: [],
                  seenInSessions: 1,
                  lastPracticedAt: null,
                };
          }
          return { words: next };
        }),

      clearWord: (word, language) =>
        set((state) => {
          const next = { ...state.words };
          delete next[key(word, language)];
          return { words: next };
        }),
    }),
    {
      name: "asc.words.v1",
      partialize: (state) => ({ words: state.words }),
    },
  ),
);

export function getDifficultWords(limit = 12): WordPracticeRecord[] {
  const { words } = useWordPracticeStore.getState();
  return Object.values(words)
    .sort((a, b) => b.seenInSessions - a.seenInSessions || (a.attempts.at(-1)?.accuracy ?? 1) - (b.attempts.at(-1)?.accuracy ?? 1))
    .slice(0, limit);
}

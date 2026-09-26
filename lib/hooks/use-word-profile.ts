"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWordPracticeStore } from "@/lib/store/word-practice-store";
import type { WordProfile } from "@/lib/types";

interface ProfileResponse {
  profile?: WordProfile;
  error?: { message?: string };
}

/**
 * Loads (and caches in the word-practice store) the pronunciation profile
 * for a single word. All setState happens in async callbacks so the effect
 * body stays pure-render-safe under React Compiler rules.
 */
export function useWordProfile(word: string, language: string, nativeLanguage: string) {
  const storeKey = `${language}:${word.toLowerCase()}`;
  const profile = useWordPracticeStore((s) => s.words[storeKey]?.profile ?? null);
  const requestedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    requestedRef.current = true;
    setError(null);
    void fetch("/api/word-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, targetLanguage: language, nativeLanguage }),
    })
      .then((r) => r.json() as Promise<ProfileResponse>)
      .then((data) => {
        if (data.profile) {
          useWordPracticeStore.getState().setProfile(word, language, data.profile);
        } else {
          setError(data.error?.message ?? "Couldn't load this word.");
        }
      })
      .catch(() => setError("Network problem loading the word profile."));
  }, [language, nativeLanguage, word]);

  useEffect(() => {
    if (profile || requestedRef.current) return;
    load();
  }, [profile, load]);

  return {
    profile,
    error,
    loading: !profile && !error,
    retry: load,
  };
}

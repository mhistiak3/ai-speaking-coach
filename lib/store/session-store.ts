"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  ChatMessage,
  ConversationSession,
  ProficiencyLevel,
  SessionStats,
  TurnAnalysis,
} from "@/lib/types";
import { getScenario } from "@/lib/scenarios";
import { uid } from "@/lib/utils";

const EMPTY_STATS: SessionStats = {
  turns: 0,
  wordsSpoken: 0,
  speakingMs: 0,
  durationMs: 0,
  fillers: 0,
  avgResponseMs: null,
  pronunciationAvg: null,
  grammarAvg: null,
  vocabularyAvg: null,
};

function recomputeStats(session: ConversationSession): SessionStats {
  const userMessages = session.messages.filter((m) => m.role === "user");
  const wordsSpoken = userMessages.reduce((sum, m) => sum + (m.wordCount ?? 0), 0);
  const speakingMs = userMessages.reduce((sum, m) => sum + (m.speechMs ?? 0), 0);
  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  return {
    turns: userMessages.length,
    wordsSpoken,
    speakingMs,
    durationMs:
      (session.endedAt ?? Date.now()) - session.createdAt,
    fillers: session.analyses.reduce((s, a) => s + a.fluency.fillerCount, 0),
    avgResponseMs: null,
    pronunciationAvg: avg(
      session.analyses.map((a) => a.pronunciation.value).filter((v): v is number => v != null),
    ),
    grammarAvg: avg(
      session.analyses.map((a) => a.grammar.value).filter((v): v is number => v != null),
    ),
    vocabularyAvg: avg(
      session.analyses.map((a) => a.vocabulary.value).filter((v): v is number => v != null),
    ),
  };
}

interface SessionsState {
  sessions: ConversationSession[];
  createSession: (input: {
    scenarioId: string;
    customTopic: string | null;
    nativeLanguage: string;
    targetLanguage: string;
    level: ProficiencyLevel;
  }) => ConversationSession;
  getSession: (id: string) => ConversationSession | undefined;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  addAnalysis: (sessionId: string, analysis: TurnAnalysis) => void;
  markEnded: (sessionId: string) => void;
  markSynced: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}

/**
 * Session persistence. localStorage is the source of truth for MVP; the
 * same shape is mirrored to Postgres on session end when DATABASE_URL is
 * configured (see lib/data/server-repo.ts).
 */
export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: [],

      createSession: (input) => {
        const scenario = getScenario(input.scenarioId);
        const session: ConversationSession = {
          id: uid("s"),
          createdAt: Date.now(),
          endedAt: null,
          scenarioId: input.scenarioId,
          customTopic: input.customTopic,
          nativeLanguage: input.nativeLanguage,
          targetLanguage: input.targetLanguage,
          level: input.level,
          greeting: scenario.startingPrompt,
          messages: [],
          analyses: [],
          stats: EMPTY_STATS,
          synced: false,
        };
        set((state) => ({ sessions: [session, ...state.sessions].slice(0, 100) }));
        return session;
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const next = { ...s, messages: [...s.messages, message] };
            return { ...next, stats: recomputeStats(next) };
          }),
        })),

      addAnalysis: (sessionId, analysis) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const next = { ...s, analyses: [...s.analyses, analysis] };
            return { ...next, stats: recomputeStats(next) };
          }),
        })),

      markEnded: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const next = { ...s, endedAt: Date.now() };
            return { ...next, stats: recomputeStats(next) };
          }),
        })),

      markSynced: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, synced: true } : s)),
        })),

      deleteSession: (sessionId) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== sessionId) })),
    }),
    {
      name: "asc.sessions.v1",
      partialize: (state) => ({ sessions: state.sessions }),
    },
  ),
);

/** Sync a finished session to Postgres (fire-and-forget when DB not configured). */
export async function syncSessionToServer(session: ConversationSession): Promise<boolean> {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { stored?: string };
    return data.stored === "postgres";
  } catch {
    return false;
  }
}

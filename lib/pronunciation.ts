import type { FinalTranscript } from "@/lib/speech/types";
import type { PronunciationWordIssue, ScoredMetric } from "@/lib/types";
import { normalizeWord } from "@/lib/utils";

/**
 * Pronunciation analysis with a strict honesty rule:
 *
 *   The browser Web Speech provider does NOT measure phoneme accuracy, so
 *   we never report a real pronunciation score from it. This module:
 *     1. uses REAL provider data when available (per-word confidence), and
 *     2. otherwise defers to an AI estimate produced server-side, clearly
 *        flagged with `estimated: true`.
 *
 * When a dedicated assessment API (e.g. Azure Pronunciation Assessment) is
 * wired up, it becomes a `PronunciationProvider` and this module will report
 * `estimated: false` for the signals it supplies.
 */

export interface PronunciationProvider {
  readonly id: string;
  /** Whether this provider returns true phoneme-level measurements. */
  readonly measuresAudio: boolean;
  analyze?(
    audioRef: unknown,
    expectedText: string,
    lang: string,
  ): Promise<{ score: number; words: PronunciationWordIssue[] }>;
}

/** Placeholder — no dedicated provider in the free MVP stack yet. */
export const noPronunciationProvider: PronunciationProvider = {
  id: "none",
  measuresAudio: false,
};

/**
 * Derive per-word signal purely from transcription (not audio measurement).
 * Low-confidence or context-mismatched words become "needs practice"
 * candidates. `estimated` is always true because this is inference.
 */
export function estimateFromTranscript(
  transcript: FinalTranscript,
): { perWord: Map<string, number>; anyReal: boolean } {
  const perWord = new Map<string, number>();
  let anyReal = false;
  for (const w of transcript.words) {
    if (w.confidence != null) {
      anyReal = true;
      perWord.set(normalizeWord(w.word), w.confidence);
    }
  }
  return { perWord, anyReal };
}

export function providerPronunciationScore(
  transcript: FinalTranscript,
): ScoredMetric {
  const { perWord, anyReal } = estimateFromTranscript(transcript);
  if (!anyReal) {
    // Provider gave no real confidence numbers → we cannot measure this.
    return { value: null, estimated: true };
  }
  const vals = [...perWord.values()];
  const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
  return { value: Math.round(avg * 100), estimated: false };
}

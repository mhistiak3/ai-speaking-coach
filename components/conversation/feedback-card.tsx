"use client";

import { useState } from "react";
import {
  Languages,
  Lightbulb,
  Loader2,
  Sparkles,
  Volume2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { browserTts } from "@/lib/speech/tts-browser";
import { getLanguage } from "@/lib/languages";
import type { TurnAnalysis } from "@/lib/types";
import { cn, scoreColor } from "@/lib/utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import { ScoreBar } from "@/components/ui/score-ring";

interface FeedbackCardProps {
  analysis: TurnAnalysis;
  /** What the user actually said this turn (for the native explanation). */
  userText: string;
  compact?: boolean;
}

/**
 * Per-turn coaching. Honesty rules baked into the UI:
 *  - pronunciation numbers show an "AI estimate" badge because the browser
 *    speech provider does not measure phonemes;
 *  - fluency signals are labelled "estimated" too.
 */
export function FeedbackCard({ analysis, userText, compact }: FeedbackCardProps) {
  const settings = useSettingsStore();
  const native = getLanguage(settings.nativeLanguage);
  const target = getLanguage(settings.targetLanguage);
  const [explaining, setExplaining] = useState(false);
  const [nativeExplanation, setNativeExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState(false);

  const showPronunciation = settings.pronunciationFeedback && analysis.pronunciation.value != null;
  const hasCorrection = analysis.correction != null;

  if (!showPronunciation && !hasCorrection && !analysis.encouragement && analysis.words.length === 0) {
    return null;
  }

  async function explainInNative() {
    if (!analysis.correction || explaining) return;
    setExplaining(true);
    setExplainError(false);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: userText || analysis.correction!.original,
          correction: analysis.correction,
          nativeLanguage: settings.nativeLanguage,
          targetLanguage: settings.targetLanguage,
          level: settings.level,
        }),
      });
      const data = (await res.json()) as { explanation?: string; error?: { message: string } };
      if (data.explanation) setNativeExplanation(data.explanation);
      else setExplainError(true);
    } catch {
      setExplainError(true);
    } finally {
      setExplaining(false);
    }
  }

  function listenWord(word: string) {
    browserTts.speak(word, { lang: target.speechTag, rate: 0.8, voiceId: settings.voiceId });
  }

  return (
    <div
      className={cn(
        "glass animate-fade-up rounded-3xl p-4",
        compact && "p-3.5",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Sparkles className="size-4 text-brand" />
        <span className="text-sm font-bold text-ink">This turn</span>
        <Badge tone="brand" className="ml-auto">AI estimate</Badge>
      </div>

      {showPronunciation && (
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink-soft">Pronunciation</span>
            <span className={cn("text-lg font-bold tabular-nums", scoreColor(analysis.pronunciation.value))}>
              {Math.round(analysis.pronunciation.value!)}/100
            </span>
          </div>
          <div className="mt-1.5">
            <ScoreBar score={analysis.pronunciation.value!} />
          </div>
          <p className="mt-1 text-[10px] text-ink-faint">
            Estimated from transcript + {native.name} accent patterns — not a phoneme measurement.
          </p>
        </div>
      )}

      {analysis.words.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-semibold text-ink-soft">Tricky words</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.words.map((w) => (
              <Link
                key={w.word}
                href={`/practice/word/${encodeURIComponent(w.word)}`}
                title={w.tip}
                className="group inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-3 py-1.5 text-sm font-semibold text-warn transition-all hover:scale-105 hover:bg-warn/20"
              >
                {w.word}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Hear ${w.word}`}
                  onClick={(e) => {
                    e.preventDefault();
                    listenWord(w.word);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      listenWord(w.word);
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-warn/20"
                >
                  <Volume2 className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasCorrection && (
        <div className="mt-4 rounded-2xl border border-edge bg-black/3 p-3.5 dark:bg-white/4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Lightbulb className="size-3.5 text-warn" />
            Better way to say it
          </span>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-faint line-through decoration-bad/50">
            {analysis.correction!.original}
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
            “{analysis.correction!.improved}”
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{analysis.correction!.why}</p>

          {nativeExplanation ? (
            <p dir="auto" className="mt-2 rounded-xl bg-brand/10 px-3 py-2 text-xs leading-relaxed text-ink">
              {native.flag} {nativeExplanation}
            </p>
          ) : (
            <button
              onClick={explainInNative}
              disabled={explaining}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand/30 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
            >
              {explaining ? <Loader2 className="size-3 animate-spin" /> : <Languages className="size-3" />}
              Explain in {native.name}
            </button>
          )}
          {explainError && (
            <p className="mt-1.5 text-[11px] text-bad">Couldn&apos;t load the explanation. Tap again to retry.</p>
          )}
        </div>
      )}

      {analysis.encouragement && !compact && (
        <p className="mt-3.5 flex items-start gap-1.5 text-xs italic leading-relaxed text-good">
          <Sparkles className="mt-0.5 size-3 shrink-0" />
          {analysis.encouragement}
        </p>
      )}
    </div>
  );
}

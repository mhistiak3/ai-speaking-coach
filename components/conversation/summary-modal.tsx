"use client";

import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ScoreRing } from "@/components/ui/score-ring";
import { useSessionsStore } from "@/lib/store/session-store";
import type { ConversationSession } from "@/lib/types";

interface SummaryModalProps {
  session: ConversationSession;
  open: boolean;
  onClose: () => void;
}

export function SummaryModal({ session, open, onClose }: SummaryModalProps) {
  const router = useRouter();
  const stats = session.stats;
  const seconds = stats.durationMs / 1000;

  const corrections = session.analyses
    .map((a) => a.correction)
    .filter((c): c is NonNullable<typeof c> => c != null)
    .slice(0, 4);

  const difficultWords = Object.entries(
    session.analyses.reduce<Record<string, number>>((acc, a) => {
      for (const w of a.words) acc[w.word.toLowerCase()] = (acc[w.word.toLowerCase()] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([word]) => word);

  async function practiceAgain() {
    const next = useSessionsStore.getState().createSession({
      scenarioId: session.scenarioId,
      customTopic: session.customTopic,
      nativeLanguage: session.nativeLanguage,
      targetLanguage: session.targetLanguage,
      level: session.level,
    });
    router.push(`/practice/${next.id}`);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Session summary" size="lg">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl btn-gradient">
          <Sparkles className="size-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-ink">
            {session.customTopic ?? session.scenarioId.replace(/-/g, " ")}
          </p>
          <p className="text-xs text-ink-soft capitalize">
            {stats.turns} replies · {Math.round(seconds / 60)}m {Math.round(seconds % 60)}s ·{" "}
            {stats.wordsSpoken} words spoken
          </p>
        </div>
        <Badge tone={session.synced ? "good" : "neutral"} className="ml-auto">
          {session.synced ? "synced" : "saved locally"}
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock value={Math.round(seconds)} unit="s" label="Duration" />
        <StatBlock value={stats.wordsSpoken} label="Words spoken" />
        <StatBlock value={stats.turns} label="Your replies" />
        <StatBlock value={stats.fillers} label="Filler words" />
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 sm:gap-10">
        <ScoreRing score={stats.pronunciationAvg} label="Pronunciation" sublabel="est." />
        <ScoreRing score={stats.grammarAvg} label="Grammar" sublabel="est." />
        <ScoreRing score={stats.vocabularyAvg} label="Vocabulary" sublabel="est." />
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-faint">
        Scores are AI estimates. Connect a phoneme assessment provider in Settings for measured
        accuracy.
      </p>

      {difficultWords.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Words to practice
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {difficultWords.map((w) => (
              <Link
                key={w}
                href={`/practice/word/${encodeURIComponent(w)}`}
                className="rounded-full border border-edge-strong bg-black/4 px-3 py-1.5 text-sm font-medium text-ink transition-all hover:border-brand/50 hover:text-brand dark:bg-white/5"
              >
                {w}
              </Link>
            ))}
          </div>
        </div>
      )}

      {corrections.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Important corrections
          </p>
          <ul className="mt-2 space-y-2.5">
            {corrections.map((c, i) => (
              <li key={i} className="rounded-2xl border border-edge bg-black/2 p-3 text-sm dark:bg-white/3">
                <span className="text-ink-faint line-through decoration-bad/40">{c.original}</span>
                <span className="mx-2 text-brand-2">→</span>
                <span className="font-semibold text-ink">{c.improved}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={practiceAgain} className="flex-1">
          <RotateCcw className="size-4" /> Practice this scenario again
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
          Done <ArrowRight className="size-4" />
        </Button>
      </div>
    </Dialog>
  );
}

function StatBlock({ value, unit, label }: { value: number; unit?: string; label: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-black/2 p-3 text-center dark:bg-white/3">
      <p className="text-xl font-bold tabular-nums text-ink">
        {value}
        {unit && <span className="text-xs font-medium text-ink-faint">{unit}</span>}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}

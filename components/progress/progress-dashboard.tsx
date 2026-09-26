"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Flame,
  MessagesSquare,
  Database,
  Sparkles,
  Type,
} from "lucide-react";

import { AppHeader, MobileNav } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { useSessionsStore } from "@/lib/store/session-store";
import { useWordPracticeStore } from "@/lib/store/word-practice-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { SCENARIOS } from "@/lib/scenarios";
import { cn, dayKey, formatDuration } from "@/lib/utils";

interface DbAggregate {
  sessions: number;
  totalSpeakingSeconds: number;
  avgPronunciation: number | null;
  topDifficultWords: { word: string; count: number }[];
}

export function ProgressDashboard() {
  const sessions = useSessionsStore((s) => s.sessions);
  const words = useWordPracticeStore((s) => s.words);
  const hydrated = useHydrated();
  const [dbAggregate, setDbAggregate] = useState<DbAggregate | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.enabled && data.aggregate) setDbAggregate(data.aggregate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const finished = useMemo(
    () => (hydrated ? sessions.filter((s) => s.endedAt != null) : []),
    [hydrated, sessions],
  );

  const totals = useMemo(() => {
    const durationMs = finished.reduce((sum, s) => sum + s.stats.durationMs, 0);
    const speakingMs = finished.reduce((sum, s) => sum + s.stats.speakingMs, 0);
    const wordsSpoken = finished.reduce((sum, s) => sum + s.stats.wordsSpoken, 0);
    const pronScores = finished
      .map((s) => s.stats.pronunciationAvg)
      .filter((v): v is number => v != null);
    const gramScores = finished
      .map((s) => s.stats.grammarAvg)
      .filter((v): v is number => v != null);
    const vocabScores = finished
      .map((s) => s.stats.vocabularyAvg)
      .filter((v): v is number => v != null);
    const mean = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    return {
      durationMs,
      speakingMs,
      wordsSpoken,
      pronunciationAvg: mean(pronScores),
      grammarAvg: mean(gramScores),
      vocabularyAvg: mean(vocabScores),
    };
  }, [finished]);

  // current streak (consecutive days with at least one session, ending today/yesterday)
  const streak = useMemo(() => {
    const days = new Set(sessions.map((s) => dayKey(s.createdAt)));
    let count = 0;
    const cursor = new Date();
    // allow streak to start from today or yesterday
    if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    for (;;) {
      if (days.has(dayKey(cursor.getTime()))) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return count;
  }, [sessions]);

  // last 14 days activity bars
  const activity = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d.getTime());
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        count: sessions.filter((s) => dayKey(s.createdAt) === key).length,
      });
    }
    return days;
  }, [sessions]);
  const maxCount = Math.max(1, ...activity.map((d) => d.count));

  const difficultWords = useMemo(
    () =>
      Object.values(words)
        .sort((a, b) => b.seenInSessions - a.seenInSessions)
        .slice(0, 14),
    [words],
  );

  return (
    <div className="flex min-h-dvh flex-col pb-24 sm:pb-10">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Your progress
          </h1>
          <Badge tone={dbAggregate ? "good" : "neutral"}>
            <Database className="size-3" />
            {dbAggregate ? "Postgres mirror on" : "stored on this device"}
          </Badge>
        </div>

        {/* headline stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<MessagesSquare className="size-4" />}
            value={String(finished.length)}
            label="Conversations"
          />
          <StatTile
            icon={<Clock className="size-4" />}
            value={formatDuration(totals.durationMs / 1000)}
            label="Time speaking"
          />
          <StatTile
            icon={<Type className="size-4" />}
            value={String(totals.wordsSpoken)}
            label="Words spoken"
          />
          <StatTile
            icon={<Flame className={cn("size-4", streak > 0 && "text-warn")} />}
            value={`${streak}d`}
            label="Current streak"
            highlight={streak >= 3}
          />
        </div>

        {/* score rings */}
        <section className="glass mt-6 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <SectionLabel>Average skill estimates</SectionLabel>
            <Badge tone="brand">AI estimated</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-8 sm:justify-around">
            <ScoreRing score={totals.pronunciationAvg} label="Pronunciation" sublabel="est." />
            <ScoreRing score={totals.grammarAvg} label="Grammar" sublabel="est." />
            <ScoreRing score={totals.vocabularyAvg} label="Vocabulary" sublabel="est." />
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-faint">
            These are language-model estimates from your transcripts — not phoneme measurements.
            A dedicated pronunciation provider can replace them with real scores.
          </p>
        </section>

        {/* activity */}
        <section className="glass mt-6 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-brand" />
            <SectionLabel>Last 14 days</SectionLabel>
          </div>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {activity.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-500",
                    d.count > 0 ? "btn-gradient" : "bg-edge",
                  )}
                  style={{ height: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
                  title={`${d.count} conversation${d.count === 1 ? "" : "s"}`}
                />
                <span className="text-[9px] text-ink-faint">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* difficult words */}
        <section className="glass mt-6 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <SectionLabel>Words to master</SectionLabel>
          </div>
          {difficultWords.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              No difficult words tracked yet — finish a conversation and your tricky words will
              appear here.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {difficultWords.map((w) => (
                <Link
                  key={`${w.language}:${w.word}`}
                  href={`/practice/word/${encodeURIComponent(w.word)}`}
                  className="group flex items-center gap-2 rounded-full border border-edge-strong bg-black/3 px-3.5 py-1.5 text-sm font-semibold text-ink transition-all hover:border-brand/50 hover:text-brand dark:bg-white/4"
                >
                  {w.word}
                  <span className="text-[10px] font-medium text-ink-faint">
                    ×{w.seenInSessions}
                  </span>
                  {w.attempts.length > 0 && (
                    <span className="text-[10px] font-medium text-good">
                      {Math.round((w.attempts.at(-1)?.accuracy ?? 0) * 100)}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* recent sessions */}
        <section className="mt-6">
          <SectionLabel>Session history</SectionLabel>
          {finished.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              End a conversation to build history.{" "}
              <Link href="/practice" className="font-semibold text-brand hover:underline">
                Start one now →
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {finished.slice(0, 10).map((s) => {
                const scenario = SCENARIOS.find((x) => x.id === s.scenarioId);
                return (
                  <li key={s.id} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
                    <span className="text-xl">{scenario?.emoji ?? "💬"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {s.customTopic ?? scenario?.title ?? s.scenarioId}
                      </span>
                      <span className="block text-[11px] text-ink-faint">
                        {new Date(s.createdAt).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        · {formatDuration(s.stats.durationMs / 1000)} · {s.stats.wordsSpoken} words
                      </span>
                    </span>
                    {s.stats.pronunciationAvg != null && (
                      <Badge tone={s.stats.pronunciationAvg >= 80 ? "good" : "warn"}>
                        {Math.round(s.stats.pronunciationAvg)} est.
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <MobileNav />
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-4 transition-all",
        highlight && "ring-1 ring-warn/40",
      )}
    >
      <span className={cn("text-ink-faint", highlight && "text-warn")}>{icon}</span>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] font-medium text-ink-faint">{label}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock,
  MessagesSquare,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import { AppHeader, MobileNav } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { useSessionsStore } from "@/lib/store/session-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useNow } from "@/lib/hooks/use-now";
import { SCENARIOS, CUSTOM_SCENARIO_ID } from "@/lib/scenarios";
import { getLanguage } from "@/lib/languages";
import { cn, formatDuration } from "@/lib/utils";

export function PracticeHub() {
  const router = useRouter();
  const settings = useSettingsStore();
  const sessions = useSessionsStore((s) => s.sessions);
  const createSession = useSessionsStore((s) => s.createSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);
  const hydrated = useHydrated();
  const now = useNow();
  const [customOpen, setCustomOpen] = useState(false);
  const [customTopic, setCustomTopic] = useState("");

  const native = getLanguage(settings.nativeLanguage);
  const target = getLanguage(settings.targetLanguage);
  const ongoing = hydrated ? sessions.filter((s) => s.endedAt == null) : [];
  const finished = hydrated ? sessions.filter((s) => s.endedAt != null).slice(0, 8) : [];

  function quickStart(scenarioId: string) {
    const session = createSession({
      scenarioId,
      customTopic: null,
      nativeLanguage: settings.nativeLanguage,
      targetLanguage: settings.targetLanguage,
      level: settings.level,
    });
    router.push(`/practice/${session.id}`);
  }

  function quickCustom() {
    const topic = customTopic.trim();
    if (!topic) return;
    quickStartWithTopic(topic);
  }

  function quickStartWithTopic(topic: string) {
    const session = createSession({
      scenarioId: CUSTOM_SCENARIO_ID,
      customTopic: topic,
      nativeLanguage: settings.nativeLanguage,
      targetLanguage: settings.targetLanguage,
      level: settings.level,
    });
    router.push(`/practice/${session.id}`);
  }

  return (
    <div className="flex min-h-dvh flex-col pb-24 sm:pb-10">
      <AppHeader
        cta={
          <Button size="sm" onClick={() => router.push("/onboarding")}>
            <Plus className="size-4" /> New setup
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Ready to speak?
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {hydrated ? (
                <>
                  {native.flag} {native.name} → {target.flag} {target.name} ·{" "}
                  <span className="capitalize">{settings.level}</span>
                </>
              ) : (
                <span className="text-ink-faint">Loading your profile…</span>
              )}
            </p>
          </div>
          <Link href="/onboarding">
            <Button variant="secondary" size="sm">
              Change languages <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {ongoing.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Resume a conversation</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ongoing.map((s) => {
                const scenario = SCENARIOS.find((x) => x.id === s.scenarioId);
                return (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/practice/${s.id}`)}
                    className="glass group flex items-center gap-4 rounded-3xl p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40"
                  >
                    <span className="text-3xl">{scenario?.emoji ?? "💬"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {s.customTopic ?? scenario?.title ?? s.scenarioId}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
                        <Clock className="size-3" />
                        {formatDuration(Math.max(0, (now - s.createdAt) / 1000))} elapsed ·{" "}
                        <MessagesSquare className="size-3" />
                        {s.stats.turns} replies
                      </span>
                    </span>
                    <Play className="size-5 shrink-0 text-brand transition-transform group-hover:scale-125" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <SectionLabel>Choose a scenario</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => quickStart(s.id)}
                className={cn(
                  "glass group flex animate-fade-up flex-col items-start gap-2 rounded-3xl p-4 text-left transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10",
                )}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <span className="text-3xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6">
                  {s.emoji}
                </span>
                <span className="text-sm font-bold leading-tight text-ink">{s.title}</span>
                <span className="line-clamp-2 text-[11px] leading-snug text-ink-faint">
                  {s.description}
                </span>
              </button>
            ))}

            {/* custom topic */}
            <div
              className={cn(
                "glass group flex animate-fade-up flex-col items-start gap-2 rounded-3xl p-4",
                customOpen && "ring-2 ring-brand sm:col-span-2 lg:col-span-2",
              )}
              style={{ animationDelay: "330ms" }}
            >
              <button
                onClick={() => setCustomOpen((v) => !v)}
                className="flex flex-col items-start gap-2 text-left"
              >
                <span className="text-3xl transition-transform duration-300 group-hover:scale-125">
                  💬
                </span>
                <span className="text-sm font-bold leading-tight text-ink">Custom topic</span>
                <span className="line-clamp-2 text-[11px] leading-snug text-ink-faint">
                  “Talk to me about JavaScript…”
                </span>
              </button>
              {customOpen && (
                <form
                  className="mt-1 flex w-full gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    quickCustom();
                  }}
                >
                  <input
                    autoFocus
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="What should we talk about?"
                    maxLength={120}
                    className="h-10 w-full min-w-0 flex-1 rounded-xl border border-edge bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
                  />
                  <Button size="sm" type="submit" className="h-10" disabled={!customTopic.trim()}>
                    <Play className="size-3.5" /> Go
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {finished.length > 0 && (
          <section className="mt-10">
            <SectionLabel>Recent sessions</SectionLabel>
            <ul className="mt-3 space-y-2">
              {finished.map((s) => {
                const scenario = SCENARIOS.find((x) => x.id === s.scenarioId);
                return (
                  <li
                    key={s.id}
                    className="glass flex items-center gap-3 rounded-2xl px-4 py-3"
                  >
                    <span className="text-xl">{scenario?.emoji ?? "💬"}</span>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => router.push(`/practice/${s.id}`)}
                    >
                      <span className="block truncate text-sm font-semibold text-ink">
                        {s.customTopic ?? scenario?.title ?? s.scenarioId}
                      </span>
                      <span className="block text-[11px] text-ink-faint">
                        {new Date(s.createdAt).toLocaleDateString()} ·{" "}
                        {formatDuration(s.stats.durationMs / 1000)} · {s.stats.wordsSpoken} words
                        {s.stats.pronunciationAvg != null &&
                          ` · pron ${Math.round(s.stats.pronunciationAvg)} (est.)`}
                      </span>
                    </button>
                    <Badge tone={s.synced ? "good" : "neutral"} className="hidden sm:inline-flex">
                      {s.synced ? "synced" : "local"}
                    </Badge>
                    <button
                      onClick={() => deleteSession(s.id)}
                      aria-label={`Delete session ${s.id}`}
                      className="rounded-full p-2 text-ink-faint transition-colors hover:bg-bad/10 hover:text-bad"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

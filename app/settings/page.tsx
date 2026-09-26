"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { AppHeader, MobileNav } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { Segmented, Switch } from "@/components/ui/controls";
import { browserTts } from "@/lib/speech/tts-browser";
import type { VoiceInfo } from "@/lib/speech/types";
import { useSessionsStore } from "@/lib/store/session-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useWordPracticeStore } from "@/lib/store/word-practice-store";
import { getLanguage, NATIVE_LANGUAGES, PRACTICE_LANGUAGES } from "@/lib/languages";
import type { CorrectionFrequency, ProficiencyLevel } from "@/lib/types";

interface Health {
  ai: { configured: boolean; provider: string; model: string };
}

export function SettingsForm() {
  const router = useRouter();
  const settings = useSettingsStore();
  const update = useSettingsStore((s) => s.update);
  const resetSettings = useSettingsStore((s) => s.reset);

  const [health, setHealth] = useState<Health | null>(null);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);

  const target = getLanguage(settings.targetLanguage);
  const native = getLanguage(settings.nativeLanguage);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    browserTts
      .listVoices(target.speechTag.split("-")[0])
      .then((v) => {
        if (!cancelled) setVoices(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [target.speechTag]);

  const sampleByLang = useMemo(
    () => ({
      en: "Nice! What do you usually do after work?",
      es: "¿Qué haces normalmente después del trabajo?",
      fr: "Que fais-tu après le travail ?",
      de: "Was machst du normalerweise nach der Arbeit?",
      pt: "O que você faz depois do trabalho?",
      ja: "仕事の後、何をしますか？",
      ko: "퇴근 후에 보통 뭐 해요?",
      zh: "你下班后通常做什么？",
      ar: "ماذا تفعل عادة بعد العمل؟",
      it: "Cosa fai di solito dopo il lavoro?",
    } as Record<string, string>),
    [],
  );

  function previewVoice() {
    browserTts.cancelAll();
    browserTts.speak(
      sampleByLang[settings.targetLanguage] ?? sampleByLang.en!,
      {
        lang: target.speechTag,
        voiceId: settings.voiceId,
        rate: settings.playbackRate,
        gender: settings.voiceGender,
      },
      { onError: () => setHealth((h) => h) },
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-24 sm:pb-10">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Tune your languages, voice, and coaching.</p>

        {/* ── Languages ── */}
        <section className="glass mt-6 rounded-3xl p-6">
          <SectionLabel>Languages</SectionLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
                I speak
              </span>
              <select
                value={settings.nativeLanguage}
                onChange={(e) => update({ nativeLanguage: e.target.value })}
                className="h-11 w-full rounded-xl border border-edge bg-[var(--surface-solid)] px-3 text-sm text-ink outline-none focus:border-brand"
              >
                {NATIVE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
                I&apos;m practicing
              </span>
              <select
                value={settings.targetLanguage}
                onChange={(e) =>
                  update({ targetLanguage: e.target.value, voiceId: null })
                }
                className="h-11 w-full rounded-xl border border-edge bg-[var(--surface-solid)] px-3 text-sm text-ink outline-none focus:border-brand"
              >
                {PRACTICE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Level</span>
            <Segmented<ProficiencyLevel>
              ariaLabel="Proficiency level"
              value={settings.level}
              onChange={(level) => update({ level })}
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          </div>

          <button
            onClick={() => router.push("/onboarding")}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-edge px-4 py-3 text-left text-sm text-ink transition-colors hover:border-brand/40"
          >
            <span>
              <span className="block font-semibold">Redo full onboarding</span>
              <span className="block text-xs text-ink-faint">
                {native.name} → {target.name}
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-faint" />
          </button>
        </section>

        {/* ── Voice ── */}
        <section className="glass mt-5 rounded-3xl p-6">
          <SectionLabel>AI voice</SectionLabel>
          <div className="mt-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Voice ({target.name})
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={settings.voiceId ?? ""}
                  onChange={(e) => update({ voiceId: e.target.value || null })}
                  disabled={voices.length === 0}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-edge bg-[var(--surface-solid)] px-3 text-sm text-ink outline-none focus:border-brand disabled:opacity-50"
                >
                  <option value="">
                    {voices.length === 0
                      ? "Loading voices…"
                      : `Auto — ${settings.voiceGender === "any" ? "best" : settings.voiceGender} ${target.name} voice`}
                  </option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.gender === "male" ? "♂ " : v.gender === "female" ? "♀ " : ""}
                      {v.name} ({v.lang})
                      {v.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </select>
                <Button size="md" variant="secondary" onClick={previewVoice} aria-label="Preview voice">
                  {settings.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </Button>
              </div>
            </label>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Browsers don&apos;t label voice gender — pick a specific voice above for an exact
              match, or use Auto with a preference.
            </p>
          </div>

          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Preferred voice (Auto mode)
            </span>
            <Segmented<"male" | "female" | "any">
              ariaLabel="Preferred voice gender"
              value={settings.voiceGender}
              onChange={(voiceGender) => update({ voiceGender })}
              options={[
                { value: "male", label: "♂ Male" },
                { value: "female", label: "♀ Female" },
                { value: "any", label: "Any" },
              ]}
            />
          </div>

          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Playback speed</span>
            <Segmented<number>
              ariaLabel="Playback speed"
              value={settings.playbackRate}
              onChange={(playbackRate) => update({ playbackRate })}
              options={[
                { value: 0.75, label: "0.75× slower" },
                { value: 1, label: "1× normal" },
              ]}
            />
          </div>

          <Switch
            checked={settings.autoPlayVoice}
            onChange={(autoPlayVoice) => update({ autoPlayVoice })}
            label="Auto-play AI voice"
            description="The partner speaks every reply out loud."
          />
          <Switch
            checked={!settings.muted}
            onChange={(soundOn) => update({ muted: !soundOn })}
            label="Sound on"
            description="Turn off to read replies silently."
          />
        </section>

        {/* ── Coaching ── */}
        <section className="glass mt-5 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <SectionLabel>Coaching</SectionLabel>
          </div>
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Correction frequency
            </span>
            <Segmented<CorrectionFrequency>
              ariaLabel="Correction frequency"
              value={settings.correctionFrequency}
              onChange={(correctionFrequency) => update({ correctionFrequency })}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </div>
          <Switch
            checked={settings.pronunciationFeedback}
            onChange={(pronunciationFeedback) => update({ pronunciationFeedback })}
            label="Pronunciation feedback"
            description="Per-turn estimates of tricky words. AI-estimated, never faked."
          />
          <div className="mt-2 rounded-2xl border border-edge bg-black/2 p-3 text-[11px] leading-relaxed text-ink-faint dark:bg-white/3">
            The browser speech engine can&apos;t measure phonemes, so pronunciation scores are
            labelled <Badge tone="brand" className="mx-1">AI estimate</Badge> until a dedicated
            assessment provider (e.g. Azure Pronunciation Assessment) is connected.
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="glass mt-5 rounded-3xl p-6">
          <SectionLabel>Appearance</SectionLabel>
          <div className="mt-4">
            <Segmented<"dark" | "light">
              ariaLabel="Theme"
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: "dark", label: "🌙 Dark" },
                { value: "light", label: "☀️ Light" },
              ]}
            />
          </div>
        </section>

        {/* ── System status ── */}
        <section className="glass mt-5 rounded-3xl p-6">
          <SectionLabel>System status</SectionLabel>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              {health == null ? (
                <Loader2 className="size-4 animate-spin text-ink-faint" />
              ) : health.ai.configured ? (
                <CheckCircle2 className="size-4 text-good" />
              ) : (
                <CircleAlert className="size-4 text-warn" />
              )}
              <span className="text-ink">
                AI provider
                <span className="text-ink-faint">
                  {" "}
                  · {health ? `${health.ai.provider} · ${health.ai.model}` : "checking…"}
                </span>
              </span>
              {!health?.ai.configured && (
                <Badge tone="warn" className="ml-auto">
                  add key in .env.local
                </Badge>
              )}
            </li>
            <li className="flex items-center gap-2.5">
              {health == null ? (
                <Loader2 className="size-4 animate-spin text-ink-faint" />
              ) : typeof window !== "undefined" &&
                ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) ? (
                <CheckCircle2 className="size-4 text-good" />
              ) : (
                <CircleAlert className="size-4 text-bad" />
              )}
              <span className="text-ink">
                Speech engine <span className="text-ink-faint">· browser Web Speech (free)</span>
              </span>
            </li>
          </ul>
        </section>

        {/* ── Privacy ── */}
        <section className="glass mt-5 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-good" />
            <SectionLabel>Privacy</SectionLabel>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-soft">
            <li>Microphone audio is only used for live transcription — nothing is recorded to disk.</li>
            <li>Browser speech may route audio through your browser vendor&apos;s service (e.g. Chrome → Google).</li>
            <li>Transcripts & summaries stay in this browser&apos;s localStorage — this app has no database.</li>
            <li>Your API keys never reach the browser — all AI calls run through server routes.</li>
          </ul>
        </section>

        {/* ── Danger zone ── */}
        <section className="mt-5 rounded-3xl border border-bad/25 p-6">
          <SectionLabel>Reset</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm("Delete ALL local history, words, and settings?")) {
                  useSessionsStore.getState().sessions.forEach((s) =>
                    useSessionsStore.getState().deleteSession(s.id),
                  );
                  useWordPracticeStore.setState({ words: {} });
                  resetSettings();
                  router.push("/");
                }
              }}
            >
              <RotateCcw className="size-4" /> Erase local data
            </Button>
          </div>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsForm />;
}

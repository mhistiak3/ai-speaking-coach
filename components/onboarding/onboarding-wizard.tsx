"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useSessionsStore } from "@/lib/store/session-store";
import { getLanguage, NATIVE_LANGUAGES, PRACTICE_LANGUAGES } from "@/lib/languages";
import { SCENARIOS, CUSTOM_SCENARIO_ID } from "@/lib/scenarios";
import type { ProficiencyLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVELS: { value: ProficiencyLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "Short answers, simple words" },
  { value: "intermediate", label: "Intermediate", hint: "Everyday fluency, some idioms" },
  { value: "advanced", label: "Advanced", hint: "Fast, natural, nuanced chat" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((s) => s.update);
  const createSession = useSessionsStore((s) => s.createSession);

  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ProficiencyLevel>(settings.level);
  const [scenarioId, setScenarioId] = useState<string>("daily-life");
  const [customTopic, setCustomTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const native = getLanguage(settings.nativeLanguage);
  const target = getLanguage(settings.targetLanguage);

  const steps = useMemo(
    () => ["Native language", "Practice language", "Your level", "Pick a scenario"],
    [],
  );

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else void start();
  }

  async function start() {
    setCreating(true);
    const isCustom = scenarioId === CUSTOM_SCENARIO_ID;
    const session = createSession({
      scenarioId,
      customTopic: isCustom ? customTopic.trim() || null : null,
      nativeLanguage: settings.nativeLanguage,
      targetLanguage: settings.targetLanguage,
      level,
    });
    updateSettings({ level });
    // brief optimistic delay for the button state to land
    setTimeout(() => router.push(`/practice/${session.id}`), 220);
  }

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />

      <main className="flex-1 overflow-y-auto px-4 pt-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col">
        {/* progress */}
        <div className="mb-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i <= step ? "btn-solid" : "bg-edge",
                )}
              />
              <span
                className={cn(
                  "hidden text-[10px] font-semibold sm:block",
                  i === step ? "text-ink" : "text-ink-faint",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <StepShell
            title="What language do you speak?"
            subtitle="We use this only when you need a nudge or explanation."
          >
            <LanguageGrid
              languages={NATIVE_LANGUAGES}
              selected={settings.nativeLanguage}
              onSelect={(code) => updateSettings({ nativeLanguage: code })}
            />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            title="What do you want to practice?"
            subtitle="The language you'll speak out loud in every conversation."
          >
            <LanguageGrid
              languages={PRACTICE_LANGUAGES}
              selected={settings.targetLanguage}
              onSelect={(code) => updateSettings({ targetLanguage: code })}
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="How would you rate your level?" subtitle="This tunes the AI's vocabulary and pace.">
            <div className="grid gap-3 sm:grid-cols-3">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    "glass rounded-3xl p-5 text-left transition-all hover:-translate-y-0.5",
                    level === l.value && "ring-2 ring-brand",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-ink">{l.label}</span>
                    {level === l.value && <Check className="size-4 text-brand" />}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{l.hint}</p>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            title="Pick a conversation"
            subtitle="Choose a roleplay scenario — or invent your own topic."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenarioId(s.id)}
                  className={cn(
                    "glass flex items-start gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5",
                    scenarioId === s.id && "ring-2 ring-brand",
                  )}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{s.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
                      {s.description}
                    </span>
                  </span>
                </button>
              ))}
              <button
                onClick={() => setScenarioId(CUSTOM_SCENARIO_ID)}
                className={cn(
                  "glass flex items-start gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5",
                  scenarioId === CUSTOM_SCENARIO_ID && "ring-2 ring-brand",
                )}
              >
                <span className="text-2xl">💬</span>
                <span>
                  <span className="block text-sm font-bold text-ink">Custom topic</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    You decide what we talk about.
                  </span>
                </span>
              </button>
            </div>

            {scenarioId === CUSTOM_SCENARIO_ID && (
              <input
                autoFocus
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Talk to me about movies"
                maxLength={120}
                className="mt-4 h-12 w-full rounded-2xl border border-edge bg-transparent px-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
              />
            )}
          </StepShell>
        )}

        </div>
      </main>

      {/* nav footer — in-flow (never hidden by browser UI or other fixed bars) */}
      <footer className="border-t border-edge bg-[var(--surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={cn(step === 0 && "invisible")}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="hidden items-center gap-2 text-xs text-ink-faint sm:flex">
              <Badge tone="neutral">{native.flag} {native.name}</Badge>
              <ArrowRight className="size-3" />
              <Badge tone="brand">{target.flag} {target.name}</Badge>
            </div>
            <Button
              onClick={next}
              disabled={step === 3 && scenarioId === CUSTOM_SCENARIO_ID && !customTopic.trim()}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : step === steps.length - 1 ? (
                <>
                  <Sparkles className="size-4" /> Start talking
                </>
              ) : (
                <>Next <ArrowRight className="size-4" /></>
              )}
            </Button>
          </div>
      </footer>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function LanguageGrid({
  languages,
  selected,
  onSelect,
}: {
  languages: ReturnType<typeof getLanguage>[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang.code)}
          aria-pressed={selected === lang.code}
          className={cn(
            "glass flex items-center gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5",
            selected === lang.code && "ring-2 ring-brand",
          )}
        >
          <span className="text-2xl">{lang.flag}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{lang.name}</span>
            <span className="block truncate text-xs text-ink-faint">{lang.nativeName}</span>
          </span>
          {selected === lang.code && <Check className="ml-auto size-4 shrink-0 text-brand" />}
        </button>
      ))}
    </div>
  );
}

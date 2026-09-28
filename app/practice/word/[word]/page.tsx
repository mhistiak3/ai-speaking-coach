"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Gauge,
  Mic,
  Repeat,
  Volume2,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/score-ring";
import { webSpeechStt } from "@/lib/speech/stt-web-speech";
import { browserTts } from "@/lib/speech/tts-browser";
import type { SpeechError } from "@/lib/speech/types";
import { useWordPracticeStore } from "@/lib/store/word-practice-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useWordProfile } from "@/lib/hooks/use-word-profile";
import { getLanguage } from "@/lib/languages";
import { cn, similarity } from "@/lib/utils";

type AttemptState = "idle" | "listening" | "done";

export default function WordPracticePage() {
  const params = useParams<{ word: string }>();
  const router = useRouter();
  const word = useMemo(() => decodeURIComponent(params?.word ?? ""), [params?.word]);

  const targetLanguage = useSettingsStore((s) => s.targetLanguage);
  const nativeLanguage = useSettingsStore((s) => s.nativeLanguage);
  const voiceId = useSettingsStore((s) => s.voiceId);
  const voiceGender = useSettingsStore((s) => s.voiceGender);
  const target = getLanguage(targetLanguage);
  const native = getLanguage(nativeLanguage);

  const record = useWordPracticeStore((s) => s.words[`${targetLanguage}:${word.toLowerCase()}`]);
  const recordAttemptFn = useWordPracticeStore((s) => s.recordAttempt);
  const { profile, error: profileError, loading: loadingProfile, retry } = useWordProfile(
    word,
    targetLanguage,
    nativeLanguage,
  );

  const [attemptState, setAttemptState] = useState<AttemptState>("idle");
  const [lastResult, setLastResult] = useState<{ transcript: string; accuracy: number } | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const turnRef = useRef<ReturnType<typeof webSpeechStt.createTurn> | null>(null);

  useEffect(() => () => turnRef.current?.cancel(), []);

  const attempts = record?.attempts ?? [];
  const best = attempts.length ? Math.max(...attempts.map((a) => a.accuracy)) : null;

  const hear = useCallback(
    (text: string, rate: number) => {
      browserTts.cancelAll();
      browserTts.speak(text, { lang: target.speechTag, voiceId, rate, gender: voiceGender });
    },
    [target.speechTag, voiceId, voiceGender],
  );

  const onFinal = useCallback(
    (transcriptText: string) => {
      const heard = transcriptText.trim();
      const accuracy = similarity(word, heard.split(/\s+/)[0] ?? heard);
      setLastResult({ transcript: heard, accuracy });
      setAttemptState("done");
      recordAttemptFn({
        word,
        language: targetLanguage,
        attempt: { transcript: heard, accuracy, createdAt: Date.now() },
      });
      if (navigator.vibrate) navigator.vibrate(accuracy > 0.75 ? [30] : [15, 40, 15]);
    },
    [recordAttemptFn, targetLanguage, word],
  );

  const onMicError = useCallback((err: SpeechError) => {
    setAttemptState("idle");
    setMicError(
      err.code === "mic-permission"
        ? "Microphone permission denied — allow it and try again."
        : err.code === "empty-speech"
          ? "Didn't hear anything. Tap the mic and say it clearly."
          : err.code === "unsupported-browser"
            ? "Speech recognition isn't available in this browser."
            : "Recording failed — try once more.",
    );
  }, []);

  function toggleRecord() {
    if (attemptState === "listening") {
      turnRef.current?.stop();
      return;
    }
    setMicError(null);
    setLastResult(null);
    setAttemptState("listening");
    turnRef.current = webSpeechStt.createTurn(
      { lang: target.speechTag },
      {
        onFinal: (result) => onFinal(result.text),
        onError: onMicError,
      },
    );
    turnRef.current.start();
  }

  return (
    <div className="min-h-dvh pb-10">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4 sm:px-6">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="rounded-full p-2 text-ink-soft hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold text-ink-soft">Word practice</span>
        {best != null && (
          <Badge tone={best > 0.8 ? "good" : "warn"} className="ml-auto">
            best {Math.round(best * 100)}%
          </Badge>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <div className="glass animate-fade-up rounded-4xl p-6 sm:p-8">
          {/* Word + IPA + listen */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink">{word}</h1>
            <span className="font-mono text-lg text-brand-2">
              {profile?.ipa ?? (loadingProfile ? "…" : "")}
            </span>
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <Button size="sm" variant="secondary" onClick={() => hear(word, 1)}>
                <Volume2 className="size-4" /> Listen
              </Button>
              <Button size="sm" variant="secondary" onClick={() => hear(word, 0.6)}>
                <Gauge className="size-4" /> Slow
              </Button>
            </div>
          </div>

          {/* Syllables + stress */}
          {profile && profile.syllables.length > 0 && (
            <div className="mt-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Syllables &amp; stress
              </span>
              <div className="mt-2 flex flex-wrap items-end gap-1.5">
                {profile.syllables.map((sy, i) => {
                  const stressed = (profile.stressedSyllables ?? []).includes(i);
                  return (
                    <span key={i} className="flex items-end gap-1.5">
                      <span
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-lg font-bold",
                          stressed ? "btn-solid text-white" : "glass text-ink-soft",
                        )}
                      >
                        {sy}
                      </span>
                      {i < profile.syllables.length - 1 && (
                        <span className="pb-1.5 text-ink-faint">·</span>
                      )}
                    </span>
                  );
                })}
                {(profile.stressedSyllables ?? []).length > 0 && (
                  <span className="ml-1 pb-2 text-[11px] text-ink-faint">(highlighted = stressed)</span>
                )}
              </div>
            </div>
          )}

          {/* Meaning + example */}
          {profile && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-edge bg-black/2 p-4 dark:bg-white/3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                  <BookOpen className="size-3.5" /> Meaning
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{profile.meaning}</p>
                {profile.meaningNative && (
                  <p dir="auto" className="mt-1.5 text-xs leading-relaxed text-brand-2">
                    {native.flag} {profile.meaningNative}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-edge bg-black/2 p-4 dark:bg-white/3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                  <Waves className="size-3.5" /> In a sentence
                </span>
                <p className="mt-1.5 text-sm italic leading-relaxed text-ink">
                  “{profile.example}”
                </p>
                <button
                  onClick={() => hear(profile.example, 0.85)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <Volume2 className="size-3" /> hear it
                </button>
              </div>
            </div>
          )}

          {profileError && (
            <div className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
              {profileError}{" "}
              <button onClick={retry} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          {/* Try saying it */}
          <div className="mt-7 border-t border-edge pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Try saying it</h2>
              {attempts.length > 0 && (
                <span className="text-xs text-ink-faint">
                  {attempts.length} attempt{attempts.length === 1 ? "" : "s"} · match estimate
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-5">
              <Button
                size="lg"
                variant={attemptState === "listening" ? "danger" : "primary"}
                onClick={toggleRecord}
                aria-label={
                  attemptState === "listening"
                    ? "Stop recording"
                    : `Record yourself saying ${word}`
                }
              >
                {attemptState === "listening" ? (
                  <>
                    <span className="size-2 animate-pulse rounded-full bg-white" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="size-4" /> {attemptState === "done" ? "Try again" : "Say it"}
                  </>
                )}
              </Button>
            </div>

            {micError && <p className="mt-3 text-center text-sm text-bad">{micError}</p>}

            {lastResult && (
              <div className="mx-auto mt-5 max-w-md animate-fade-up rounded-2xl border border-edge bg-black/2 p-4 text-center dark:bg-white/3">
                <p className="text-xs text-ink-faint">We heard</p>
                <p className="mt-1 text-lg font-bold text-ink">“{lastResult.transcript}”</p>
                <div className="mt-3 flex items-center justify-center gap-2 text-left">
                  <span
                    className={cn(
                      "text-2xl font-extrabold tabular-nums",
                      lastResult.accuracy > 0.85
                        ? "text-good"
                        : lastResult.accuracy > 0.6
                          ? "text-warn"
                          : "text-bad",
                    )}
                  >
                    {Math.round(lastResult.accuracy * 100)}%
                  </span>
                  <span className="text-[10px] leading-tight text-ink-faint">
                    match vs “{word}”
                    <br />
                    (transcript similarity, not a sound measurement)
                  </span>
                </div>
                <div className="mt-2">
                  <ScoreBar score={lastResult.accuracy * 100} />
                </div>
                {lastResult.accuracy <= 0.6 && (
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Slow it down, stress the highlighted syllable, then tap Listen — and try once
                    more.
                  </p>
                )}
              </div>
            )}

            {attempts.length > 1 && (
              <div className="mt-5">
                <span className="text-xs font-semibold text-ink-faint">Attempt history</span>
                <div className="mt-2 flex items-center gap-1.5">
                  {attempts.slice(-12).map((a, i) => (
                    <div
                      key={i}
                      title={`Heard “${a.transcript}”`}
                      className={cn(
                        "h-8 w-2 rounded-full",
                        a.accuracy > 0.85 ? "bg-good" : a.accuracy > 0.6 ? "bg-warn/70" : "bg-bad/60",
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between px-2 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <Repeat className="size-3" /> Word practice uses your mic locally; audio is not saved.
          </span>
        </div>
      </main>
    </div>
  );
}

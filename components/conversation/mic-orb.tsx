"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationPhase } from "@/lib/hooks/use-conversation";
import { Waveform } from "./waveform";

interface MicOrbProps {
  phase: ConversationPhase;
  /** Optional real mic level (0–1). When omitted the waveform animates
   *  synthetically — the mic stream is reserved for speech recognition
   *  (Android treats the microphone as exclusive). */
  level?: number;
  onIdleTap: () => void;
  onListeningTap: () => void;
  disabled?: boolean;
}

/**
 * The main voice control. Large tap target (mobile-first) with pulse rings
 * while listening and a live level-reactive waveform.
 */
export function MicOrb({ phase, level, onIdleTap, onListeningTap, disabled }: MicOrbProps) {
  const listening = phase === "listening";
  const busy = phase === "processing" || phase === "thinking";
  const speaking = phase === "speaking";

  const icon =
    busy ? (
      <Loader2 className="size-8 animate-spin text-ink-soft" />
    ) : listening ? (
      <Square className="size-7 fill-current text-white" />
    ) : (
      <Mic className={cn("size-8", speaking ? "text-white" : "text-ink")} />
    );

  const label =
    listening
      ? "Stop recording"
      : busy
        ? "Working…"
        : speaking
          ? "AI is speaking"
          : "Tap to speak";

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* pulse rings */}
      {listening && (
        <>
          <span className="absolute top-1/2 size-24 -translate-y-[calc(50%+10px)] animate-pulse-ring rounded-full bg-bad/40" />
          <span
            className="absolute top-1/2 size-24 -translate-y-[calc(50%+10px)] animate-pulse-ring rounded-full bg-bad/30"
            style={{ animationDelay: "0.6s" }}
          />
        </>
      )}
      {speaking && (
        <span className="absolute top-1/2 size-24 -translate-y-[calc(50%+10px)] animate-pulse-ring rounded-full bg-brand/30" />
      )}

      <button
        type="button"
        onClick={listening ? onListeningTap : busy ? undefined : onIdleTap}
        disabled={disabled || busy || speaking}
        aria-label={label}
        aria-pressed={listening}
        className={cn(
          "relative flex size-24 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
          listening &&
            "bg-bad",
          busy && "glass",
          speaking && "bg-brand opacity-90",
          phase === "idle" &&
            "bg-brand hover:bg-brand/90",
          phase === "error" && "glass border-2 border-bad/50",
          disabled && "opacity-50",
        )}
        style={
          listening && level != null
            ? { transform: `scale(${1 + Math.min(level, 1) * 0.12})` }
            : undefined
        }
      >
        {icon}
      </button>

      {listening ? (
        <Waveform level={level} active bars={18} className="h-6 w-24" colorClass="bg-bad" />
      ) : (
        <span
          className={cn(
            "text-xs font-semibold tracking-wide",
            busy ? "text-ink-soft" : listening ? "text-bad" : "text-ink-faint",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

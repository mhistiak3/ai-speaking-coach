"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Gauge,
  Keyboard,
  Mic,
  MessageSquare,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MicOrb } from "@/components/conversation/mic-orb";
import { MessageBubble } from "@/components/conversation/message-bubble";
import { FeedbackCard } from "@/components/conversation/feedback-card";
import { SummaryModal } from "@/components/conversation/summary-modal";
import { useConversation } from "@/lib/hooks/use-conversation";
import { useMicLevel } from "@/lib/hooks/use-mic-level";
import { useNow } from "@/lib/hooks/use-now";
import { useSettingsStore } from "@/lib/store/settings-store";
import { resolveScenario } from "@/lib/scenarios";
import { getLanguage } from "@/lib/languages";
import type { ConversationSession, TurnAnalysis } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

interface ConversationViewProps {
  session: ConversationSession;
}

/**
 * The immersive practice screen. Transcript scrolls, coaching appears
 * progressively (side panel on desktop, on-demand sheet on mobile) so the
 * conversation itself stays the focus.
 */
export function ConversationView({ session }: ConversationViewProps) {
  const router = useRouter();
  const scenario = useMemo(
    () => resolveScenario(session.scenarioId, session.customTopic),
    [session.scenarioId, session.customTopic],
  );
  const target = getLanguage(session.targetLanguage);

  const convo = useConversation(session.id);
  const { phase, interim, error } = convo;
  const { level, start: startLevel, stop: stopLevel } = useMicLevel();

  const muted = useSettingsStore((s) => s.muted);
  const playbackRate = useSettingsStore((s) => s.playbackRate);
  const updateSettings = useSettingsStore((s) => s.update);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSeen, setFeedbackSeen] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(() => session.endedAt != null);
  const [typed, setTyped] = useState("");
  const [typeMode, setTypeMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, analyses } = session;
  const ended = session.endedAt != null;

  // session timer — pure render, ticking clock from useNow
  const now = useNow(ended ? 3_600_000 : 1000);
  const seconds = Math.max(0, Math.round(((session.endedAt ?? now) - session.createdAt) / 1000));

  // auto-scroll transcript on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, interim, phase]);

  // meter mic level only while listening (keeps AudioContext idle otherwise)
  useEffect(() => {
    if (phase === "listening") void startLevel();
    else stopLevel();
  }, [phase, startLevel, stopLevel]);

  useEffect(() => () => stopLevel(), [stopLevel]);

  // keyboard: Space = push to talk (only when not focused on a control)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON")) return;
      e.preventDefault();
      if (phase === "idle") convo.startListening();
      else if (phase === "listening") convo.stopListening();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, convo]);

  const endSession = useCallback(() => {
    setEndDialog(false);
    convo.endSession();
    if (messages.length === 0) {
      router.push("/practice");
      return;
    }
    setSummaryOpen(true);
  }, [convo, messages.length, router]);

  const sendText = useCallback(() => {
    if (!typed.trim()) return;
    setTypeMode(false);
    convo.sendTyped(typed);
    setTyped("");
  }, [convo, typed]);

  const statusLabel = ended
    ? "Session ended"
    : phase === "listening"
      ? "Listening…"
      : phase === "processing"
        ? "Processing…"
        : phase === "thinking"
          ? "AI is thinking…"
          : phase === "speaking"
            ? "AI is speaking…"
            : phase === "error"
              ? "Try again"
              : messages.length === 0
                ? "Ready when you are"
                : "Tap the mic and speak";

  const hasUnseenFeedback = analyses.length > 0 && !feedbackSeen;

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={() => router.push("/practice")}
          aria-label="Back to practice list"
          className="rounded-full p-2 text-ink-soft transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-ink sm:text-base">
            {scenario.emoji} {scenario.title}
          </h1>
          <p className="truncate text-[11px] text-ink-faint">
            {target.flag} {target.name} · {session.level} · AI plays {scenario.aiRole}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone={ended ? "neutral" : "good"} className="tabular-nums">
            {formatDuration(seconds)}
          </Badge>
          <Button size="sm" variant="danger" onClick={() => setEndDialog(true)} disabled={ended}>
            <PhoneOff className="size-4" />
            <span className="hidden sm:inline">End</span>
          </Button>
        </div>
      </header>

      {/* ── Transcript + desktop feedback rail ─────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <main
          ref={scrollRef}
          className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 pb-6 sm:px-6"
          aria-live="polite"
          aria-label="Conversation transcript"
        >
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              active={phase === "speaking" && i === messages.length - 1 && m.role === "assistant"}
              onSpeak={(text) => void convo.speakReply(text)}
            />
          ))}

          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-lg border border-dashed border-edge-strong px-4 py-2.5 text-right text-[15px] italic text-ink-faint sm:max-w-[70%]">
                {interim}
              </div>
            </div>
          )}

          {error && (
            <div className="mx-auto max-w-md animate-fade-up rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
              <p className="font-semibold">{error.message}</p>
              <div className="mt-2 flex gap-2">
                {error.retryable && (
                  <Button size="sm" onClick={convo.retryLast}>
                    Retry
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => router.push("/settings")}>
                  Check settings
                </Button>
              </div>
            </div>
          )}

          {messages.length === 0 && !ended && (
            <WelcomeHero
              scenarioEmoji={scenario.emoji}
              scenarioTitle={scenario.title}
              targetName={target.name}
              onStart={() => convo.deliverGreeting()}
            />
          )}

          {messages.length > 0 && phase === "idle" && analyses.length > 0 && !feedbackSeen && (
            <button
              onClick={() => {
                setFeedbackOpen(true);
                setFeedbackSeen(true);
              }}
              className="mx-auto flex animate-fade-up items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-xs font-semibold text-brand xl:hidden"
            >
              <Sparkles className="size-3.5" />
              Coach feedback is ready — view
            </button>
          )}
        </main>

        {/* desktop side feedback panel */}
        <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-edge px-4 py-3 xl:flex" aria-label="Coach feedback">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <span className="text-sm font-bold text-ink">Coach feedback</span>
            <Badge tone="neutral" className="ml-auto">
              {analyses.length}
            </Badge>
          </div>
          {analyses.length === 0 ? (
            <p className="text-xs leading-relaxed text-ink-faint">
              Pronunciation notes and gentle corrections appear here after each reply — coaching
              never interrupts your conversation.
            </p>
          ) : (
            [...analyses].reverse().map((a) => <FeedbackForRow key={a.id} analysis={a} session={session} />)
          )}
        </aside>
      </div>

      {/* ── Controls ───────────────────────────────────────────────── */}
      <footer className="border-t border-edge bg-[var(--surface)] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
          <div className="flex w-full items-center justify-between">
            <span
              role="status"
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                phase === "listening" && "bg-bad/10 text-bad",
                phase === "processing" && "bg-brand-2/10 text-brand-2",
                phase === "thinking" && "bg-warn/10 text-warn",
                phase === "speaking" && "bg-brand/10 text-brand",
                (phase === "idle" || phase === "error") && "text-ink-faint",
              )}
            >
              {(phase === "thinking" || phase === "processing") && <Zap className="size-3 animate-pulse" />}
              {statusLabel}
            </span>

            <div className="flex items-center gap-1">
              {analyses.length > 0 && (
                <button
                  onClick={() => {
                    setFeedbackOpen(true);
                    setFeedbackSeen(true);
                  }}
                  className="relative rounded-full p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10 xl:hidden"
                  aria-label={`Coach feedback, ${analyses.length} turns analysed`}
                >
                  <Sparkles className="size-5" />
                  {hasUnseenFeedback && (
                    <span className="absolute right-1 top-1 size-2 animate-pulse rounded-full bg-brand" />
                  )}
                </button>
              )}
              <button
                onClick={() => setTypeMode((v) => !v)}
                className={cn(
                  "rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
                  typeMode ? "text-brand" : "text-ink-soft",
                )}
                aria-label={typeMode ? "Hide text input" : "Type instead of speaking"}
              >
                <Keyboard className="size-5" />
              </button>
              <button
                onClick={() => updateSettings({ muted: !muted })}
                className={cn(
                  "rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
                  muted ? "text-bad" : "text-ink-soft",
                )}
                aria-label={muted ? "Unmute AI voice" : "Mute AI voice"}
                aria-pressed={muted}
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <button
                onClick={() => updateSettings({ playbackRate: playbackRate === 1 ? 0.75 : 1 })}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors",
                  playbackRate !== 1
                    ? "bg-brand/15 text-brand"
                    : "text-ink-soft hover:bg-black/5 dark:hover:bg-white/10",
                )}
                aria-label="Toggle slower playback"
                title="Slower speech (0.75×)"
              >
                <Gauge className="size-3.5" />
                {playbackRate === 1 ? "1×" : "0.75×"}
              </button>
            </div>
          </div>

          {typeMode ? (
            <form
              className="flex w-full max-w-xl gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendText();
              }}
            >
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={`Type what you would say in ${target.name}…`}
                aria-label="Message to AI partner"
                className="h-12 flex-1 rounded-2xl border border-edge bg-transparent px-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
              />
              <Button type="submit" aria-label="Send message" className="h-12 px-4">
                <Send className="size-4" />
              </Button>
            </form>
          ) : (
            <MicOrb
              phase={phase}
              level={level}
              disabled={ended}
              onIdleTap={convo.startListening}
              onListeningTap={convo.stopListening}
            />
          )}
        </div>
      </footer>

      {/* ── Mobile feedback sheet ──────────────────────────────────── */}
      <Dialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" /> Coach feedback
          </span>
        }
        size="md"
      >
        <div className="flex flex-col gap-4">
          {analyses.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing yet — feedback appears after each of your replies.
            </p>
          ) : (
            [...analyses].reverse().map((a) => <FeedbackForRow key={a.id} analysis={a} session={session} />)
          )}
        </div>
      </Dialog>

      {/* ── End session confirm ────────────────────────────────────── */}
      <Dialog open={endDialog} onClose={() => setEndDialog(false)} title="End this conversation?">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            {session.stats.turns > 0
              ? `You spoke about ${session.stats.wordsSpoken} words across ${session.stats.turns} turns. We'll build your summary.`
              : "You haven't spoken yet — no pressure. Your next conversation is one tap away."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEndDialog(false)}>
              Keep talking
            </Button>
            <Button variant="danger" onClick={endSession}>
              End &amp; see summary
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Summary ────────────────────────────────────────────────── */}
      <SummaryModal session={session} open={ended && summaryOpen} onClose={() => router.push("/practice")} />
    </div>
  );
}

function FeedbackForRow({
  analysis,
  session,
}: {
  analysis: TurnAnalysis;
  session: ConversationSession;
}) {
  const userMessage = session.messages.find((m) => m.id === analysis.messageId);
  return <FeedbackCard analysis={analysis} userText={userMessage?.text ?? ""} />;
}

function WelcomeHero({
  scenarioEmoji,
  scenarioTitle,
  targetName,
  onStart,
}: {
  scenarioEmoji: string;
  scenarioTitle: string;
  targetName: string;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center">
      <div className="animate-float text-6xl" aria-hidden>
        {scenarioEmoji}
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">{scenarioTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Your AI partner will start talking {targetName}. Speak naturally — they&apos;ll ask,
          you&apos;ll answer, and coaching happens quietly in the background.
        </p>
      </div>
      <Button size="lg" onClick={onStart}>
        <Mic className="size-4" />
        Start — let the AI speak first
      </Button>
      <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
        <MessageSquare className="size-3" />
        Tip: press Space anytime to talk
      </p>
    </div>
  );
}

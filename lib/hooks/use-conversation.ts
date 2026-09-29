"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSettingsStore } from "@/lib/store/settings-store";
import { useSessionsStore } from "@/lib/store/session-store";
import { useWordPracticeStore } from "@/lib/store/word-practice-store";
import { webSpeechStt } from "@/lib/speech/stt-web-speech";
import { browserTts } from "@/lib/speech/tts-browser";
import type { FinalTranscript, SpeechError, SpeechTurn } from "@/lib/speech/types";
import { getLanguage } from "@/lib/languages";
import type { ConversationSession, ChatMessage, TurnAnalysis } from "@/lib/types";
import { PAUSE_TOLERANCE_MS } from "@/lib/types";

/** Client-side ceiling so a dropped mobile network can never hang a turn. */
function fetchSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}
import type { AnalysisOutput } from "@/lib/validation/schemas";
import { countFillers, countRepeats, uid, wordCount } from "@/lib/utils";

export type ConversationPhase =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "error";

export interface ConversationError {
  message: string;
  retryable: boolean;
  /** Text that failed to get an AI reply — enables one-tap retry. */
  failedUserText?: string;
}

interface ApiError {
  message?: string;
  retryable?: boolean;
}

function toUserMessage(transcript: FinalTranscript, text: string): ChatMessage {
  return {
    id: uid("m"),
    role: "user",
    text,
    createdAt: Date.now(),
    speechMs: transcript.endedAt - transcript.startedAt,
    wordCount: wordCount(text),
  };
}

function toTypedMessage(text: string): ChatMessage {
  return {
    id: uid("m"),
    role: "user",
    text,
    createdAt: Date.now(),
    speechMs: 0,
    wordCount: wordCount(text),
  };
}

/**
 * The conversation orchestrator. One state machine for the whole practice
 * screen:
 *
 *   idle → listening (mic) → processing (transcript) → thinking (AI)
 *        → speaking (TTS) → idle
 *
 * Analysis of each user turn runs server-side IN PARALLEL with the reply
 * + voice, so feedback appears progressively without ever blocking the
 * conversation.
 */
export function useConversation(sessionId: string) {
  const session = useSessionsStore((s) => s.sessions.find((x) => x.id === sessionId));
  const addMessage = useSessionsStore((s) => s.addMessage);
  const addAnalysis = useSessionsStore((s) => s.addAnalysis);
  const markEnded = useSessionsStore((s) => s.markEnded);
  const settings = useSettingsStore();

  const [phase, setPhase] = useState<ConversationPhase>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<ConversationError | null>(null);
  const [lastSpeakText, setLastSpeakText] = useState<string | null>(null);

  const turnRef = useRef<SpeechTurn | null>(null);
  const speakHandleRef = useRef<{ cancel: () => void } | null>(null);
  const phaseRef = useRef<ConversationPhase>("idle");
  const greetingRef = useRef(false);
  const autoTurnRef = useRef(false);
  const [autoListenTick, setAutoListenTick] = useState(0);
  const lastUserTextRef = useRef<string>("");
  const lastAssistantRef = useRef<string>("");
  const turnStartedAtRef = useRef<number>(0);
  const pendingAnalysisRef = useRef<Map<string, AnalysisOutput>>(new Map());

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Hard safety net ───────────────────────────────────────────────────
  // No phase may stay "active" beyond this: if the mic engine, TTS engine,
  // or network wedges (mobile Chrome failure modes), force-reset so the
  // conversation can never deadlock.
  useEffect(() => {
    if (phase !== "listening" && phase !== "processing" && phase !== "thinking" && phase !== "speaking") {
      return;
    }
    const hardCeiling = setTimeout(() => {
      turnRef.current?.cancel();
      speakHandleRef.current?.cancel();
      setError({
        message: "That turn got stuck, so it was reset. Tap the mic to continue.",
        retryable: true,
      });
      setPhase("error");
    }, 180_000);
    return () => clearTimeout(hardCeiling);
  }, [phase]);

  const target = getLanguage(session?.targetLanguage ?? "en");

  // ── Analysis merge ────────────────────────────────────────────────────

  const mergeAnalysis = useCallback(
    (userMessage: ChatMessage, output: AnalysisOutput) => {
      const s = useSessionsStore.getState().sessions.find((x) => x.id === sessionId);
      if (!s || s.analyses.some((a) => a.messageId === userMessage.id)) return;
      const minutes = Math.max(userMessage.speechMs ?? 0, 1) / 60000;
      const analysis: TurnAnalysis = {
        id: uid("a"),
        turnIndex: s.messages.filter((m) => m.role === "user").length,
        messageId: userMessage.id,
        pronunciation: {
          value: output.pronunciationScore,
          // The browser STT does not measure phonemes, so every pronunciation
          // number in the MVP is an AI estimate unless a dedicated provider
          // supplies one later.
          estimated: true,
        },
        grammar: { value: output.grammarScore, estimated: true },
        vocabulary: { value: output.vocabularyScore, estimated: true },
        fluency: {
          wordsPerMinute: userMessage.wordCount ? Math.round(userMessage.wordCount / minutes) : null,
          fillerCount: countFillers(userMessage.text),
          repeatCount: countRepeats(userMessage.text),
          pauseCount: 0,
          longPauses: 0,
          estimated: true,
        },
        words: output.wordsToPractice,
        correction: output.correction,
        encouragement: output.encouragement,
        createdAt: Date.now(),
      };
      addAnalysis(sessionId, analysis);
      if (output.wordsToPractice.length) {
        useWordPracticeStore
          .getState()
          .noteSeenInSession(output.wordsToPractice.map((w) => w.word), session?.targetLanguage ?? "en");
      }
    },
    [addAnalysis, sessionId, session?.targetLanguage],
  );

  const consumeAnalysis = useCallback(
    (userMessage: ChatMessage) => {
      const pending = pendingAnalysisRef.current.get(userMessage.id);
      if (pending) {
        pendingAnalysisRef.current.delete(userMessage.id);
        mergeAnalysis(userMessage, pending);
      }
    },
    [mergeAnalysis],
  );

  // ── Voice ─────────────────────────────────────────────────────────────

  const speakReply = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const handsFreeSignal = () => setAutoListenTick((t) => t + 1);
        let settled = false;
        let watchdog: ReturnType<typeof setTimeout> | null = null;
        const settle = () => {
          if (settled) return;
          settled = true;
          if (watchdog) clearTimeout(watchdog);
          speakHandleRef.current = null;
          setPhase("idle");
          handsFreeSignal();
          resolve();
        };

        if (settings.muted || !settings.autoPlayVoice || !browserTts.isAvailable()) {
          setPhase("idle");
          handsFreeSignal();
          resolve();
          return;
        }
        setPhase("speaking");
        speakHandleRef.current?.cancel();

        // Safety net: mobile speech engines sometimes die silently (no end,
        // no error) after the screen locks or minutes into a session.
        // Estimate the playback duration and force-recover well past it —
        // otherwise the session deadlocks in "speaking" forever.
        const rate = settings.playbackRate || 1;
        const estimatedMs = (text.length / 13) * 1000 * (1 / rate);
        watchdog = setTimeout(() => {
          speakHandleRef.current?.cancel();
          settle();
        }, Math.min(Math.max(estimatedMs + 7000, 12000), 70000));

        speakHandleRef.current = browserTts.speak(
          text,
          {
            lang: target.speechTag,
            voiceId: settings.voiceId,
            rate,
            gender: settings.voiceGender,
          },
          {
            onEnd: settle,
            onError: settle,
          },
        );
      }),
    [settings.autoPlayVoice, settings.muted, settings.playbackRate, settings.voiceGender, settings.voiceId, target.speechTag],
  );

  // ── API calls ─────────────────────────────────────────────────────────

  const runAnalysis = useCallback(
    async (userMessage: ChatMessage, assistantText: string, transcript: FinalTranscript | null) => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: fetchSignal(60000),
          body: JSON.stringify({
            userText: userMessage.text,
            assistantText,
            nativeLanguage: session?.nativeLanguage ?? "bn",
            targetLanguage: session?.targetLanguage ?? "en",
            level: session?.level ?? "intermediate",
            correctionFrequency: settings.correctionFrequency,
            pronunciationFeedback: settings.pronunciationFeedback,
            wordHints: transcript
              ? transcript.words.map((w) => ({ word: w.word, confidence: w.confidence }))
              : [],
          }),
        });
        if (!res.ok) return; // feedback is best-effort; never block conversation
        const data = (await res.json()) as { analysis?: AnalysisOutput };
        if (!data.analysis) return;
        // Deliver as soon as the user message exists in the store.
        const inStore = useSessionsStore
          .getState()
          .sessions.find((x) => x.id === sessionId)
          ?.messages.some((m) => m.id === userMessage.id);
        if (inStore) mergeAnalysis(userMessage, data.analysis);
        else pendingAnalysisRef.current.set(userMessage.id, data.analysis);
      } catch {
        /* analysis failure is silent — the chat must keep flowing */
      }
    },
    [mergeAnalysis, sessionId, session, settings.correctionFrequency, settings.pronunciationFeedback],
  );

  const requestReply = useCallback(
    async (userMessage: ChatMessage, transcript: FinalTranscript | null) => {
      setPhase("thinking");
      setError(null);
      const history = (
        useSessionsStore.getState().sessions.find((x) => x.id === sessionId)?.messages ?? []
      )
        .filter((m) => !m.errored)
        .slice(0, -1) // everything before this user message
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.text }));

      try {
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // AI replies can be slow; 45s ceiling prevents a hung turn.
          signal: fetchSignal(45000),
          body: JSON.stringify({
            sessionId,
            nativeLanguage: session?.nativeLanguage ?? "bn",
            targetLanguage: session?.targetLanguage ?? "en",
            level: session?.level ?? "intermediate",
            scenarioId: session?.scenarioId ?? "random",
            customTopic: session?.customTopic ?? null,
            messages: history,
          }),
        });
        const data = (await res.json()) as { reply?: string; error?: ApiError };
        if (!res.ok || !data.reply) {
          throw Object.assign(
            new Error(data.error?.message ?? "The AI partner could not respond."),
            { retryable: data.error?.retryable ?? true },
          );
        }

        const assistantMessage: ChatMessage = {
          id: uid("m"),
          role: "assistant",
          text: data.reply,
          createdAt: Date.now(),
        };
        addMessage(sessionId, assistantMessage);
        lastAssistantRef.current = data.reply;
        setLastSpeakText(data.reply);

        // Kick off analysis in parallel with voice playback.
        void runAnalysis(userMessage, data.reply, transcript);

        await speakReply(data.reply);
      } catch (err) {
        const name = (err as { name?: string })?.name;
        const message =
          name === "TimeoutError"
            ? "The AI took too long to answer. Tap retry."
            : err instanceof Error && err.message && !/signal/i.test(err.message)
              ? err.message
              : "Could not reach the AI.";
        const retryable = (err as { retryable?: boolean }).retryable ?? true;
        setError({ message, retryable, failedUserText: userMessage.text });
        setPhase("error");
        // Still analyze the utterance — pronunciation help is independent
        // of the chat reply succeeding.
        void runAnalysis(userMessage, lastAssistantRef.current, transcript);
      }
    },
    [addMessage, runAnalysis, sessionId, session, speakReply],
  );

  const stopSpeaking = useCallback(() => {
    speakHandleRef.current?.cancel();
    speakHandleRef.current = null;
    setPhase((p) => (p === "speaking" ? "idle" : p));
  }, []);

  const replayLast = useCallback(() => {
    if (lastSpeakText) void speakReply(lastSpeakText);
  }, [lastSpeakText, speakReply]);

  // ── Mic ───────────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    turnRef.current?.stop();
  }, []);

  const handleFinalTranscript = useCallback(
    (transcript: FinalTranscript) => {
      autoTurnRef.current = false;
      const text = transcript.text.trim();
      if (!text) {
        setError({ message: "No speech detected. Tap the mic and try again.", retryable: true });
        setPhase("error");
        return;
      }
      setInterim("");
      setPhase("processing");
      const userMessage = toUserMessage(transcript, text);
      lastUserTextRef.current = text;
      addMessage(sessionId, userMessage);
      consumeAnalysis(userMessage);
      void requestReply(userMessage, transcript);
    },
    [addMessage, consumeAnalysis, requestReply, sessionId],
  );

  const startListening = useCallback((opts?: { auto?: boolean }) => {
    if (turnRef.current?.active) return;
    if (phaseRef.current === "speaking") stopSpeaking();
    setError(null);
    setInterim("");
    autoTurnRef.current = opts?.auto === true;
    if (!webSpeechStt.isAvailable()) {
      setError({
        message: "This browser can't do speech recognition. Try Chrome, Edge, or Safari.",
        retryable: false,
      });
      setPhase("error");
      return;
    }
    setPhase("listening");
    turnStartedAtRef.current = Date.now();
    turnRef.current = webSpeechStt.createTurn(
      {
        lang: target.speechTag,
        // Silence grace before ending the turn — Settings → Coaching.
        // Fallback guards against stale persisted-settings / old chunks
        // where the key may be missing.
        silenceStopMs:
          PAUSE_TOLERANCE_MS?.[settings.pauseTolerance ?? "long"] ??
          PAUSE_TOLERANCE_MS?.long ??
          2800,
        // Hands-free auto-opened mic: if nothing is said for 5s, close it.
        noSpeechTimeoutMs: opts?.auto ? 5000 : 8000,
      },
      {
        onInterim: (text) => setInterim(text),
        onFinal: handleFinalTranscript,
        onError: (err: SpeechError) => {
          setInterim("");
          // A hands-free window that caught no speech just quietly closes
          // the mic — no scary error, the orb is ready for the next tap.
          if (autoTurnRef.current && err.code === "empty-speech") {
            autoTurnRef.current = false;
            setPhase((p) => (p === "listening" ? "idle" : p));
            return;
          }
          const friendly: Record<string, string> = {
            "mic-permission": "Microphone access was blocked. Allow it in your browser settings and try again.",
            "no-microphone": "No microphone found. Plug one in or check your device settings.",
            "empty-speech": "Didn't catch any speech. Speak up — if this keeps happening, close other apps using the mic (camera, voice recorders).",
            network: "The speech service had a network hiccup. Try again.",
            "transcription-failed": "Couldn't transcribe that. Try again?",
            "unsupported-browser": "This browser can't do speech recognition.",
          };
          setError({
            message: friendly[err.code] ?? "Recording failed. Try again.",
            retryable: err.retryable,
          });
          setPhase((p) => (p === "listening" || p === "processing" ? "error" : p));
        },
        onEnd: () => {
          turnRef.current = null;
        },
      },
    );
    turnRef.current.start();
  }, [handleFinalTranscript, settings.pauseTolerance, stopSpeaking, target.speechTag]);

  const cancelListening = useCallback(() => {
    turnRef.current?.cancel();
    turnRef.current = null;
    autoTurnRef.current = false;
    setInterim("");
    setPhase("idle");
  }, []);

  // ── Hands-free: open the mic automatically once the AI has finished speaking.
  // If the learner says nothing for 5s, the recognizer's no-speech watchdog
  // quietly closes the mic again (see startListening).
  useEffect(() => {
    if (autoListenTick === 0) return;
    if (!useSettingsStore.getState().handsFree) return;
    const t = setTimeout(() => {
      const s = useSessionsStore.getState().sessions.find((x) => x.id === sessionId);
      if (s?.endedAt) return;
      if (phaseRef.current === "idle") startListening({ auto: true });
    }, 450);
    return () => clearTimeout(t);
  }, [autoListenTick, sessionId, startListening]);

  /** Keyboard fallback: submit typed text as a spoken turn. */
  const sendTyped = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phaseRef.current === "thinking" || phaseRef.current === "processing") return;
      setError(null);
      const userMessage = toTypedMessage(trimmed);
      lastUserTextRef.current = trimmed;
      addMessage(sessionId, userMessage);
      void requestReply(userMessage, null);
    },
    [addMessage, requestReply, sessionId],
  );

  const retryLast = useCallback(() => {
    const text = error?.failedUserText ?? lastUserTextRef.current;
    if (!text) {
      setPhase("idle");
      setError(null);
      return;
    }
    const userMessage: ChatMessage = {
      id: uid("m"),
      role: "user",
      text,
      createdAt: Date.now(),
      speechMs: 0,
      wordCount: wordCount(text),
      errored: false,
    };
    setError(null);
    void requestReply(userMessage, null);
  }, [error?.failedUserText, requestReply]);

  // First assistant line is generated BY the AI in the practice language
  // (the static scenario prompt is English-only and serves as offline
  // fallback). Must still be triggered from a user gesture for iOS TTS.
  const deliverGreeting = useCallback(async () => {
    if (!session || session.messages.length > 0 || greetingRef.current) return;
    greetingRef.current = true;
    setPhase("thinking");
    setError(null);

    let text = session.greeting;
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: fetchSignal(45000),
        body: JSON.stringify({
          sessionId,
          nativeLanguage: session.nativeLanguage,
          targetLanguage: session.targetLanguage,
          level: session.level,
          scenarioId: session.scenarioId,
          customTopic: session.customTopic,
          opening: true,
          messages: [],
        }),
      });
      const data = (await res.json()) as { reply?: string };
      if (data.reply?.trim()) text = data.reply.trim();
    } catch {
      /* offline / AI not configured → static fallback line */
    }

    const greeting: ChatMessage = {
      id: uid("m"),
      role: "assistant",
      text,
      createdAt: Date.now(),
    };
    addMessage(sessionId, greeting);
    lastAssistantRef.current = text;
    setLastSpeakText(text);
    await speakReply(text);
  }, [addMessage, session, sessionId, speakReply]);

  const endSession = useCallback(() => {
    turnRef.current?.cancel();
    speakHandleRef.current?.cancel();
    markEnded(sessionId);
    const finished = useSessionsStore.getState().sessions.find((x) => x.id === sessionId);
    return { durationMs: (finished?.endedAt ?? Date.now()) - (finished?.createdAt ?? Date.now()) };
  }, [markEnded, sessionId]);

  return {
    session: session as ConversationSession | undefined,
    phase,
    interim,
    error,
    lastSpeakText,
    startListening,
    stopListening,
    cancelListening,
    sendTyped,
    speakReply,
    replayLast,
    stopSpeaking,
    retryLast,
    deliverGreeting,
    endSession,
    sttAvailable: webSpeechStt.isAvailable(),
    ttsAvailable: browserTts.isAvailable(),
  };
}

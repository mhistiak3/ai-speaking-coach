import {
  speechError,
  type FinalTranscript,
  type RecognizerCallbacks,
  type SpeechToTextProvider,
  type SpeechTurn,
  type StartOptions,
  type TranscriptWord,
} from "./types";

/**
 * Free in-browser speech-to-text via the Web Speech API (Chrome/Edge/Safari).
 *
 * Honesty notes baked into the app:
 *  - The browser transcribes speech but only exposes an *utterance-level*
 *    confidence in some engines; per-word confidence is usually 0. We mark
 *    transcripts as `hasRealConfidence: false` so the UI never presents
 *    these as pronunciation measurements.
 *  - Audio may be processed by the browser vendor's speech service
 *    (e.g. Google on Chrome). We surface this in Settings → Privacy.
 *  - NEVER open a second getUserMedia stream while this is running —
 *    Android treats the mic as exclusive (see AGENT.md).
 */

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

class WebSpeechTurn implements SpeechTurn {
  private recognition: SpeechRecognition | null = null;
  private startedAt = 0;
  private finalWords: TranscriptWord[] = [];
  private finalText = "";
  private committed = "";
  private sessionFinal = "";
  private lastResultsLen = 0;
  private utteranceConfidence: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHeardAt = 0;
  private finished = false;
  active = false;

  constructor(
    private options: StartOptions,
    private callbacks: RecognizerCallbacks,
  ) {}

  start(): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.fail(speechError("unsupported-browser", "This browser can't do speech recognition."));
      return;
    }

    this.startedAt = Date.now();
    this.lastHeardAt = this.startedAt;
    this.active = true;

    const rec = new Ctor();
    this.recognition = rec;
    rec.lang = this.options.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.armNoSpeechTimer();
    };

    /**
     * IDEMPOTENT reconstruction. Some engines (notably Android Chrome)
     * re-deliver already-final segments inside later events and can restart
     * the results list mid-session. Appending new chunks therefore produces
     * duplicated text ("5 words → 100 words"). Instead, every event rebuilds
     * the transcript from the ENTIRE `results` list — re-delivery becomes a
     * harmless no-op — with a `committed` prefix to survive engine resets.
     */
    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result?.[0];
        if (!alt) continue;
        const chunk = alt.transcript.trim();
        if (result.isFinal) {
          if (chunk) finals += (finals ? " " : "") + chunk;
        } else {
          interim += alt.transcript;
        }
        if (alt.confidence > 0 && alt.confidence < 1) {
          this.utteranceConfidence = Math.max(this.utteranceConfidence ?? 0, alt.confidence);
        }
      }

      // Engine reset: the result list shrank → freeze the previous finals.
      if (event.results.length < this.lastResultsLen) {
        this.committed = [this.committed, this.sessionFinal].filter(Boolean).join(" ");
      }
      this.lastResultsLen = event.results.length;
      this.sessionFinal = finals;
      this.finalText = [this.committed, finals].filter(Boolean).join(" ");
      this.finalWords = this.finalText
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({ word, confidence: null }));

      this.lastHeardAt = Date.now();
      this.armSilenceTimer();
      this.armNoSpeechTimer();

      // Show committed + final + in-flight speech together in the bubble.
      const display = [this.finalText, interim.trim()].filter(Boolean).join(" ");
      if (display) this.callbacks.onInterim?.(display);
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.fail(speechError("mic-permission", "Microphone permission was denied."));
      } else if (event.error === "audio-capture") {
        this.fail(speechError("no-microphone", "No microphone was found."));
      } else if (event.error === "no-speech") {
        this.fail(speechError("empty-speech", "Didn't catch any speech.", true));
      } else if (event.error === "language-not-supported") {
        this.fail(
          speechError(
            "transcription-failed",
            `Speech recognition doesn't support ${this.options.lang} on this device.`,
            false,
          ),
        );
      } else if (event.error === "network") {
        this.fail(speechError("network", "Speech service network error.", true));
      } else {
        this.fail(speechError("transcription-failed", `Speech recognition failed (${event.error}).`, true));
      }
    };

    rec.onend = () => {
      if (this.finished) return;
      // Natural or requested end of utterance — deliver the turn once.
      if (this.finalWords.length > 0) {
        this.finish(this.buildResult());
      } else {
        this.fail(speechError("empty-speech", "No speech detected. Try again.", true));
      }
    };

    try {
      rec.start();
    } catch {
      this.fail(speechError("transcription-failed", "Could not start recording.", true));
    }
  }

  stop(): void {
    if (!this.active) return;
    this.clearTimers();
    try {
      this.recognition?.stop();
    } catch {
      /* already stopped */
    }
  }

  cancel(): void {
    this.clearTimers();
    this.finished = true;
    this.active = false;
    try {
      this.recognition?.abort();
    } catch {
      /* noop */
    }
    this.callbacks.onEnd?.();
  }

  private armSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    const ms = this.options.silenceStopMs ?? 2200;
    this.silenceTimer = setTimeout(() => {
      if (Date.now() - this.lastHeardAt >= ms * 0.9) this.stop();
    }, ms);
  }

  private armNoSpeechTimer(): void {
    if (this.noSpeechTimer) clearTimeout(this.noSpeechTimer);
    const ms = this.options.noSpeechTimeoutMs ?? 8000;
    this.noSpeechTimer = setTimeout(() => {
      if (!this.finalWords.length) {
        this.fail(speechError("empty-speech", "Didn't hear anything — tap the mic and speak up.", true));
      }
    }, ms);
  }

  private buildResult(): FinalTranscript {
    return {
      text: this.finalText,
      words: this.finalWords,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      utteranceConfidence: this.utteranceConfidence,
      hasRealConfidence: this.utteranceConfidence != null,
    };
  }

  private finish(result: FinalTranscript): void {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    this.clearTimers();
    this.callbacks.onFinal?.(result);
    this.callbacks.onEnd?.();
  }

  private fail(err: ReturnType<typeof speechError>): void {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    this.clearTimers();
    try {
      this.recognition?.abort();
    } catch {
      /* noop */
    }
    this.callbacks.onError?.(err);
    this.callbacks.onEnd?.();
  }

  private clearTimers(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.noSpeechTimer) clearTimeout(this.noSpeechTimer);
    this.silenceTimer = null;
    this.noSpeechTimer = null;
  }
}

export const webSpeechStt: SpeechToTextProvider = {
  id: "web-speech",
  name: "Browser speech recognition (free)",
  measuresAudio: false,
  isAvailable: () => getRecognitionCtor() != null,
  createTurn(options, callbacks) {
    return new WebSpeechTurn(options, callbacks);
  },
};

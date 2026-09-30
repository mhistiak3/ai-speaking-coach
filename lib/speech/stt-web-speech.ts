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
 * Android Chrome quirk this implementation works around: the engine ENDS the
 * recognition session (fires onend) after only ~1–3s of silence — long
 * before our configured `silenceStopMs` elapses. Naively delivering on that
 * event makes the pause-tolerance setting feel identical at every value.
 * Solution: SESSION STITCHING — on a natural end we transparently restart
 * recognition and keep accumulating, so only OUR silence watchdog (or the
 * user's tap) ends the turn.
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

/** Safety valve: ~15 stitched sessions ≈ up to a minute of extra pauses. */
const MAX_STITCHES = 15;
const STITCH_DELAY_MS = 150;

/** Common words can legitimately arrive as a one-word final — never noise. */
const COMMON_WORDS = new Set([
  "a", "i", "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is",
  "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we",
  "am", "the", "and", "not", "but", "for", "yes", "you", "that", "this",
  "are", "was", "were", "has", "had", "her", "him", "his", "our", "out",
]);

class WebSpeechTurn implements SpeechTurn {
  private recognition: SpeechRecognition | null = null;
  private startedAt = 0;
  private finalWords: TranscriptWord[] = [];
  private finalText = "";
  private committed = "";
  private utteranceConfidence: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
  private turnCeilingTimer: ReturnType<typeof setTimeout> | null = null;
  private stopFallback: ReturnType<typeof setTimeout> | null = null;
  private stitchTimer: ReturnType<typeof setTimeout> | null = null;
  private stitches = 0;
  private intentionalStop = false;
  /** Single-word finals that repeat across sessions are engine noise. */
  private singletonFinalCount = new Map<string, number>();
  private noiseTokens = new Set<string>();
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

    // Hard ceiling: total turn lifetime even with stitching.
    this.turnCeilingTimer = setTimeout(() => {
      if (this.finished) return;
      if (this.finalWords.length > 0) this.finish(this.buildResult());
      else this.fail(speechError("empty-speech", "Recording ran too long. Try again.", true));
    }, this.options.maxTurnMs ?? 75_000);

    this.beginSession();
  }

  /** Create + start one recognition session (reused for every stitch). */
  private beginSession(): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.fail(speechError("unsupported-browser", "This browser can't do speech recognition."));
      return;
    }

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
     * ANDROID CHROME: final results are cumulative and repeat — the same
     * utterance can be re-delivered verbatim ("the cup of coffee" x5) or
     * extended ("the cup" → "the cup of tea"). We therefore rebuild the
     * transcript from the full results list every event and merge word-level
     * idempotently (mergeFinalChunk) — blind appending duplicates text.
     */
    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      let confidence: number | null = null;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result?.[0];
        if (!alt) continue;
        const raw = alt.transcript.trim();
        if (result.isFinal) {
          const chunk = this.sanitizeFinal(raw);
          // Android re-delivers CUMULATIVE final segments ("han" → "han I"
          // → "han I like"). Blind concatenation would produce
          // "han han I han I like …" — merge each segment idempotently.
          if (chunk) finals = this.mergeFinalChunk(finals, chunk);
        } else {
          interim += raw;
        }
        if (alt.confidence > 0 && alt.confidence < 1) {
          confidence = Math.max(confidence ?? 0, alt.confidence);
        }
      }

      if (confidence != null) {
        this.utteranceConfidence = Math.max(this.utteranceConfidence ?? 0, confidence);
      }

      // committed = transcript frozen before the current engine session;
      // finals = everything the current session has confirmed so far.
      const rebuilt = this.mergeFinalChunk(this.committed, finals);
      this.finalText = this.mergeFinalChunk(this.finalText, rebuilt);
      this.finalWords = this.finalText
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({ word, confidence: null }));

      this.lastHeardAt = Date.now();
      this.armSilenceTimer();
      this.armNoSpeechTimer();

      // Show confirmed + in-flight speech, deduped against the same merge.
      const display = this.mergeFinalChunk(this.finalText, interim.trim());
      if (display) this.callbacks.onInterim?.(display);
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.fail(speechError("mic-permission", "Microphone permission was denied."));
      } else if (event.error === "audio-capture") {
        this.fail(speechError("no-microphone", "No microphone was found."));
      } else if (event.error === "no-speech") {
        if (this.finalWords.length === 0) {
          this.fail(speechError("empty-speech", "Didn't catch any speech.", true));
        }
        // else: silence mid-turn — onend will stitch or deliver.
      } else if (event.error === "aborted") {
        // Engine tore the session down mid-turn; onend decides.
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
      } else if (!this.finalWords.length) {
        this.fail(speechError("transcription-failed", `Speech recognition failed (${event.error}).`, true));
      }
    };

    rec.onend = () => {
      if (this.finished) return;
      if (this.intentionalStop) {
        // User tap or silence watchdog asked to end: deliver the turn.
        if (this.finalWords.length > 0) this.finish(this.buildResult());
        else this.fail(speechError("empty-speech", "No speech detected. Try again.", true));
        return;
      }
      // Natural end (engine cut the session). Honor the configured pause
      // window by stitching a fresh session — unless it already elapsed.
      const budget = this.options.silenceStopMs ?? 2800;
      const silenceElapsed = Date.now() - this.lastHeardAt;
      if (this.finalWords.length > 0 && silenceElapsed >= budget) {
        this.finish(this.buildResult());
        return;
      }
      if (this.stitches >= MAX_STITCHES) {
        if (this.finalWords.length > 0) this.finish(this.buildResult());
        else this.fail(speechError("empty-speech", "No speech detected. Try again.", true));
        return;
      }
      this.stitches++;
      // Freeze what we have; the new session's finals will merge against it.
      this.committed = this.finalText;
      this.stitchTimer = setTimeout(() => {
        this.stitchTimer = null;
        if (this.finished || !this.active) return;
        this.beginSession();
      }, STITCH_DELAY_MS);
    };

    try {
      rec.start();
    } catch {
      this.fail(speechError("transcription-failed", "Could not start recording.", true));
    }
  }

  /**
   * Single-word final segments are engine noise when they REPEAT across the
   * turn ("han", "the", random blips from restart pops). Multi-word finals
   * get their noise tokens stripped. A token is blacklisted after it is seen
   * twice as a lone segment, and every occurrence is purged from the frozen
   * history so the transcript stays clean.
   */
  private sanitizeFinal(raw: string): string {
    if (!raw) return "";
    const words = raw.split(/\s+/);

    // Strip already-known noise tokens from any segment.
    if (this.noiseTokens.size > 0) {
      const kept = words.filter((w) => !this.noiseTokens.has(w.toLowerCase()));
      if (kept.length !== words.length) {
        raw = kept.join(" ");
        if (!raw) return "";
      }
    }

    // Track lone-segment tokens for noise detection.
    const lone = raw.split(/\s+/);
    if (lone.length === 1) {
      const key = lone[0]!.toLowerCase();
      // Never blacklist short/common words — "the", "I" etc. can legitimately
      // arrive as their own final segment.
      if (key.length >= 2 && !COMMON_WORDS.has(key)) {
        const seen = (this.singletonFinalCount.get(key) ?? 0) + 1;
        this.singletonFinalCount.set(key, seen);
        if (seen >= 2) {
          this.noiseTokens.add(key);
          this.purgeNoiseToken(key);
          return "";
        }
      }
    }
    return raw;
  }

  private purgeNoiseToken(token: string): void {
    const strip = (s: string) =>
      s
        .split(/\s+/)
        .filter((w) => w && w.toLowerCase() !== token)
        .join(" ");
    this.committed = strip(this.committed);
    this.finalText = strip(this.finalText);
    this.finalWords = this.finalText
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word, confidence: null }));
  }

  /**
   * Idempotently merge a (possibly repeated/extended) transcript into the
   * accumulated text. See notes above — Android re-delivers whole prefixes,
   * so blind appending would duplicate ("coffee coffee coffee...").
   */
  private mergeFinalChunk(acc: string, incoming: string): string {
    const a = acc.trim();
    const c = incoming.trim();
    if (!c) return a;
    if (!a) return c;
    if (c === a) return a;

    const aw = a.split(/\s+/);
    const cw = c.split(/\s+/);

    // cw already exists verbatim as a word run inside acc → skip.
    if (cw.length <= aw.length) {
      for (let i = 0; i + cw.length <= aw.length; i++) {
        let hit = true;
        for (let j = 0; j < cw.length; j++) {
          if (aw[i + j] !== cw[j]) {
            hit = false;
            break;
          }
        }
        if (hit) return a;
      }
    }
    // Restatement: starts with everything already known → replace (grows).
    if (cw.length >= aw.length && cw.slice(0, aw.length).join(" ") === a) return c;

    // Word-overlap stitching.
    for (let k = Math.min(aw.length, cw.length); k > 0; k--) {
      const suffix = aw.slice(aw.length - k).join(" ");
      const prefix = cw.slice(0, k).join(" ");
      if (suffix === prefix) {
        return cw.length > k ? `${a} ${cw.slice(k).join(" ")}` : a;
      }
    }
    return `${a} ${c}`;
  }

  stop(): void {
    if (!this.active) return;
    this.intentionalStop = true;
    this.clearTimers();
    try {
      this.recognition?.stop();
    } catch {
      /* noop */
    }
    // If the wedged engine never fires onend after a graceful stop,
    // force-deliver very shortly instead of hanging the turn.
    this.stopFallback = setTimeout(() => {
      this.stopFallback = null;
      if (this.finished) return;
      if (this.finalWords.length > 0) this.finish(this.buildResult());
      else this.fail(speechError("empty-speech", "Recording stopped. Tap the mic to try again.", true));
    }, 1200);
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
    const ms = this.options.silenceStopMs ?? 2800;
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
    if (this.turnCeilingTimer) clearTimeout(this.turnCeilingTimer);
    if (this.stopFallback) clearTimeout(this.stopFallback);
    if (this.stitchTimer) clearTimeout(this.stitchTimer);
    this.silenceTimer = null;
    this.noSpeechTimer = null;
    this.turnCeilingTimer = null;
    this.stopFallback = null;
    this.stitchTimer = null;
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

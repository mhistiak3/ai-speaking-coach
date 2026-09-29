/**
 * Speech provider abstractions. The app talks to these interfaces only.
 *
 * Current implementations:
 *  - Web Speech recognition (free, in-browser, per-turn transcripts)
 *  - Web Speech synthesis (free, in-browser voices)
 *
 * Phase 2/3 drop-ins (implement the same interfaces):
 *  - cloud STT with word confidence (Deepgram, Azure, Whisper)
 *  - premium TTS (ElevenLabs, OpenAI, Azure)
 *  - phoneme-level pronunciation assessment (Azure Speech)
 */

export type SpeechErrorCode =
  | "unsupported-browser"
  | "mic-permission"
  | "no-microphone"
  | "empty-speech"
  | "network"
  | "transcription-failed"
  | "synthesis-failed";

export interface SpeechError extends Error {
  code: SpeechErrorCode;
  retryable: boolean;
}

export function speechError(code: SpeechErrorCode, message: string, retryable = false): SpeechError {
  const err = new Error(message) as SpeechError;
  err.code = code;
  err.retryable = retryable;
  return err;
}

export interface TranscriptWord {
  word: string;
  /** 0–1 when the provider exposes confidence, else null. */
  confidence: number | null;
}

export interface FinalTranscript {
  text: string;
  words: TranscriptWord[];
  /** Wall-clock ms when capture started/ended (for fluency estimation). */
  startedAt: number;
  endedAt: number;
  /** Provider-reported confidence for the whole utterance, if any. */
  utteranceConfidence: number | null;
  /** True when the transcript came from a provider that measures audio. */
  hasRealConfidence: boolean;
}

export interface RecognizerCallbacks {
  onInterim?: (text: string) => void;
  onFinal?: (result: FinalTranscript) => void;
  onError?: (error: SpeechError) => void;
  /** Fired whenever capture stops (any reason). */
  onEnd?: () => void;
}

export interface StartOptions {
  /** BCP-47 language tag, e.g. "en-US". */
  lang: string;
  /** Stop capture after this much silence following speech (ms). */
  silenceStopMs?: number;
  /** Abort with "empty-speech" if nothing heard this long after start (ms). */
  noSpeechTimeoutMs?: number;
  /** Hard ceiling for one turn — protects against engines that stop
   *  emitting events without ever ending (mobile Chrome bug). */
  maxTurnMs?: number;
}

export interface SpeechTurn {
  start(): void;
  /** Ask for a graceful stop; onFinal fires with what was captured. */
  stop(): void;
  /** Kill the turn without delivering a transcript. */
  cancel(): void;
  readonly active: boolean;
}

export interface SpeechToTextProvider {
  readonly id: string;
  readonly name: string;
  /** True only if this provider yields phoneme/audio-level confidence. */
  readonly measuresAudio: boolean;
  isAvailable(): boolean;
  createTurn(options: StartOptions, callbacks: RecognizerCallbacks): SpeechTurn;
}

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  isDefault: boolean;
  localService: boolean;
  /** Heuristic guess from the voice name — browser APIs don't expose gender. */
  gender: "male" | "female" | "unknown";
}

export interface SpeakOptions {
  lang: string;
  voiceId?: string | null;
  rate?: number;
  pitch?: number;
  /** Bias for the auto-picked voice (ignored when voiceId is set). */
  gender?: "any" | "male" | "female";
}

export interface SpeakCallbacks {
  onStart?: () => void;
  /** Character index while speaking (karaoke highlighting), if supported. */
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: SpeechError) => void;
}

export interface SpeechHandle {
  cancel(): void;
}

export interface TextToSpeechProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): boolean;
  /** Voices may load asynchronously in browsers. */
  listVoices(lang?: string): Promise<VoiceInfo[]>;
  speak(text: string, options: SpeakOptions, callbacks?: SpeakCallbacks): SpeechHandle;
  cancelAll(): void;
}

import {
  speechError,
  type SpeakCallbacks,
  type SpeakOptions,
  type SpeechHandle,
  type TextToSpeechProvider,
  type VoiceInfo,
} from "./types";

/**
 * Free in-browser text-to-speech via window.speechSynthesis.
 * Voices come from the OS/browser; quality varies but latency is zero.
 * A dedicated TTS API (ElevenLabs/OpenAI/Azure) can replace this by
 * implementing TextToSpeechProvider.
 */

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function toVoiceInfo(v: SpeechSynthesisVoice): VoiceInfo {
  return {
    id: v.voiceURI,
    name: v.name,
    lang: v.lang,
    isDefault: v.default,
    localService: v.localService,
  };
}

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  if (!synth) return Promise.resolve([]);
  const immediate = synth.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done, { once: true });
    // Some engines never fire the event; resolve with whatever exists.
    setTimeout(done, 1500);
  });
  return voicesPromise;
}

/**
 * Chrome pauses long speechSynthesis utterances (~15s) unless nudged.
 * Keep-alive ticks pause/resume while speaking.
 */
function startKeepAlive(synth: SpeechSynthesis): () => void {
  const tick = setInterval(() => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 9000);
  return () => clearInterval(tick);
}

export const browserTts: TextToSpeechProvider = {
  id: "browser",
  name: "Browser voices (free)",
  isAvailable: () => getSynth() != null,

  async listVoices(lang) {
    const voices = await loadVoices();
    const filtered = lang
      ? voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()))
      : voices;
    const pool = filtered.length > 0 ? filtered : voices;
    return pool.map(toVoiceInfo);
  },

  speak(text, options: SpeakOptions, callbacks: SpeakCallbacks = {}): SpeechHandle {
    const synth = getSynth();
    if (!synth) {
      // Resolve async so callers can attach handlers first.
      queueMicrotask(() =>
        callbacks.onError?.(speechError("synthesis-failed", "Speech synthesis is unavailable here.")),
      );
      return { cancel() {} };
    }

    let stopKeepAlive: (() => void) | null = null;
    let cancelled = false;
    let ended = false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang;
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;

    const voiceId = options.voiceId;
    loadVoices().then((voices) => {
      if (cancelled || ended) return;
      const voice =
        (voiceId && voices.find((v) => v.voiceURI === voiceId)) ||
        voices.find((v) => v.lang === options.lang && v.default) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(options.lang.toLowerCase().split("-")[0]!)) ||
        null;
      if (voice) utterance.voice = voice;
    });

    utterance.onstart = () => {
      stopKeepAlive = startKeepAlive(synth);
      callbacks.onStart?.();
    };
    utterance.onboundary = (event) => callbacks.onBoundary?.(event.charIndex);
    utterance.onend = () => {
      ended = true;
      stopKeepAlive?.();
      callbacks.onEnd?.();
    };
    utterance.onerror = (event) => {
      ended = true;
      stopKeepAlive?.();
      // "interrupted"/"canceled" happen on purpose when we cancel; report only real failures.
      if (event.error !== "interrupted" && event.error !== "canceled") {
        callbacks.onError?.(speechError("synthesis-failed", `Voice playback failed (${event.error}).`, true));
      } else {
        callbacks.onEnd?.();
      }
    };

    synth.speak(utterance);

    return {
      cancel() {
        cancelled = true;
        stopKeepAlive?.();
        try {
          synth.cancel();
        } catch {
          /* noop */
        }
      },
    };
  },

  cancelAll() {
    const synth = getSynth();
    try {
      synth?.cancel();
    } catch {
      /* noop */
    }
  },
};

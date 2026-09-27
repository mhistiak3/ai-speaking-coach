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
    gender: guessGender(v.name),
  };
}

/**
 * Browser voice APIs don't expose gender — only well-known names do.
 * Conservative keyword lists; unknown names stay "unknown" (no penalty).
 */
const MALE_CUES = [
  "male", "david", "george", "fred", "alex", "rishi", "aaron", "arthur",
  "oliver", "james", "mark", "guy", "thomas", "william", "eric", "michael",
  "steve", "paul", "cosmo", "daniel", "tom", "roger", "andrew", "liam",
  "albert", "gordon", "junior", "ralph", "bruce", "jack",
];
const FEMALE_CUES = [
  "female", "zira", "susan", "samantha", "karen", "moira", "tessa", "victoria",
  "hazel", "linda", "heather", "catherine", "aria", "jenny", "michelle",
  "clara", "sonia", "natasha", "fiona", "amelie", "anna", "ellen", "kalinda",
  "pamela", "sara", "serena", "hulda", "katya", "luciana", "joana", "yuna",
];

export function guessGender(name: string): "male" | "female" | "unknown" {
  const n = name.toLowerCase();
  if (/\b(microsoft )?(man|him)\b/.test(n)) return "male";
  for (const c of MALE_CUES) if (n.includes(c)) return "male";
  for (const c of FEMALE_CUES) if (n.includes(c)) return "female";
  return "unknown";
}

/** Score a voice for auto-selection: language fit first, gender preference second. */
function scoreVoice(v: SpeechSynthesisVoice, lang: string, gender: "any" | "male" | "female"): number {
  let score = 0;
  if (v.lang === lang) score += 4;
  else if (v.lang.toLowerCase().startsWith(lang.toLowerCase().split("-")[0]!)) score += 2;
  if (v.default) score += 1;
  if (gender !== "any") {
    const g = guessGender(v.name);
    if (g === gender) score += 3;
    else if (g !== "unknown" && g !== gender) score -= 2;
  }
  return score;
}

/**
 * Decide which voice to use — pure function so it can run SYNCHRONOUSLY
 * before synth.speak(). (Setting `utterance.voice` after speak() starts is
 * ignored by the engine — the classic "voice change does nothing" bug.)
 *
 * Precedence: explicit user pick (any language) → best-scoring voice for
 * the target language + gender preference.
 */
export function resolveVoice(
  voices: SpeechSynthesisVoice[],
  options: SpeakOptions,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (options.voiceId) {
    const picked = voices.find((v) => v.voiceURI === options.voiceId);
    if (picked) return picked;
  }
  const langPrefix = options.lang.toLowerCase().split("-")[0]!;
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const pool = candidates.length > 0 ? candidates : voices;
  const gender = options.gender ?? "any";
  return pool.reduce((best, v) =>
    scoreVoice(v, options.lang, gender) > scoreVoice(best, options.lang, gender) ? v : best,
  );
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

    const start = (voices: SpeechSynthesisVoice[]) => {
      if (cancelled || ended) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang;
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      // Voice MUST be assigned before synth.speak() — engines snapshot the
      // utterance when speech starts; late assignment is silently ignored.
      const voice = resolveVoice(voices, options);
      if (voice) utterance.voice = voice;

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
    };

    const voicesNow = synth.getVoices();
    if (voicesNow.length > 0) {
      start(voicesNow);
    } else {
      // Some engines load voices asynchronously on first use — wait so the
      // chosen voice applies to THIS utterance, not the next one.
      void loadVoices().then(start);
    }

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

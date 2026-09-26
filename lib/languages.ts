import type { LanguageDef } from "./types";

/**
 * Language catalog. `speechTag` is what we feed the browser's
 * SpeechRecognition / SpeechSynthesis APIs.
 */
export const LANGUAGES: LanguageDef[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    speechTag: "en-US",
    speechSupported: true,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "🇧🇩",
    speechTag: "bn-BD",
    speechSupported: true,
    promptNote:
      "Bengali speakers often substitute /v/→/b/, /z/→/j/, /sh/→/s/ and drop final consonants; watch for those.",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    speechTag: "hi-IN",
    speechSupported: true,
    promptNote:
      "Hindi speakers may exchange /v/ and /w/, and use retroflex-like t/d; watch for those.",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    speechTag: "es-ES",
    speechSupported: true,
    promptNote:
      'Spanish speakers often add a vowel before s-clusters ("eschool") and swap /b/–/v/.',
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    speechTag: "ar-SA",
    speechSupported: true,
    promptNote: "Arabic speakers may mix /p/→/b/ and /v/→/f/.",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    speechTag: "pt-BR",
    speechSupported: true,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    speechTag: "fr-FR",
    speechSupported: true,
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechTag: "de-DE",
    speechSupported: true,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    speechTag: "ja-JP",
    speechSupported: true,
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    flag: "🇰🇷",
    speechTag: "ko-KR",
    speechSupported: true,
  },
  {
    code: "zh",
    name: "Chinese (Mandarin)",
    nativeName: "中文",
    flag: "🇨🇳",
    speechTag: "zh-CN",
    speechSupported: true,
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    flag: "🇹🇷",
    speechTag: "tr-TR",
    speechSupported: true,
  },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "🇮🇩",
    speechTag: "id-ID",
    speechSupported: true,
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    flag: "🇵🇰",
    speechTag: "ur-PK",
    speechSupported: true,
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechTag: "it-IT",
    speechSupported: true,
  },
];

export const LANGUAGE_BY_CODE: ReadonlyMap<string, LanguageDef> = new Map(
  LANGUAGES.map((l) => [l.code, l]),
);

export function getLanguage(code: string): LanguageDef {
  return (
    LANGUAGE_BY_CODE.get(code) ?? {
      code,
      name: code,
      nativeName: code,
      flag: "🌐",
      speechTag: code,
      speechSupported: false,
    }
  );
}

export const PRACTICE_LANGUAGES = LANGUAGES.filter((l) =>
  ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "zh", "ar"].includes(l.code),
);

export const NATIVE_LANGUAGES = LANGUAGES;

/**
 * Core domain types for the AI Speaking Coach.
 * Shared by client and server — keep this file dependency-free.
 */

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced";

export type CorrectionFrequency = "minimal" | "balanced" | "detailed";

/** A language that can be spoken, recognized, or synthesized. */
export interface LanguageDef {
  /** Stable short code used in storage (e.g. "en", "bn"). */
  code: string;
  /** English name. */
  name: string;
  /** Name written in the language itself. */
  nativeName: string;
  /** Emoji flag for compact display. */
  flag: string;
  /** BCP-47 tag for speech recognition / synthesis (e.g. "en-US"). */
  speechTag: string;
  /** Whether Web Speech recognition generally supports this tag. */
  speechSupported: boolean;
  /** Optional instruction added to AI prompts about this language. */
  promptNote?: string;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  description: string;
  aiRole: string;
  userRole: string;
  startingPrompt: string;
  /** Conversation-starter hints shown as chips while talking. */
  hintPrompts: string[];
  /** For the "random" mode: the seed topic the AI pretends the pair stumbled onto. */
  randomTopic?: string;
  tags?: string[];
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  /** For user messages: ms of captured speech (estimated). */
  speechMs?: number;
  /** For user messages: number of words spoken. */
  wordCount?: number;
  /** Linked TurnAnalysis id. */
  analysisId?: string;
  /** Assistant text that arrived after an API error was retried. */
  errored?: boolean;
}

/** Score that can be unknown (null) and is always honest about its source. */
export interface ScoredMetric {
  value: number | null;
  /** true → model/heuristic estimate; only provider phoneme scores are false. */
  estimated: boolean;
}

export interface PronunciationWordIssue {
  word: string;
  /** 0–100 AI estimate, null when the model declined to guess. */
  estimatedScore: number | null;
  /** "th" in "think" — short articulation hint. */
  soundHint: string | null;
  /** One-line coaching tip. */
  tip: string;
}

export interface Correction {
  original: string;
  improved: string;
  why: string;
  /** Translation/transliteration-aware note in the user's native language. */
  whyNative: string | null;
  tone: "gentle" | "neutral" | "quick";
  category: "grammar" | "vocabulary" | "phrasing";
}

export interface FluencySignals {
  /** Words per minute of captured speech. */
  wordsPerMinute: number | null;
  /** Filler words heard in the transcript ("um", "like"…). */
  fillerCount: number;
  /** Self-repetition ("I went I went…"). */
  repeatCount: number;
  pauseCount: number;
  /** Long hesitation before starting to speak. */
  longPauses: number;
  estimated: true;
}

export interface TurnAnalysis {
  id: string;
  turnIndex: number;
  messageId: string;
  pronunciation: ScoredMetric;
  grammar: ScoredMetric;
  vocabulary: ScoredMetric;
  fluency: FluencySignals;
  words: PronunciationWordIssue[];
  correction: Correction | null;
  encouragement: string | null;
  createdAt: number;
}

export interface WordAttempt {
  transcript: string;
  /** 0–1 string similarity (normalized). */
  accuracy: number;
  createdAt: number;
}

export interface WordProfile {
  word: string;
  language: string;
  ipa: string | null;
  /** ["com","fort","a","ble"] */
  syllables: string[];
  /** 0-based indices carrying primary/secondary stress. */
  stressedSyllables: number[];
  /** Approximate stress-weighted pronunciation (0–1) for UI meter. */
  difficulty: number | null;
  meaning: string;
  example: string;
  /** Meaning translated into the learner's native language. */
  meaningNative: string | null;
}

export interface WordPracticeRecord {
  word: string;
  language: string;
  profile: WordProfile | null;
  attempts: WordAttempt[];
  /** Count of session-level repetitions across all analyses. */
  seenInSessions: number;
  lastPracticedAt: number | null;
}

export interface SessionStats {
  turns: number;
  /** Total user words spoken. */
  wordsSpoken: number;
  /** Total captured speech time. */
  speakingMs: number;
  /** Total session wall time. */
  durationMs: number;
  /** Filler words across the session. */
  fillers: number;
  avgResponseMs: number | null;
  /** Average of available AI-estimated pronunciation scores. */
  pronunciationAvg: number | null;
  grammarAvg: number | null;
  vocabularyAvg: number | null;
}

export interface ConversationSession {
  id: string;
  createdAt: number;
  endedAt: number | null;
  scenarioId: string;
  customTopic: string | null;
  nativeLanguage: string;
  targetLanguage: string;
  level: ProficiencyLevel;
  /** The opening line the AI delivered (pre-generated). */
  greeting: string;
  messages: ChatMessage[];
  analyses: TurnAnalysis[];
  stats: SessionStats;
}

export interface UserSettings {
  nativeLanguage: string;
  targetLanguage: string;
  level: ProficiencyLevel;
  /** Voice URI from the TTS provider, or null → provider default. */
  voiceId: string | null;
  /** 0.75 or 1.0 */
  playbackRate: number;
  autoPlayVoice: boolean;
  muted: boolean;
  /** Bias for the auto-picked browser voice when no specific voice is chosen. */
  voiceGender: "any" | "male" | "female";
  correctionFrequency: CorrectionFrequency;
  pronunciationFeedback: boolean;
  theme: "dark" | "light";
}

export const DEFAULT_SETTINGS: UserSettings = {
  nativeLanguage: "bn",
  targetLanguage: "en",
  level: "intermediate",
  voiceId: null,
  playbackRate: 1,
  autoPlayVoice: true,
  muted: false,
  voiceGender: "male",
  correctionFrequency: "balanced",
  pronunciationFeedback: true,
  theme: "dark",
};

export function isConfigurableLanguage(code: string): boolean {
  return typeof code === "string" && code.length >= 2 && code.length <= 5;
}

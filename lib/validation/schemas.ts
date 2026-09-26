import { z } from "zod";

/**
 * Zod schemas shared by API request validation AND LLM structured-output
 * validation, so provider responses are never trusted blindly.
 */

export const LevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const LanguageCodeSchema = z.string().min(2).max(5);

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const ConversationRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  nativeLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  level: LevelSchema,
  scenarioId: z.string().min(1).max(64),
  customTopic: z.string().max(200).nullish(),
  messages: z.array(ChatMessageSchema).min(1).max(60),
});

export const CorrectionSchema = z.object({
  original: z.string().max(300),
  improved: z.string().max(300),
  why: z.string().max(400),
  whyNative: z.string().max(400).nullable().default(null),
  tone: z.enum(["gentle", "neutral", "quick"]).default("neutral"),
  category: z.enum(["grammar", "vocabulary", "phrasing"]).default("grammar"),
});

export const PronunciationIssueSchema = z.object({
  word: z.string().min(1).max(50),
  estimatedScore: z.number().min(0).max(100).nullable().default(null),
  soundHint: z.string().max(200).nullable().default(null),
  tip: z.string().max(300),
});

export const AnalysisResponseSchema = z.object({
  pronunciationScore: z.number().min(0).max(100).nullable().default(null),
  grammarScore: z.number().min(0).max(100).nullable().default(null),
  vocabularyScore: z.number().min(0).max(100).nullable().default(null),
  wordsToPractice: z.array(PronunciationIssueSchema).max(6).default([]),
  correction: CorrectionSchema.nullable().default(null),
  encouragement: z.string().max(200).nullable().default(null),
});

export type AnalysisOutput = z.infer<typeof AnalysisResponseSchema>;

export const AnalyzeRequestSchema = z.object({
  userText: z.string().min(1).max(4000),
  assistantText: z.string().max(4000).default(""),
  nativeLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  level: LevelSchema,
  correctionFrequency: z.enum(["minimal", "balanced", "detailed"]).default("balanced"),
  pronunciationFeedback: z.boolean().default(true),
  /** Word confidences from the STT provider when available (0–1). */
  wordHints: z
    .array(z.object({ word: z.string().max(50), confidence: z.number().min(0).max(1).nullable() }))
    .max(200)
    .default([]),
});

export const ExplainRequestSchema = z.object({
  userText: z.string().min(1).max(2000),
  correction: CorrectionSchema.nullable().default(null),
  nativeLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  level: LevelSchema,
});

export const WordProfileRequestSchema = z.object({
  word: z.string().min(1).max(50),
  targetLanguage: LanguageCodeSchema,
  nativeLanguage: LanguageCodeSchema.optional(),
});

export const WordProfileSchema = z.object({
  ipa: z.string().max(100).nullable().default(null),
  syllables: z.array(z.string().max(30)).max(12).default([]),
  stressedSyllables: z.array(z.number().int().min(0).max(11)).max(12).default([]),
  difficulty: z.number().min(0).max(1).nullable().default(null),
  meaning: z.string().max(500),
  example: z.string().max(500),
  meaningNative: z.string().max(500).nullable().default(null),
});

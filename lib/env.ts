import { z } from "zod";

/**
 * Server-only environment configuration, validated once per process.
 * Never import this from client components — API keys live here.
 */
const EnvSchema = z.object({
  OPENCODE_API_KEY: z.string().min(1).optional().default(""),
  OPENCODE_BASE_URL: z.url().optional().default("https://opencode.ai/zen/go"),
  OPENCODE_MODEL: z.string().min(1).optional().default("glm-5.3-flash"),
  DATABASE_URL: z.string().min(1).optional().default(""),
  AZURE_SPEECH_KEY: z.string().optional().default(""),
  AZURE_SPEECH_REGION: z.string().optional().default(""),
  AZURE_SPEECH_ENDPOINT: z.string().optional().default(""),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

/** Empty strings from .env files mean "unset". */
function stripEmpty(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = v === "" ? undefined : v;
  return out;
}

export function getEnv(): ServerEnv {
  if (!cached) {
    cached = EnvSchema.parse(
      stripEmpty({
        OPENCODE_API_KEY: process.env.OPENCODE_API_KEY,
        OPENCODE_BASE_URL: process.env.OPENCODE_BASE_URL,
        OPENCODE_MODEL: process.env.OPENCODE_MODEL,
        DATABASE_URL: process.env.DATABASE_URL,
        AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
        AZURE_SPEECH_ENDPOINT: process.env.AZURE_SPEECH_ENDPOINT,
      }),
    );
  }
  return cached;
}

/** Placeholder values that mean "not configured yet". */
const PLACEHOLDER_PATTERN = /^(your-|xxx+|changeme|<.*>|todo)/i;

export function isAIConfigured(): boolean {
  const { OPENCODE_API_KEY } = getEnv();
  return OPENCODE_API_KEY.length > 0 && !PLACEHOLDER_PATTERN.test(OPENCODE_API_KEY);
}

export function isDatabaseConfigured(): boolean {
  return getEnv().DATABASE_URL.startsWith("postgres");
}

import { z } from "zod";

import { getEnv, isAIConfigured } from "@/lib/env";
import {
  isLlmError,
  llmError,
  type LlmChatOptions,
  type LlmChatResult,
  type LlmProvider,
} from "./types";

/**
 * OpenCode Go provider.
 *
 * Verified API shape (https://opencode.ai/docs/go):
 *   GET  {BASE}/v1/models                → OpenAI-style model list
 *   POST {BASE}/v1/chat/completions      → OpenAI chat completions (Bearer auth)
 *
 * Model ids are sent bare (e.g. "glm-5.3-flash"); an "opencode-go/" prefix
 * from config is stripped automatically. Only chat-completions endpoint
 * models are supported here — models served on /v1/messages (Anthropic
 * style) or /v1/responses need their own provider implementations.
 */

const ChatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
        finish_reason: z.string().optional(),
      }),
    )
    .min(1),
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

/**
 * Reasoning models on OpenCode Go (e.g. glm-5.3-flash) spend tokens on
 * hidden reasoning before emitting content — callers must pass generous
 * max_tokens. The timeout covers that extra thinking.
 */
const REQUEST_TIMEOUT_MS = 60_000;

export class OpenCodeGoProvider implements LlmProvider {
  readonly id = "opencode-go";
  readonly name = "OpenCode Go";

  private config() {
    const env = getEnv();
    if (!isAIConfigured()) {
      throw llmError(
        "not-configured",
        "OpenCode Go API key is not configured. Add OPENCODE_API_KEY to .env.local.",
      );
    }
    return {
      apiKey: env.OPENCODE_API_KEY,
      baseUrl: env.OPENCODE_BASE_URL.replace(/\/+$/, ""),
      // Accept "opencode-go/model" or "model"; the API wants the bare id.
      model: env.OPENCODE_MODEL.replace(/^opencode-go\//, ""),
    };
  }

  async chat(options: LlmChatOptions): Promise<LlmChatResult> {
    const { apiKey, baseUrl, model } = this.config();
    // OpenCode Go rejects requests without a stable session id
    // (x-opencode-session). Reuse the caller's, else mint one per request.
    const sessionId =
      options.sessionId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fv-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // OpenCode Go asks clients to identify themselves and send a
          // stable session id for routing/caching.
          "User-Agent": "ai-speaking-coach/1.0",
          "x-opencode-session": sessionId,
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw llmError("timeout", "The AI took too long to respond.", { retryable: true, cause: err });
      }
      throw llmError("network", "Could not reach the AI service.", { retryable: true, cause: err });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        throw llmError("auth", "The AI rejected the API key.", { status: response.status });
      }
      if (response.status === 429) {
        throw llmError("rate-limit", "AI rate limit reached — give it a few seconds.", {
          status: response.status,
          retryable: true,
        });
      }
      if (response.status >= 500) {
        throw llmError("server", "The AI service had a problem.", {
          status: response.status,
          retryable: true,
        });
      }
      throw llmError("bad-response", `AI request failed (${response.status}): ${body.slice(0, 200)}`, {
        status: response.status,
      });
    }

    const parsed = ChatCompletionSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw llmError("bad-response", "The AI returned an unexpected response shape.", {
        retryable: true,
      });
    }

    const text = parsed.data.choices[0]?.message.content ?? "";
    return {
      text,
      model: parsed.data.model ?? model,
      usage: parsed.data.usage
        ? {
            promptTokens: parsed.data.usage.prompt_tokens,
            completionTokens: parsed.data.usage.completion_tokens,
          }
        : undefined,
    };
  }

  async chatJson<T>(options: LlmChatOptions): Promise<T> {
    const result = await this.chat({ ...options, json: true });
    return parseJsonLoose<T>(result.text);
  }
}

/**
 * Models sometimes wrap JSON in markdown fences or add prose. Extract the
 * first JSON object/array found and parse it.
 */
export function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();
  const candidates: string[] = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.search(/[[{]/);
  if (firstBrace >= 0) {
    const open = trimmed[firstBrace];
    const close = open === "{" ? "}" : "]";
    const lastClose = trimmed.lastIndexOf(close);
    if (lastClose > firstBrace) {
      candidates.push(trimmed.slice(firstBrace, lastClose + 1));
    }
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw llmError("bad-response", "The AI did not return valid JSON.", {
    retryable: true,
    cause: lastError,
  });
}

/** Error → user-friendly message for UI display. */
export function describeLlmError(err: unknown): { message: string; retryable: boolean } {
  if (isLlmError(err)) {
    switch (err.kind) {
      case "not-configured":
        return {
          message: "AI is not set up yet. Add OPENCODE_API_KEY to .env.local and restart.",
          retryable: false,
        };
      case "auth":
        return { message: "The AI rejected the configured API key.", retryable: false };
      case "rate-limit":
        return { message: "The AI is rate-limited. Trying again in a moment usually helps.", retryable: true };
      case "timeout":
        return { message: "The AI took too long to answer. You can retry.", retryable: true };
      case "network":
        return { message: "Network problem reaching the AI service.", retryable: true };
      case "server":
        return { message: "The AI service is having trouble right now.", retryable: true };
      case "bad-response":
        return { message: "The AI sent back something we couldn't use.", retryable: true };
      default:
        return { message: "The AI request failed.", retryable: true };
    }
  }
  return { message: err instanceof Error ? err.message : "Unknown error.", retryable: false };
}

export const openCodeGoProvider = new OpenCodeGoProvider();

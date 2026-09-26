/**
 * Provider-agnostic LLM interface.
 * Swap OpenCode Go for any other chat model by implementing this contract
 * in lib/ai/<vendor>.ts and registering it in provider.ts.
 */

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmChatOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for strict JSON output when supported. */
  json?: boolean;
  /** Stable id for provider-side session routing/caching. */
  sessionId?: string;
  signal?: AbortSignal;
}

export interface LlmChatResult {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface LlmError extends Error {
  kind:
    | "not-configured"
    | "auth"
    | "rate-limit"
    | "timeout"
    | "network"
    | "bad-response"
    | "server"
    | "unknown";
  status?: number;
  retryable: boolean;
}

export interface LlmProvider {
  readonly id: string;
  readonly name: string;
  chat(options: LlmChatOptions): Promise<LlmChatResult>;
  /** Convenience: chat + parse JSON. Throws LlmError on invalid JSON. */
  chatJson<T>(options: LlmChatOptions): Promise<T>;
}

export function isLlmError(err: unknown): err is LlmError {
  return (
    err instanceof Error &&
    "kind" in err &&
    "retryable" in err &&
    typeof (err as LlmError).retryable === "boolean"
  );
}

export function llmError(
  kind: LlmError["kind"],
  message: string,
  opts: { status?: number; retryable?: boolean; cause?: unknown } = {},
): LlmError {
  const err = new Error(message, opts.cause != null ? { cause: opts.cause } : undefined) as LlmError;
  err.kind = kind;
  err.status = opts.status;
  err.retryable = opts.retryable ?? false;
  return err;
}

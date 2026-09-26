import { openCodeGoProvider } from "./opencode";
import type { LlmProvider } from "./types";

/**
 * Central provider registry. To add a new LLM vendor:
 * 1. Implement LlmProvider in lib/ai/<vendor>.ts
 * 2. Register it here.
 * Components never import vendors directly.
 */
const providers: Record<string, LlmProvider> = {
  "opencode-go": openCodeGoProvider,
};

const DEFAULT_PROVIDER = "opencode-go";

export function getLlm(): LlmProvider {
  return providers[DEFAULT_PROVIDER]!;
}

export { describeLlmError } from "./opencode";
export { isLlmError, llmError } from "./types";
export type { LlmMessage, LlmProvider, LlmChatOptions } from "./types";

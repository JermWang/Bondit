export type { AIProvider, ChatMessage, CompletionOptions, CompletionResult } from "./types";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";

import { AIProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { logger } from "../logger";

export type ProviderName = "anthropic" | "openai";

/**
 * Resolve an AI provider from environment or explicit config.
 *
 * Priority:
 *   1. ANTHROPIC_API_KEY  → Claude (default)
 *   2. OPENAI_API_KEY     → OpenAI (fallback / BYOK)
 *   3. null               → no provider configured (canned responses only)
 */
export function resolveProvider(overrides?: {
  provider?: ProviderName;
  apiKey?: string;
}): AIProvider | null {
  // BYOK override path
  if (overrides?.provider && overrides?.apiKey) {
    return createProvider(overrides.provider, overrides.apiKey);
  }

  // Default: prefer Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    logger.info("AI provider: Anthropic (Claude)");
    return new AnthropicProvider(anthropicKey);
  }

  // Fallback: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    logger.info("AI provider: OpenAI (fallback)");
    return new OpenAIProvider(openaiKey);
  }

  logger.warn("No AI provider configured — using grounded indexer fallback responses only");
  return null;
}

function createProvider(name: ProviderName, apiKey: string): AIProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }
}

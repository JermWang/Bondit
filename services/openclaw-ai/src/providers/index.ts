export type { AIProvider, ChatMessage, CompletionOptions, CompletionResult } from "./types";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";

import { AIProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { logger } from "../logger";

export type ProviderName = "anthropic" | "openai";

export interface ByokOverride {
  provider: ProviderName;
  apiKey: string;
}

/**
 * Resolve an AI provider from environment or explicit config.
 *
 * Priority:
 *   1. BYOK override (user-supplied key)  → user's own provider
 *   2. ANTHROPIC_API_KEY env              → Claude (team-funded default)
 *   3. OPENAI_API_KEY env                 → OpenAI (team-funded fallback)
 *   4. null                               → no provider (grounded responses only)
 */
export function resolveProvider(overrides?: ByokOverride | null): AIProvider | null {
  // BYOK override path — user brought their own key
  if (overrides?.provider && overrides?.apiKey) {
    logger.info({ provider: overrides.provider }, "AI provider: BYOK (user-supplied key)");
    return createProvider(overrides.provider, overrides.apiKey);
  }

  // Default: prefer Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return new AnthropicProvider(anthropicKey);
  }

  // Fallback: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIProvider(openaiKey);
  }

  logger.warn("No AI provider configured — using grounded indexer fallback responses only");
  return null;
}

/**
 * Resolve the team-funded (default) provider only.
 * Used at server startup for health checks and to pre-warm.
 */
export function resolveTeamProvider(): AIProvider | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return new OpenAIProvider(openaiKey);
  return null;
}

export function createProvider(name: ProviderName, apiKey: string): AIProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }
}

/**
 * Parse BYOK headers from an incoming request.
 *
 * Supported headers:
 *   X-AI-Provider:  "anthropic" | "openai"
 *   X-AI-API-Key:   the user's own API key
 *
 * Returns null if no BYOK headers are present (use team-funded provider).
 */
export function parseByokHeaders(headers: Record<string, string | string[] | undefined>): ByokOverride | null {
  const providerRaw = (typeof headers["x-ai-provider"] === "string" ? headers["x-ai-provider"] : "").trim().toLowerCase();
  const apiKey = (typeof headers["x-ai-api-key"] === "string" ? headers["x-ai-api-key"] : "").trim();

  if (!providerRaw || !apiKey) return null;

  if (providerRaw !== "anthropic" && providerRaw !== "openai") {
    logger.warn({ provider: providerRaw }, "BYOK: unsupported provider, ignoring");
    return null;
  }

  return { provider: providerRaw as ProviderName, apiKey };
}

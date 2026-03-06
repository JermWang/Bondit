/**
 * AI Provider abstraction — allows BondIt to use any LLM backend.
 *
 * Default: Anthropic (Claude)
 * BYOK:    Users can bring their own API key for any supported provider.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  /** Model override (provider-specific). Falls back to provider default. */
  model?: string;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Sampling temperature 0-1 */
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  readonly name: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;
}

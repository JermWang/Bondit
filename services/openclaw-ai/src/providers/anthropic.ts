import { AIProvider, ChatMessage, CompletionOptions, CompletionResult } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Anthropic (Claude) provider — default AI backend for BondIt.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.anthropic.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? 0.3;

    // Separate system message from conversation
    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: conversationMsgs,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      content: { type: string; text: string }[];
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      text,
      model: data.model,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    };
  }
}

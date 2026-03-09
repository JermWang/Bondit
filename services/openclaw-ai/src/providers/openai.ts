import { AIProvider, ChatMessage, CompletionOptions, CompletionResult } from "./types";

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * OpenAI provider — fallback / BYOK option.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.openai.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? 0.3;

    const body = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      throw new Error(`OpenAI API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[];
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0]?.message?.content ?? "",
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    };
  }
}

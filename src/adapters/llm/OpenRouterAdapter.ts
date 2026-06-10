import OpenAI from "openai";
import type { ILanguageModel, ChatParams } from "../../core/ports/ILanguageModel.js";

/**
 * Driven adapter — implements ILanguageModel using OpenRouter as the HTTP
 * gateway to Anthropic Claude.  This is the only file in the codebase that
 * imports the OpenAI SDK or knows about OpenRouter.
 */
export class OpenRouterAdapter implements ILanguageModel {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://efrain-ai.internal",
        "X-Title": "Efrain AI",
      },
    });
  }

  async chat(params: ChatParams): Promise<string> {
    const body: Record<string, unknown> = {
      model:       params.model,
      temperature: params.temperature ?? 0.2,
      max_tokens:  params.max_tokens  ?? 4096,
      messages: [
        { role: "system", content: params.system },
        { role: "user",   content: params.user   },
      ],
    };

    if (params.json_mode) {
      body.response_format = { type: "json_object" };
    } else if (params.json_schema) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: "response", strict: true, schema: params.json_schema },
      };
    }

    if (params.thinking) {
      body.thinking = { type: "adaptive" };
    }

    const maxAttempts = 5;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.chat.completions.create(
          body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        );
        return (response as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content ?? "";
      } catch (err) {
        lastError = err;
        const isRetryable =
          err instanceof TypeError ||
          (err instanceof Error && (
            err.message.includes("network") ||
            err.message.includes("fetch") ||
            err.message.includes("ECONNRESET") ||
            err.message.includes("ETIMEDOUT") ||
            err.message.includes("socket") ||
            err.message.includes("529") ||   // OpenRouter overloaded
            err.message.includes("500") ||   // upstream error
            err.message.includes("502") ||
            err.message.includes("503")
          ));
        if (!isRetryable || attempt === maxAttempts) throw err;
        // Exponential backoff: 2s, 4s, 8s, 16s
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 16000);
        console.warn(`[OpenRouter] Retryable error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms… (${(err as Error).message})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  async *chatStream(params: ChatParams): AsyncGenerator<string, string> {
    const body: Record<string, unknown> = {
      model:       params.model,
      temperature: params.temperature ?? 0.4,
      max_tokens:  params.max_tokens  ?? 8192,
      stream:      true,
      messages: [
        { role: "system", content: params.system },
        { role: "user",   content: params.user   },
      ],
    };

    if (params.thinking) {
      body.thinking = { type: "adaptive" };
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const stream = await this.client.chat.completions.create(
          body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
        );

        let full = "";
        for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            yield delta;
          }
        }
        return full;
      } catch (err) {
        lastError = err;
        const msg = String(err);
        const isRetryable =
          err instanceof TypeError ||
          (err instanceof Error && (
            msg.includes("network") ||
            msg.includes("fetch") ||
            msg.includes("ECONNRESET") ||
            msg.includes("ETIMEDOUT") ||
            msg.includes("socket") ||
            msg.includes("529") ||
            msg.includes("500") ||
            msg.includes("502") ||
            msg.includes("503")
          ));
        if (!isRetryable || attempt === maxAttempts) throw err;
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
        console.warn(`[OpenRouter stream] Retryable error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms… (${(err as Error).message})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}

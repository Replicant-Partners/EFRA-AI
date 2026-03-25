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

    const response = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    );

    return (response as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content ?? "";
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
  }
}

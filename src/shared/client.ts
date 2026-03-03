import "dotenv/config";
import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("Missing OPENROUTER_API_KEY in environment");
}

export const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://efrain-ai.internal",
    "X-Title": "Efrain AI",
  },
});

// Model aliases — update here if OpenRouter changes slugs
export const MODELS = {
  haiku:  "anthropic/claude-haiku-4-5",    // Agent 01 (fast scoring)
  sonnet: "anthropic/claude-sonnet-4-6",   // Agents 02–04
  opus:   "anthropic/claude-opus-4-6",     // Agents 05–06
} as const;

/**
 * Calls the OpenRouter chat completion API and returns the text content.
 * Passes Anthropic-specific params (thinking, output_config) via extra_body.
 */
export async function chat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
  thinking?: boolean;        // enables adaptive thinking via extra_body
  json_schema?: object;      // full strict schema (slower, use sparingly)
  json_mode?: boolean;       // simple json_object mode (fast, recommended)
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.max_tokens ?? 4096,
    messages: [
      { role: "system", content: params.system },
      { role: "user",   content: params.user },
    ],
  };

  if (params.json_mode) {
    body.response_format = { type: "json_object" };
  } else if (params.json_schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema: params.json_schema,
      },
    };
  }

  if (params.thinking) {
    // Pass adaptive thinking through extra_body (Anthropic-specific)
    body.thinking = { type: "adaptive" };
  }

  const response = await client.chat.completions.create(
    body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  );

  return (response as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content ?? "";
}

/**
 * Extracts a JSON object from LLM output that may contain markdown fences,
 * headings, or other surrounding prose. Finds the first '{' and last '}'.
 */
export function extractJSON(text: string): string {
  // Strip ```json ... ``` fences first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  // Fall back: slice from first '{' to last '}'
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in LLM response. Raw: ${text.slice(0, 200)}`);
  }
  return text.slice(start, end + 1);
}

/**
 * Streaming variant — yields text chunks, returns full text when done.
 */
export async function* chatStream(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
  thinking?: boolean;
}): AsyncGenerator<string, string> {
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: params.temperature ?? 0.4,
    max_tokens: params.max_tokens ?? 8192,
    stream: true,
    messages: [
      { role: "system", content: params.system },
      { role: "user",   content: params.user },
    ],
  };

  if (params.thinking) {
    body.thinking = { type: "adaptive" };
  }

  const stream = await client.chat.completions.create(
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

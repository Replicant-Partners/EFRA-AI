/**
 * Port — the contract between the application core and any LLM backend.
 * The core only depends on this interface, never on a concrete SDK.
 */
export interface ChatParams {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
  thinking?: boolean;
  json_schema?: object;
  json_mode?: boolean;
}

export interface ILanguageModel {
  chat(params: ChatParams): Promise<string>;
  chatStream(params: ChatParams): AsyncGenerator<string, string>;
}

/** Canonical model aliases — single source of truth for the whole pipeline. */
export const MODELS = {
  haiku:  "anthropic/claude-haiku-4.5",
  sonnet: "anthropic/claude-sonnet-4.5",
  opus:   "anthropic/claude-opus-4.5",
} as const;

import { OpenRouterAdapter } from "./adapters/llm/OpenRouterAdapter.js";
import { MockLLMAdapter }    from "./adapters/llm/MockLLMAdapter.js";
import type { ILanguageModel } from "./core/ports/ILanguageModel.js";

/**
 * Composition root — the single place that knows both the core and its adapters.
 *
 * Production:  OpenRouterAdapter  (Claude via OpenRouter, requires OPENROUTER_API_KEY)
 * Test:        MockLLMAdapter     (pre-canned responses, zero API cost)
 *
 * To swap models or providers in the future, change only this file.
 */
export function buildLLM(env = process.env.NODE_ENV): ILanguageModel {
  if (env === "test") {
    return new MockLLMAdapter();
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY in environment");
  return new OpenRouterAdapter(key);
}

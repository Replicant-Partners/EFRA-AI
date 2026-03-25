import type { ILanguageModel, ChatParams } from "../../core/ports/ILanguageModel.js";

/**
 * Test adapter — returns pre-canned JSON strings without hitting any API.
 *
 * Usage in tests:
 *   const llm = new MockLLMAdapter({ default: JSON.stringify(myFixture) });
 *   const result = await runScout(llm, input);
 *
 * Fixture lookup order: params.model → "default" → "{}"
 */
export class MockLLMAdapter implements ILanguageModel {
  private responses: Map<string, string>;

  constructor(responses: Record<string, string> = {}) {
    this.responses = new Map(Object.entries(responses));
  }

  async chat(params: ChatParams): Promise<string> {
    return (
      this.responses.get(params.model) ??
      this.responses.get("default")    ??
      "{}"
    );
  }

  async *chatStream(params: ChatParams): AsyncGenerator<string, string> {
    const text = await this.chat(params);
    yield text;
    return text;
  }
}

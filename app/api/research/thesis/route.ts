import { runThesis } from "@/src/agents/12-thesis/index";
import { buildLLM } from "@/src/configurator";
import type { ThesisInput } from "@/src/shared/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json() as ThesisInput;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send  = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const log   = (msg: string)  => send({ type: "log", msg });
      const pause = (ms: number)   => new Promise(r => setTimeout(r, ms));

      try {
        const llm    = buildLLM();
        const ticker = body.ticker?.toUpperCase().trim() || "UNKNOWN";

        log(`Writing investment thesis for ${ticker}…`);
        await pause(600);
        log(`Part 1 · Thesis statement — durable, timeless, three pillars…`);

        let abortWaiting = false;
        (async () => {
          const steps = [
            { delay: 3000, msg: `Part 2 · Business Franchise — moat strength, value creation mechanism…` },
            { delay: 3500, msg: `Part 3 · Management Quality — capital allocation, leadership, culture…` },
            { delay: 3500, msg: `Part 4 · Financial Signposts — market power + management skill indicators…` },
            { delay: 4000, msg: `Part 5 · Value Expectations — 3-stage framework, 15% target return…` },
            { delay: 3000, msg: `Part 6 · Value Gorilla summary + Turd Blossom assessment…` },
          ];
          for (const { delay, msg } of steps) {
            await pause(delay);
            if (abortWaiting) break;
            log(msg);
          }
        })();

        const result = await runThesis(llm, body);
        abortWaiting = true;

        // ── Stream result summary ──────────────────────────────────────────
        await pause(80);
        log(`─────────────────────────────────────────────`);

        const qualityLabel: Record<string, string> = {
          investment_grade: "INVESTMENT GRADE ✓",
          needs_work:       "NEEDS WORK",
          incomplete:       "INCOMPLETE",
        };
        log(`Thesis quality:    ${qualityLabel[result.thesis_quality] ?? result.thesis_quality}`);
        await pause(60);
        log(`─────────────────────────────────────────────`);

        // Business
        await pause(60);
        log(`Business Franchise:`);
        await pause(40);
        log(`  Moat:            ${result.business_franchise?.moat_strength ?? "?"}`);
        await pause(40);
        log(`  Durability:      ${result.business_franchise?.durability ?? "?"}`);
        await pause(40);
        log(`  Value creation:  ${result.business_franchise?.value_creation_mechanism ?? "?"}`);

        // Management
        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Management Quality:`);
        await pause(40);
        log(`  Capital alloc:   ${result.management_quality?.capital_allocation_verdict ?? "?"}`);
        await pause(40);
        log(`  Leadership:      ${result.management_quality?.leadership_assessment ?? "?"}`);

        // Financial Signposts
        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Financial Signposts:`);
        await pause(40);
        log(`  Gross margin stability: ${result.financial_signposts?.gross_margin_stability?.score ?? "?"}`);
        await pause(40);
        log(`  Negative working cap:   ${result.financial_signposts?.negative_working_capital?.present === true ? "YES" : result.financial_signposts?.negative_working_capital?.present === false ? "NO" : "UNKNOWN"}`);
        await pause(40);
        log(`  LT capital allocation:  ${result.financial_signposts?.long_term_capital_allocation?.verdict ?? "?"}`);
        await pause(40);
        log(`  ST capital allocation:  ${result.financial_signposts?.short_term_capital_allocation?.consistency ?? "?"}`);

        // Value Expectations
        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Value Expectations:`);
        await pause(40);
        log(`  Value driver:    ${result.value_expectations?.value_driver?.toUpperCase() ?? "?"}`);
        await pause(40);
        log(`  Stage 1 (1-2Y):  ${result.value_expectations?.stage1_consensus ?? "?"}`);
        await pause(40);
        log(`  Stage 3 terminal:`);
        await pause(30);
        log(`    Growth:        ${result.value_expectations?.stage3_terminal?.long_term_growth ?? "?"}`);
        await pause(30);
        log(`    Profitability: ${result.value_expectations?.stage3_terminal?.long_term_profitability ?? "?"}`);
        await pause(30);
        log(`    Fair multiple: ${result.value_expectations?.stage3_terminal?.implied_multiple ?? "?"}`);
        await pause(40);
        log(`  Return expect.:  ${result.value_expectations?.return_expectation ?? "?"}`);

        // Turd Blossom
        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Turd Blossom:      ${result.turd_blossom?.is_turd_blossom ? "YES — early shoots detected" : "NO — not a turnaround story"}`);
        if (result.turd_blossom?.is_turd_blossom && result.turd_blossom?.early_shoots?.length) {
          for (const shoot of result.turd_blossom.early_shoots) {
            await pause(40);
            log(`  · ${shoot}`);
          }
        }

        send({ type: "done", result });

      } catch (err) {
        const raw = String(err);
        const isNetwork =
          raw.includes("network") ||
          raw.includes("fetch") ||
          raw.includes("ECONNRESET") ||
          raw.includes("ETIMEDOUT");
        const message = isNetwork
          ? "OpenRouter connection failed. This is usually transient — try again."
          : raw;
        send({ type: "error", error: message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
    },
  });
}

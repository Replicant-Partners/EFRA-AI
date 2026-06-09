import { runGorilla } from "@/src/agents/10-gorilla/index";
import { buildLLM } from "@/src/configurator";
import type { GorillaInput } from "@/src/shared/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json() as GorillaInput;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const log  = (msg: string)  => send({ type: "log", msg });
      const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

      try {
        const llm = buildLLM();

        const ticker = body.ticker?.toUpperCase().trim() || "UNKNOWN";

        log(`Evaluating ${ticker} through the Value Gorilla framework…`);
        await pause(600);
        log(`Dimension 1/4 · Obvious Problem — is this a large known structural issue?`);

        let abortWaiting = false;
        (async () => {
          const steps = [
            { delay: 3000, msg: `Dimension 2/4 · Invisible Gorilla — why can't the market see it?` },
            { delay: 3500, msg: `Dimension 3/4 · Combinatorial — identifying existing tech being assembled…` },
            { delay: 3500, msg: `Dimension 4/4 · Choke Point — locating position in the value chain…` },
            { delay: 4000, msg: `Scoring dimensions and computing gorilla_total…` },
          ];
          for (const { delay, msg } of steps) {
            await pause(delay);
            if (abortWaiting) break;
            log(msg);
          }
        })();

        const result = await runGorilla(llm, body);
        abortWaiting = true;

        // ── Stream result summary ──────────────────────────────────────────
        await pause(80);
        log(`─────────────────────────────────────────────`);
        await pause(60);

        const verdictLabel =
          result.gorilla_verdict === "GORILLA"
            ? "GORILLA ✓"
            : result.gorilla_verdict === "SMALL_ANIMAL"
            ? "SMALL ANIMAL"
            : "PEDESTRIAN";

        log(`Verdict:          ${verdictLabel}`);
        await pause(60);
        log(`Gorilla total:    ${result.gorilla_total}/100`);
        await pause(60);
        log(`─────────────────────────────────────────────`);
        await pause(60);
        log(`Obvious Problem:  ${result.obvious_problem.score}/100`);
        await pause(40);
        log(`  → ${result.obvious_problem.assessment}`);
        await pause(60);
        log(`Invisible Gorilla: ${result.invisible_gorilla.score}/100`);
        await pause(40);
        log(`  Why invisible: ${result.invisible_gorilla.why_invisible}`);
        await pause(40);
        log(`  Market assumption: ${result.invisible_gorilla.market_assumption}`);
        await pause(60);
        log(`Combinatorial:    ${result.combinatorial.score}/100`);
        await pause(40);
        log(`  New combination: ${result.combinatorial.new_combination}`);
        await pause(60);
        log(`Choke Point:      ${result.choke_point.score}/100`);
        await pause(40);
        log(`  Chain: ${result.choke_point.value_chain}`);
        await pause(40);
        log(`  Position: ${result.choke_point.position}`);
        await pause(60);
        log(`─────────────────────────────────────────────`);
        await pause(40);
        log(`Valuation consistent: ${result.valuation_gap.consistent ? "YES" : "NO"}`);
        await pause(40);
        log(`  ${result.valuation_gap.current_pricing}`);

        if (result.key_questions?.length) {
          await pause(80);
          log(`─────────────────────────────────────────────`);
          log(`Key questions:`);
          for (const q of result.key_questions) {
            await pause(40);
            log(`  · ${q}`);
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

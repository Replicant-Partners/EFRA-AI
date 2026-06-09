import { runImagine } from "@/src/agents/11-imagine/index";
import { buildLLM } from "@/src/configurator";
import type { ImagineInput } from "@/src/shared/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json() as ImagineInput;

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

        log(`Imagining the future of ${ticker}…`);
        await pause(600);
        log(`Part A · Digital transformation stage — where is this business on model→source?`);

        let abortWaiting = false;
        (async () => {
          const steps = [
            { delay: 3000, msg: `Part B · Growth driver — innovation vs demographic forces…` },
            { delay: 3500, msg: `Part C · Long-range scenarios — projecting 5Y / 10Y / 20Y worlds…` },
            { delay: 4500, msg: `Part D · What's not on the page / not in the price…` },
            { delay: 4000, msg: `Part E · Building falsifiable predictions…` },
          ];
          for (const { delay, msg } of steps) {
            await pause(delay);
            if (abortWaiting) break;
            log(msg);
          }
        })();

        const result = await runImagine(llm, body);
        abortWaiting = true;

        // ── Stream result summary ──────────────────────────────────────────
        await pause(80);
        log(`─────────────────────────────────────────────`);

        const stageLabel: Record<string, string> = {
          model:  "MODEL  — digital version exists, physical world still decides",
          shadow: "SHADOW — live sync, physical-first decisions",
          twin:   "TWIN   — digital is authoritative, physical follows",
          source: "SOURCE — digital IS the product",
        };
        log(`Digital stage:    ${stageLabel[result.digital_stage] ?? result.digital_stage}`);
        await pause(60);
        log(`  ${result.digital_stage_rationale}`);

        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Growth driver:    ${result.growth_driver.toUpperCase()}`);
        await pause(40);
        log(`  ${result.growth_driver_rationale}`);

        await pause(80);
        log(`─────────────────────────────────────────────`);
        log(`Long-range scenarios:`);
        for (const s of result.scenarios ?? []) {
          await pause(60);
          log(`  ${s.horizon.toUpperCase()} (${(s.probability * 100).toFixed(0)}%):`);
          await pause(30);
          log(`    World:   ${s.world}`);
          await pause(30);
          log(`    Company: ${s.company}`);
          await pause(30);
          log(`    Force:   ${s.key_force}`);
        }

        if (result.not_on_the_page?.length) {
          await pause(80);
          log(`─────────────────────────────────────────────`);
          log(`Not on the page (${result.not_on_the_page.length} items):`);
          for (const item of result.not_on_the_page) {
            await pause(40);
            log(`  · ${item}`);
          }
        }

        if (result.not_in_the_price?.length) {
          await pause(80);
          log(`─────────────────────────────────────────────`);
          log(`Not in the price (${result.not_in_the_price.length} items):`);
          for (const item of result.not_in_the_price) {
            await pause(40);
            log(`  · ${item}`);
          }
        }

        if (result.predictions?.length) {
          await pause(80);
          log(`─────────────────────────────────────────────`);
          log(`Falsifiable predictions (${result.predictions.length}):`);
          for (const p of result.predictions) {
            await pause(50);
            log(`  [${p.horizon} · ${(p.confidence * 100).toFixed(0)}%] ${p.prediction}`);
            await pause(30);
            log(`    Test: ${p.test}`);
          }
        }

        await pause(60);
        log(`─────────────────────────────────────────────`);
        log(`Imagination confidence: ${(result.imagination_confidence * 100).toFixed(0)}%`);

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

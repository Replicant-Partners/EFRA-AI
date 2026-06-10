import { buildLLM } from "@/src/configurator";
import { runCompany } from "@/src/agents/13-company/index";
import { fetchEdgarFacts, fetchEdgarFilings } from "@/src/agents/research-chat/index";
import type { CompanyInput, CompanyBoard } from "@/src/shared/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json() as CompanyInput;
  const { ticker, company_name, analyst_note } = body;

  if (!ticker?.trim()) {
    return new Response(
      JSON.stringify({ error: "ticker is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const llm         = buildLLM();
        const tickerUpper = ticker.toUpperCase().trim();

        // ── Fetch EDGAR data in parallel ──────────────────────────────────────
        send({ type: "log", msg: `Fetching SEC EDGAR data for ${tickerUpper}…` });

        const [edgarFacts, edgarSources] = await Promise.all([
          fetchEdgarFacts(tickerUpper),
          fetchEdgarFilings(tickerUpper),
        ]);

        if (edgarFacts) {
          send({ type: "log", msg: `EDGAR data loaded — ${edgarFacts.split("\n").length} financial metrics` });
        } else {
          send({ type: "log", msg: `EDGAR data unavailable — proceeding with model knowledge` });
        }

        if (edgarSources.length > 0) {
          send({ type: "sources", sources: edgarSources });
        }

        // ── Log analysis steps ─────────────────────────────────────────────────
        const logSteps = [
          { delay: 800,  msg: `Part 1/7 · Self-View — how ${tickerUpper} sees itself…` },
          { delay: 4000, msg: `Part 2/7 · Business Franchise — 8-step analysis…` },
          { delay: 4000, msg: `Part 3/7 · Owner Operator — agency risk & capital allocation…` },
          { delay: 4000, msg: `Part 4/7 · Invisible Layer — what isn't on the page…` },
          { delay: 3000, msg: `Part 5/7 · Turd Blossom — market expectation assessment…` },
          { delay: 3000, msg: `Part 6/7 · Value Gorilla elevator pitch…` },
          { delay: 3000, msg: `Part 7/7 · Investment Thesis Statement — durable & timeless…` },
        ];

        let abortLog = false;
        (async () => {
          for (const step of logSteps) {
            await new Promise(r => setTimeout(r, step.delay));
            if (abortLog) break;
            send({ type: "log", msg: step.msg });
          }
        })();

        // ── Run the agent ──────────────────────────────────────────────────────
        const result: CompanyBoard = await runCompany(llm, {
          ticker:       tickerUpper,
          company_name: company_name ?? undefined,
          analyst_note: analyst_note ?? undefined,
          edgar_facts:  edgarFacts   || undefined,
        });

        abortLog = true;

        // ── Stream result summary as logs ──────────────────────────────────────
        await new Promise(r => setTimeout(r, 80));
        send({ type: "log", msg: `─────────────────────────────────────────────` });
        await new Promise(r => setTimeout(r, 60));
        send({ type: "log", msg: `Moat:         ${result.franchise.moat_depth} · ${result.franchise.moat_source} · durability: ${result.franchise.moat_durability}` });
        await new Promise(r => setTimeout(r, 40));
        send({ type: "log", msg: `Model:        ${result.franchise.business_model_type}` });
        await new Promise(r => setTimeout(r, 40));
        send({ type: "log", msg: `Agency risk:  ${result.owner_operator.agency_risk}` });
        await new Promise(r => setTimeout(r, 40));
        send({ type: "log", msg: `Turd blossom: ${result.turd_blossom.is_turd_blossom ? "YES" : "NO"}` });
        await new Promise(r => setTimeout(r, 40));
        send({ type: "log", msg: `Gorilla:      ${result.gorilla_elevator.is_gorilla_candidate ? "CANDIDATE" : "NOT A GORILLA"}` });
        await new Promise(r => setTimeout(r, 40));
        send({ type: "log", msg: `Thesis:       ${result.thesis_statement.thesis_quality.toUpperCase().replace("_", " ")}` });
        await new Promise(r => setTimeout(r, 60));
        send({ type: "log", msg: `─────────────────────────────────────────────` });

        if (result.analyst_questions?.length) {
          await new Promise(r => setTimeout(r, 40));
          send({ type: "log", msg: `Open questions:` });
          for (const q of result.analyst_questions) {
            await new Promise(r => setTimeout(r, 40));
            send({ type: "log", msg: `  · ${q}` });
          }
        }

        send({ type: "done", result });

      } catch (err) {
        const raw       = String(err);
        const isNetwork = raw.includes("network") || raw.includes("fetch") ||
                          raw.includes("ECONNRESET") || raw.includes("ETIMEDOUT");
        send({
          type:  "error",
          error: isNetwork ? "OpenRouter connection failed. Try again." : raw,
        });
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

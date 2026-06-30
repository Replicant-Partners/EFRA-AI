import { buildLLM } from "@/src/configurator";
import { runResearchPipeline, type ResearchPipelineInput } from "@/src/shared/research-pipeline";
import { fetchEdgarFacts, fetchEdgarFilings } from "@/src/agents/research-chat/index";

export const maxDuration = 600; // 10 minutes for full pipeline

export async function POST(request: Request) {
  const body = await request.json() as ResearchPipelineInput;
  const { ticker, company_name, analyst_note, analyst_id } = body;

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
        const llm = buildLLM();
        const tickerUpper = ticker.toUpperCase().trim();

        // ── Fetch EDGAR data ──────────────────────────────────────────────────
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

        // ── Run Research Pipeline ─────────────────────────────────────────────
        const pipelineInput: ResearchPipelineInput = {
          ticker: tickerUpper,
          company_name: company_name ?? undefined,
          analyst_note: analyst_note ?? undefined,
          analyst_id: analyst_id ?? "web_user",
          edgar_facts: edgarFacts || undefined,
        };

        const pipeline = runResearchPipeline(llm, pipelineInput);

        for await (const event of pipeline) {
          send(event);

          // If pipeline completed or errored, we're done
          if (event.type === "done" || event.type === "error") {
            break;
          }
        }

      } catch (err) {
        const raw = String(err);
        const isNetwork =
          raw.includes("network") ||
          raw.includes("fetch") ||
          raw.includes("ECONNRESET") ||
          raw.includes("ETIMEDOUT");
        send({
          type: "error",
          error: isNetwork ? "OpenRouter connection failed. Try again." : raw,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

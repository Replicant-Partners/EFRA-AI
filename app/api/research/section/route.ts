import { buildLLM } from "@/src/configurator";
import { runSection, fetchEdgarFacts, fetchEdgarFilings } from "@/src/agents/research-chat/index";
import type { SectionKey } from "@/src/agents/research-chat/index";
import type { ResearchDraftPatch } from "@/src/shared/types";

export const maxDuration = 120;

const PATCH_OPEN  = "<patch>";
const PATCH_CLOSE = "</patch>";

export async function POST(request: Request) {
  const body = await request.json() as {
    ticker:     string;
    sectionKey: SectionKey;
    userNote?:  string;
    draft:      ResearchDraftPatch;
    facts?:     string;   // cached EDGAR facts from client
  };

  const { ticker, sectionKey, userNote, draft } = body;

  if (!ticker?.trim() || !sectionKey) {
    return new Response(
      JSON.stringify({ error: "ticker and sectionKey are required" }),
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

        // Fetch EDGAR data (use cached facts if provided, else fetch fresh)
        const [facts, sources] = await Promise.all([
          body.facts ? Promise.resolve(body.facts) : fetchEdgarFacts(tickerUpper),
          fetchEdgarFilings(tickerUpper),
        ]);

        // Send sources immediately
        if (sources.length > 0) {
          send({ type: "sources", sources });
        }

        const generator = runSection(llm, {
          ticker:     tickerUpper,
          sectionKey,
          facts,
          userNote,
          priorDraft: draft,
        });

        // Token filter: suppress <patch>…</patch> from stream
        let buffer  = "";
        let inPatch = false;

        function processChunk(raw: string) {
          buffer += raw;
          while (buffer.length > 0) {
            if (inPatch) {
              const closeIdx = buffer.indexOf(PATCH_CLOSE);
              if (closeIdx !== -1) {
                inPatch = false;
                buffer  = buffer.slice(closeIdx + PATCH_CLOSE.length);
              } else {
                if (buffer.length > PATCH_CLOSE.length * 2) {
                  buffer = buffer.slice(buffer.length - PATCH_CLOSE.length);
                }
                break;
              }
            } else {
              const openIdx = buffer.indexOf(PATCH_OPEN);
              if (openIdx !== -1) {
                const visible = buffer.slice(0, openIdx);
                if (visible) send({ type: "token", token: visible });
                inPatch = true;
                buffer  = buffer.slice(openIdx + PATCH_OPEN.length);
              } else {
                const safeLen = Math.max(0, buffer.length - (PATCH_OPEN.length - 1));
                if (safeLen > 0) {
                  send({ type: "token", token: buffer.slice(0, safeLen) });
                  buffer = buffer.slice(safeLen);
                }
                break;
              }
            }
          }
        }

        while (true) {
          const { value, done } = await generator.next();

          if (done) {
            // Flush remaining visible buffer
            if (!inPatch && buffer.length > 0) {
              send({ type: "token", token: buffer });
              buffer = "";
            }
            const result = value as { content: string; question: string; patch: ResearchDraftPatch; sources: unknown[] };
            send({ type: "patch",    patch:    result.patch });
            send({ type: "question", question: result.question });
            send({ type: "done" });
            break;
          }

          processChunk(value as string);
        }

      } catch (err) {
        const raw       = String(err);
        const isNetwork = raw.includes("network") || raw.includes("fetch") ||
                          raw.includes("ECONNRESET") || raw.includes("ETIMEDOUT");
        send({ type: "error", error: isNetwork ? "Connection error — please try again." : raw });
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

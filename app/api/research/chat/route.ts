import { buildLLM } from "@/src/configurator";
import { runChatTurn, runOpeningMessage } from "@/src/agents/research-chat/index";
import type { ResearchChatRequest } from "@/src/shared/types";

export const maxDuration = 120;

const PATCH_OPEN  = "<draft_patch>";
const PATCH_CLOSE = "</draft_patch>";

export async function POST(request: Request) {
  const body = await request.json() as ResearchChatRequest & { opening?: boolean };
  const { ticker, messages, draft, opening } = body;

  if (!ticker?.trim()) {
    return new Response(
      JSON.stringify({ error: "ticker is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const llm        = buildLLM();
        const tickerUpper = ticker.toUpperCase().trim();

        const generator = opening
          ? runOpeningMessage(llm, tickerUpper)
          : runChatTurn(llm, { ticker: tickerUpper, messages, draft });

        /**
         * Token filter: buffer incoming tokens and suppress everything inside
         * <draft_patch>…</draft_patch>. We maintain a look-ahead buffer
         * (max = length of the open tag) to detect the tag boundary cleanly
         * even when it spans multiple token chunks.
         */
        let buffer    = "";   // look-ahead buffer
        let inPatch   = false;

        function flushVisible(chunk: string) {
          // Called with chunks that are definitely outside a patch block
          if (chunk) send({ type: "token", token: chunk });
        }

        function processChunk(raw: string) {
          buffer += raw;

          while (buffer.length > 0) {
            if (inPatch) {
              // Looking for closing tag
              const closeIdx = buffer.indexOf(PATCH_CLOSE);
              if (closeIdx !== -1) {
                inPatch = false;
                buffer  = buffer.slice(closeIdx + PATCH_CLOSE.length);
              } else {
                // Keep buffer in case close tag spans next chunk
                if (buffer.length > PATCH_CLOSE.length * 2) {
                  buffer = buffer.slice(buffer.length - PATCH_CLOSE.length);
                }
                break;
              }
            } else {
              // Looking for opening tag
              const openIdx = buffer.indexOf(PATCH_OPEN);
              if (openIdx !== -1) {
                // Flush everything before the open tag
                flushVisible(buffer.slice(0, openIdx));
                inPatch = true;
                buffer  = buffer.slice(openIdx + PATCH_OPEN.length);
              } else {
                // Safe to flush all but the last (tagLen-1) chars
                // (in case the tag starts at the end of the buffer)
                const safeLen = Math.max(0, buffer.length - (PATCH_OPEN.length - 1));
                if (safeLen > 0) {
                  flushVisible(buffer.slice(0, safeLen));
                  buffer = buffer.slice(safeLen);
                }
                break;
              }
            }
          }
        }

        while (true) {
          const { value: token, done } = await generator.next();

          if (done) {
            // Flush any remaining visible buffer
            if (!inPatch && buffer.length > 0) {
              flushVisible(buffer);
              buffer = "";
            }

            // Final return value from the generator
            const output = token as {
              content: string;
              sources: unknown[];
              patch:   unknown;
            } | undefined;

            if (output) {
              if (output.sources && (output.sources as unknown[]).length > 0) {
                send({ type: "sources", sources: output.sources });
              }
              send({ type: "draft_patch", patch: output.patch });
            }
            send({ type: "done" });
            break;
          }

          processChunk(token as string);
        }

      } catch (err) {
        const raw = String(err);
        const isNetwork =
          raw.includes("network") ||
          raw.includes("fetch") ||
          raw.includes("ECONNRESET") ||
          raw.includes("ETIMEDOUT");
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

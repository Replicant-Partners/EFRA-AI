import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { runCatalog } from "@/src/agents/07-catalog/index.js";
import type { PipelineState } from "@/src/shared/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = await prisma.intelItem.findMany({
      where:   { analysis_id: id },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/analyses/[id]/intel]", err);
    return NextResponse.json({ error: "Failed to fetch intel items" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await request.json() as { content: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const analysis = await prisma.analysis.findUnique({
      where:  { id },
      select: { full_state: true, ticker: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Create item immediately (uncatalogued)
    const item = await prisma.intelItem.create({
      data: { analysis_id: id, content },
    });

    // Fire catalog agent async — respond immediately, fill in fields when done
    const state = analysis.full_state as unknown as PipelineState;
    const businessContext = state.intel?.business_context?.executive_summary ?? "";

    runCatalog({
      ticker:             analysis.ticker,
      intel_item_content: content,
      business_context:   businessContext,
    })
    .then(async (cat) => {
      await prisma.intelItem.update({
        where: { id: item.id },
        data: {
          impact_area: cat.impact_area,
          sector:      cat.sector,
          severity:    cat.severity,
          summary:     cat.summary,
        },
      });
    })
    .catch((err) => {
      console.error("[Catalog async error]", err);
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/analyses/[id]/intel]", err);
    return NextResponse.json({ error: "Failed to create intel item" }, { status: 500 });
  }
}

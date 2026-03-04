import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { PipelineState } from "@/src/shared/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      ticker:     string;
      analyst_id: string;
      catalyst:   string;
      mode:       string;
      state:      PipelineState;
    };

    const { ticker, analyst_id, catalyst, mode, state } = body;

    const rating  = state.valuation?.rating  ?? null;
    const pt_12m  = state.valuation?.pt_12m  ?? null;
    const sector  = state.intel?.business_context?.moat_type ?? null;

    const analysis = await prisma.analysis.create({
      data: {
        ticker:     ticker.toUpperCase(),
        analyst_id,
        catalyst,
        mode,
        status:     state.status,
        full_state: state as object,
        rating,
        pt_12m,
        sector,
      },
    });

    return NextResponse.json({ id: analysis.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/analyses]", err);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker") ?? undefined;
    const rating = searchParams.get("rating") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit  = Math.min(Number(searchParams.get("limit")  ?? "30"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");

    const where: Record<string, unknown> = {};
    if (ticker) where.ticker = ticker.toUpperCase();
    if (rating) where.rating = rating;
    if (status) where.status = status;

    const [analyses, total] = await prisma.$transaction([
      prisma.analysis.findMany({
        where,
        select: {
          id:         true,
          ticker:     true,
          analyst_id: true,
          catalyst:   true,
          mode:       true,
          status:     true,
          rating:     true,
          pt_12m:     true,
          sector:     true,
          created_at: true,
          _count:     { select: { intel_items: true } },
        },
        orderBy: { created_at: "desc" },
        take:    limit,
        skip:    offset,
      }),
      prisma.analysis.count({ where }),
    ]);

    return NextResponse.json({ analyses, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/analyses]", err);
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }
}

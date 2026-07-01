import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { CompanyBoard, GorillaBoard, ImagineBoard, ThesisBoard } from "@/src/shared/types";

interface ResearchState {
  company?: CompanyBoard;
  gorilla?: GorillaBoard;
  imagine?: ImagineBoard;
  thesis?:  ThesisBoard;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      ticker:     string;
      analyst_id: string;
      state:      ResearchState;
    };

    const { ticker, analyst_id, state } = body;
    const { company, gorilla, imagine, thesis } = state;

    const research = await prisma.researchAnalysis.create({
      data: {
        ticker:      ticker.toUpperCase(),
        analyst_id,
        // Denormalized fields
        moat_source:            company?.franchise?.moat_source              ?? null,
        moat_depth:             company?.franchise?.moat_depth               ?? null,
        trust_score:            company?.owner_operator?.mgmt_trust_score    ?? null,
        thesis_quality:         thesis?.thesis_quality                        ?? null,
        gorilla_verdict:        gorilla?.gorilla_verdict                      ?? null,
        gorilla_total:          gorilla?.gorilla_total                        ?? null,
        digital_stage:          imagine?.digital_stage                        ?? null,
        growth_driver:          imagine?.growth_driver                        ?? null,
        imagination_confidence: imagine?.imagination_confidence               ?? null,
        // Full state
        full_state: state as object,
      },
    });

    return NextResponse.json({ id: research.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/research]", err);
    return NextResponse.json({ error: "Failed to save research" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker         = searchParams.get("ticker")          ?? undefined;
    const gorilla_verdict = searchParams.get("gorilla_verdict") ?? undefined;
    const thesis_quality  = searchParams.get("thesis_quality")  ?? undefined;
    const limit  = Math.min(Number(searchParams.get("limit")  ?? "30"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");

    const where: Record<string, unknown> = {};
    if (ticker)          where.ticker          = ticker.toUpperCase();
    if (gorilla_verdict) where.gorilla_verdict = gorilla_verdict;
    if (thesis_quality)  where.thesis_quality  = thesis_quality;

    const [researches, total] = await prisma.$transaction([
      prisma.researchAnalysis.findMany({
        where,
        select: {
          id:                    true,
          ticker:                true,
          analyst_id:            true,
          moat_source:           true,
          moat_depth:            true,
          trust_score:           true,
          thesis_quality:        true,
          gorilla_verdict:       true,
          gorilla_total:         true,
          digital_stage:         true,
          growth_driver:         true,
          imagination_confidence: true,
          created_at:            true,
        },
        orderBy: { created_at: "desc" },
        take:    limit,
        skip:    offset,
      }),
      prisma.researchAnalysis.count({ where }),
    ]);

    return NextResponse.json({ researches, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/research]", err);
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}

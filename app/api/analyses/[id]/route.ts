import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = await prisma.analysis.findUnique({
      where:   { id },
      include: { intel_items: { orderBy: { created_at: "asc" } } },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[GET /api/analyses/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch analysis" }, { status: 500 });
  }
}

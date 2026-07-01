import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const research = await prisma.researchAnalysis.findUnique({ where: { id } });
    if (!research) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(research);
  } catch (err) {
    console.error("[GET /api/research/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}

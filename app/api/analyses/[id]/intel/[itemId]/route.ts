import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const { include_in_report } = await request.json() as {
      include_in_report: boolean;
    };

    const item = await prisma.intelItem.update({
      where: { id: itemId, analysis_id: id },
      data:  { include_in_report },
    });

    return NextResponse.json(item);
  } catch (err) {
    console.error("[PATCH /api/analyses/[id]/intel/[itemId]]", err);
    return NextResponse.json({ error: "Failed to update intel item" }, { status: 500 });
  }
}

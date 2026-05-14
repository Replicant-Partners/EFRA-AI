/**
 * POST /api/observatory/scan
 *
 * On-demand trigger for the Background Worker.
 * Analogous to the "Trigger Scan" button in the Observatory UI (§4.2).
 *
 * Body: { analyst_id: string }
 * Returns: { ok: true, analyst_id, message }
 *
 * The scan runs async — the response returns immediately and the worker
 * runs in the background (non-blocking).
 */

import { NextResponse } from "next/server";
import { scanAnalyst } from "@/src/lib/background-worker";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { analyst_id?: string };
    const analyst_id = body.analyst_id?.trim();

    if (!analyst_id) {
      return NextResponse.json({ error: "analyst_id is required" }, { status: 400 });
    }

    // Non-blocking: fire and forget
    void scanAnalyst(analyst_id).catch(err => {
      console.warn(`[ScanRoute] Background scan failed for ${analyst_id}:`, err);
    });

    return NextResponse.json({
      ok:          true,
      analyst_id,
      message:     `Background scan triggered for analyst ${analyst_id}. Results will appear shortly.`,
    });
  } catch (err) {
    console.error("[POST /api/observatory/scan]", err);
    return NextResponse.json({ error: "Failed to trigger scan" }, { status: 500 });
  }
}

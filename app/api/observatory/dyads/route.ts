/**
 * GET /api/observatory/dyads
 *
 * Returns all Dyad records with their recent DyadEntry history.
 * Used by the Observatory "Dyads" tab to show relational dynamics.
 *
 * Optional query params:
 *   analyst_id — filter by analyst
 *   ticker     — filter by ticker
 *   ruptures   — "true" to show only dyads with ruptures
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DyadSummary {
  id:               string;
  analyst_id:       string;
  ticker:           string;

  // Current EWMA state
  rapport:          number;
  trust:            number;
  reciprocity:      number;

  // Counters
  episode_count:    number;
  buy_count:        number;
  hold_count:       number;
  sell_count:       number;
  correction_count: number;
  modes_used:       string[];

  // Last analysis
  last_rating:      string | null;
  last_overall:     number | null;
  last_analysis_id: string | null;

  // Ruptures
  rupture_count:    number;
  last_rupture_at:  string | null;

  // Time-series (last 10 entries, oldest-first)
  entries: Array<{
    rapport:       number;
    trust:         number;
    reciprocity:   number;
    overall_score: number | null;
    rating:        string | null;
    mode:          string | null;
    rupture:       boolean;
    rupture_kind:  string | null;
    created_at:    string;
  }>;

  created_at: string;
  updated_at: string;
}

export interface DyadsData {
  dyads:          DyadSummary[];
  total:          number;
  rupture_count:  number;
  analysts:       string[];
  tickers:        string[];
  generated_at:   string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analyst_id  = searchParams.get("analyst_id") ?? undefined;
    const ticker      = searchParams.get("ticker")?.toUpperCase() ?? undefined;
    const only_ruptures = searchParams.get("ruptures") === "true";

    const where: Record<string, unknown> = {};
    if (analyst_id)    where.analyst_id    = analyst_id;
    if (ticker)        where.ticker        = ticker;
    if (only_ruptures) where.rupture_count = { gt: 0 };

    const raw = await prisma.dyad.findMany({
      where,
      orderBy: [{ rupture_count: "desc" }, { updated_at: "desc" }],
      take:    200,
      include: {
        entries: {
          orderBy: { created_at: "asc" },
          take:    10,
          select: {
            rapport:       true,
            trust:         true,
            reciprocity:   true,
            overall_score: true,
            rating:        true,
            mode:          true,
            rupture:       true,
            rupture_kind:  true,
            created_at:    true,
          },
        },
      },
    });

    const dyads: DyadSummary[] = raw.map(d => ({
      id:               d.id,
      analyst_id:       d.analyst_id,
      ticker:           d.ticker,
      rapport:          d.rapport,
      trust:            d.trust,
      reciprocity:      d.reciprocity,
      episode_count:    d.episode_count,
      buy_count:        d.buy_count,
      hold_count:       d.hold_count,
      sell_count:       d.sell_count,
      correction_count: d.correction_count,
      modes_used:       d.modes_used,
      last_rating:      d.last_rating,
      last_overall:     d.last_overall,
      last_analysis_id: d.last_analysis_id,
      rupture_count:    d.rupture_count,
      last_rupture_at:  d.last_rupture_at?.toISOString() ?? null,
      entries:          d.entries.map(e => ({
        rapport:       e.rapport,
        trust:         e.trust,
        reciprocity:   e.reciprocity,
        overall_score: e.overall_score,
        rating:        e.rating,
        mode:          e.mode,
        rupture:       e.rupture,
        rupture_kind:  e.rupture_kind,
        created_at:    e.created_at.toISOString(),
      })),
      created_at: d.created_at.toISOString(),
      updated_at: d.updated_at.toISOString(),
    }));

    const data: DyadsData = {
      dyads,
      total:         dyads.length,
      rupture_count: dyads.filter(d => d.rupture_count > 0).length,
      analysts:      Array.from(new Set(dyads.map(d => d.analyst_id))),
      tickers:       Array.from(new Set(dyads.map(d => d.ticker))),
      generated_at:  new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/observatory/dyads]", err);
    return NextResponse.json({ error: "Failed to fetch dyads" }, { status: 500 });
  }
}

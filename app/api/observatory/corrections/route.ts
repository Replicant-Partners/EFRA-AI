/**
 * GET /api/observatory/corrections
 *
 * Returns the audit trail of all human interventions:
 *   - EpisodeCorrection records with gate outcome
 *   - Linked SyntheticEpisode (the re-injected episode)
 *   - Original Episode context (ticker, agent, analyst)
 *   - AnomalyEvent that triggered the intervention
 *
 * Optional query params:
 *   analyst_id  — filter by analyst
 *   ticker      — filter by ticker
 *   limit       — max rows (default 50)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { countSyntheticEpisodes } from "@/src/lib/two-write-memory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorrectionRecord {
  id:                string;
  reviewer_id:       string;
  scope:             string;
  classification:    string;
  correction_text:   string;
  dimension:         string | null;
  gamma:             number;
  gate_verdict:      string;
  authority_weight:  number;
  tensions_count:    number;
  minimum_update_set:string[];
  created_at:        string;

  // Original episode context
  episode: {
    id:          string;
    agent:       string;
    analyst_id:  string;
    ticker:      string;
    analysis_id: string;
    provenance:  string;
  };

  // Anomaly that triggered the intervention
  anomaly: {
    id:       string;
    kind:     string;
    severity: string;
    ticker:   string;
  };

  // The re-injected synthetic episode
  synthetic_episode: {
    id:         string;
    created_at: string;
  } | null;
}

export interface CorrectionsData {
  corrections:            CorrectionRecord[];
  total:                  number;
  synthetic_episodes_total: number;
  analysts_with_corrections: string[];
  generated_at:           string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analyst_id = searchParams.get("analyst_id") ?? undefined;
    const ticker     = searchParams.get("ticker")?.toUpperCase() ?? undefined;
    const limit      = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

    const where: Record<string, unknown> = {};
    if (analyst_id) where.episode = { analyst_id };
    if (ticker)     where.episode = { ...(where.episode as object ?? {}), ticker };

    const raw = await prisma.episodeCorrection.findMany({
      where,
      include: {
        episode: {
          select: {
            id:          true,
            agent:       true,
            analyst_id:  true,
            ticker:      true,
            analysis_id: true,
            provenance:  true,
          },
        },
        anomaly_event: {
          select: {
            id:       true,
            kind:     true,
            severity: true,
            ticker:   true,
          },
        },
        synthetic_episode: {
          select: {
            id:         true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take:    limit,
    });

    const corrections: CorrectionRecord[] = raw.map(c => ({
      id:                c.id,
      reviewer_id:       c.reviewer_id,
      scope:             c.scope,
      classification:    c.classification,
      correction_text:   c.correction_text,
      dimension:         c.dimension,
      gamma:             c.gamma,
      gate_verdict:      c.gate_verdict,
      authority_weight:  c.authority_weight,
      tensions_count:    (c.tensions as unknown[]).length,
      minimum_update_set:(c.minimum_update_set as string[]),
      created_at:        c.created_at.toISOString(),
      episode: {
        id:          c.episode.id,
        agent:       c.episode.agent,
        analyst_id:  c.episode.analyst_id,
        ticker:      c.episode.ticker,
        analysis_id: c.episode.analysis_id,
        provenance:  c.episode.provenance,
      },
      anomaly: {
        id:       c.anomaly_event.id,
        kind:     c.anomaly_event.kind,
        severity: c.anomaly_event.severity,
        ticker:   c.anomaly_event.ticker,
      },
      synthetic_episode: c.synthetic_episode ? {
        id:         c.synthetic_episode.id,
        created_at: c.synthetic_episode.created_at.toISOString(),
      } : null,
    }));

    // Unique analysts who have made corrections
    const analysts_with_corrections = Array.from(
      new Set(corrections.map(c => c.episode.analyst_id))
    );

    // Count all synthetic episodes in Episode table
    const synthetic_episodes_total = analyst_id
      ? await countSyntheticEpisodes(analyst_id)
      : await prisma.episode.count({ where: { provenance: "synthetic" } });

    const data: CorrectionsData = {
      corrections,
      total:                    corrections.length,
      synthetic_episodes_total,
      analysts_with_corrections,
      generated_at:             new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/observatory/corrections]", err);
    return NextResponse.json({ error: "Failed to fetch corrections" }, { status: 500 });
  }
}

/**
 * Dyad Tracker — Social Tracker
 * Plane C · Longitudinal Observer
 *
 * A Dyad is a (analyst_id, ticker) pair. It tracks the relational dynamics
 * of an analyst's repeated engagement with a specific ticker over time.
 *
 * Three EWMA dimensions (alpha=0.3, range 0.0–1.0):
 *
 *   RAPPORT — rating consistency.
 *     Measures how stable the analyst's conviction is on this ticker.
 *     High rapport = consistent BUY/HOLD/SELL across analyses.
 *     Sudden flip (e.g. BUY → UNDERPERFORM) = rapport drop.
 *     Formula: rapport_new = EWMA(rapport_prev, rating_similarity_score)
 *     rating_similarity_score = 1.0 if same as last, 0.5 if adjacent, 0.0 if opposite
 *
 *   TRUST — quality of work on this ticker.
 *     Driven by the overall_score from the Evaluator Registry.
 *     High trust = consistently high-quality analysis on this ticker.
 *     Trust drop signals a quality rupture for this specific pair.
 *     Formula: trust_new = EWMA(trust_prev, overall_score)
 *
 *   RECIPROCITY — depth of engagement.
 *     Measures how much the analyst invests in this ticker specifically.
 *     Driven by: episode_count (more = higher), mode diversity (all 3 = 1.0),
 *     and presence of corrections on this ticker (corrections = deep engagement).
 *     Formula: reciprocity_new = EWMA(reciprocity_prev, engagement_score)
 *
 * RUPTURE detection:
 *   trust:   current_trust < prev_trust - 0.3  (sudden quality collapse)
 *   rapport: rating_similarity_score = 0.0 AND prev_rapport > 0.6 (conviction flip)
 *
 * Ruptures are flagged in DyadEntry and can trigger AnomalyEvent (kind="rupture").
 */

import { prisma } from "./prisma.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const EWMA_ALPHA            = 0.3;
const RUPTURE_TRUST_DELTA   = 0.30;   // trust drop that triggers rupture
const RUPTURE_RAPPORT_FLOOR = 0.60;   // prev rapport above which a flip is a rupture

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rating = "BUY" | "HOLD" | "UNDERPERFORM" | null;

export interface DyadUpdateInput {
  analyst_id:    string;
  ticker:        string;
  analysis_id:   string;
  overall_score: number | null;   // from EvalRun, null if pipeline dropped
  rating:        Rating;
  mode:          string;          // "valentine" | "gunn" | "dual"
  has_correction:boolean;         // did this analysis trigger a correction?
}

export interface DyadState {
  rapport:     number;
  trust:       number;
  reciprocity: number;
}

export interface DyadUpdateResult {
  dyad_id:      string;
  entry_id:     string;
  state:        DyadState;
  rupture:      boolean;
  rupture_kind: string | null;
  is_new:       boolean;
}

// ─── Rating similarity ────────────────────────────────────────────────────────

const RATING_RANK: Record<string, number> = {
  BUY:          2,
  HOLD:         1,
  UNDERPERFORM: 0,
};

function ratingSimilarity(prev: Rating, current: Rating): number {
  if (!prev || !current) return 0.5;  // no comparison possible → neutral
  if (prev === current) return 1.0;
  const diff = Math.abs((RATING_RANK[prev] ?? 1) - (RATING_RANK[current] ?? 1));
  return diff === 1 ? 0.5 : 0.0;  // adjacent = 0.5, opposite = 0.0
}

// ─── EWMA update ─────────────────────────────────────────────────────────────

function ewma(prev: number, current: number): number {
  return Math.round((EWMA_ALPHA * current + (1 - EWMA_ALPHA) * prev) * 1000) / 1000;
}

// ─── Engagement score for reciprocity ────────────────────────────────────────

function engagementScore(
  episode_count: number,
  modes_used:    string[],
  mode:          string,
  has_correction:boolean,
): number {
  // episode_count component: asymptotically approaches 1 (log scale)
  const count_score = Math.min(1.0, Math.log10(episode_count + 1) / Math.log10(20));

  // mode diversity: 1/3 per unique mode
  const new_modes = new Set([...modes_used, mode]);
  const mode_score = new_modes.size / 3;

  // correction bonus: corrections signal deep engagement (0.1 boost)
  const correction_bonus = has_correction ? 0.1 : 0;

  return Math.min(1.0, count_score * 0.5 + mode_score * 0.4 + correction_bonus);
}

// ─── Main: update dyad ───────────────────────────────────────────────────────

export async function updateDyad(input: DyadUpdateInput): Promise<DyadUpdateResult> {
  const { analyst_id, ticker, analysis_id, overall_score, rating, mode, has_correction } = input;

  // Upsert the Dyad row
  const existing = await prisma.dyad.findUnique({
    where: { analyst_id_ticker: { analyst_id, ticker: ticker.toUpperCase() } },
  });

  const is_new = !existing;

  // Previous state (or defaults for first analysis)
  const prev_rapport     = existing?.rapport     ?? 0.5;
  const prev_trust       = existing?.trust       ?? 0.5;
  const prev_reciprocity = existing?.reciprocity ?? 0.5;
  const prev_rating      = (existing?.last_rating as Rating) ?? null;
  const prev_episode_count = existing?.episode_count ?? 0;
  const prev_modes_used  = existing?.modes_used  ?? [];

  const new_episode_count = prev_episode_count + 1;

  // ── Compute new dimension values ───────────────────────────────────────────

  // Rapport: rating consistency
  const rating_sim  = ratingSimilarity(prev_rating, rating);
  const new_rapport = is_new ? 0.5 : ewma(prev_rapport, rating_sim);

  // Trust: analysis quality
  const trust_input = overall_score ?? prev_trust;  // fallback to prev if no score
  const new_trust   = is_new ? (overall_score ?? 0.5) : ewma(prev_trust, trust_input);

  // Reciprocity: depth of engagement
  const engagement  = engagementScore(new_episode_count, prev_modes_used, mode, has_correction);
  const new_reciprocity = is_new ? engagement : ewma(prev_reciprocity, engagement);

  // ── Rupture detection ──────────────────────────────────────────────────────

  let rupture      = false;
  let rupture_kind: string | null = null;

  if (!is_new) {
    // Trust rupture: sudden quality collapse
    if (overall_score !== null && (prev_trust - new_trust) > RUPTURE_TRUST_DELTA) {
      rupture      = true;
      rupture_kind = "trust";
    }
    // Rapport rupture: conviction flip from high-rapport state
    if (!rupture && rating_sim === 0.0 && prev_rapport > RUPTURE_RAPPORT_FLOOR) {
      rupture      = true;
      rupture_kind = "rapport";
    }
  }

  // ── Update rating counts ───────────────────────────────────────────────────

  const buy_inc  = rating === "BUY"          ? 1 : 0;
  const hold_inc = rating === "HOLD"         ? 1 : 0;
  const sell_inc = rating === "UNDERPERFORM" ? 1 : 0;
  const corr_inc = has_correction            ? 1 : 0;

  const new_modes = Array.from(new Set([...prev_modes_used, mode]));

  // ── Upsert Dyad ───────────────────────────────────────────────────────────

  const dyad = await prisma.dyad.upsert({
    where:  { analyst_id_ticker: { analyst_id, ticker: ticker.toUpperCase() } },
    create: {
      analyst_id,
      ticker:           ticker.toUpperCase(),
      rapport:          new_rapport,
      trust:            new_trust,
      reciprocity:      new_reciprocity,
      episode_count:    1,
      buy_count:        buy_inc,
      hold_count:       hold_inc,
      sell_count:       sell_inc,
      correction_count: corr_inc,
      modes_used:       new_modes,
      last_rating:      rating,
      last_overall:     overall_score,
      last_analysis_id: analysis_id,
      rupture_count:    rupture ? 1 : 0,
      last_rupture_at:  rupture ? new Date() : null,
    },
    update: {
      rapport:          new_rapport,
      trust:            new_trust,
      reciprocity:      new_reciprocity,
      episode_count:    { increment: 1 },
      buy_count:        { increment: buy_inc },
      hold_count:       { increment: hold_inc },
      sell_count:       { increment: sell_inc },
      correction_count: { increment: corr_inc },
      modes_used:       new_modes,
      last_rating:      rating,
      last_overall:     overall_score,
      last_analysis_id: analysis_id,
      rupture_count:    rupture ? { increment: 1 } : undefined,
      last_rupture_at:  rupture ? new Date() : undefined,
    },
    select: { id: true },
  });

  // ── Write DyadEntry (time-series snapshot) ────────────────────────────────

  const entry = await prisma.dyadEntry.create({
    data: {
      dyad_id:       dyad.id,
      analysis_id,
      rapport:       new_rapport,
      trust:         new_trust,
      reciprocity:   new_reciprocity,
      overall_score: overall_score ?? null,
      rating:        rating ?? null,
      mode,
      rupture,
      rupture_kind:  rupture_kind ?? null,
    },
    select: { id: true },
  });

  if (rupture) {
    console.log(
      `[DyadTracker] RUPTURE — analyst: ${analyst_id} | ticker: ${ticker} | ` +
      `kind: ${rupture_kind} | trust: ${prev_trust.toFixed(3)}→${new_trust.toFixed(3)}`
    );
  } else {
    console.log(
      `[DyadTracker] Updated — ${analyst_id}/${ticker} | ` +
      `R:${new_rapport.toFixed(2)} T:${new_trust.toFixed(2)} Rec:${new_reciprocity.toFixed(2)} | ` +
      `episodes: ${new_episode_count}`
    );
  }

  return {
    dyad_id:      dyad.id,
    entry_id:     entry.id,
    state:        { rapport: new_rapport, trust: new_trust, reciprocity: new_reciprocity },
    rupture,
    rupture_kind,
    is_new,
  };
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getDyad(analyst_id: string, ticker: string) {
  return prisma.dyad.findUnique({
    where:   { analyst_id_ticker: { analyst_id, ticker: ticker.toUpperCase() } },
    include: { entries: { orderBy: { created_at: "desc" }, take: 20 } },
  });
}

export async function getDyadsForAnalyst(analyst_id: string) {
  return prisma.dyad.findMany({
    where:   { analyst_id },
    orderBy: { updated_at: "desc" },
    include: { entries: { orderBy: { created_at: "desc" }, take: 5 } },
  });
}

export async function getAllDyads(limit = 100) {
  return prisma.dyad.findMany({
    orderBy: [{ rupture_count: "desc" }, { updated_at: "desc" }],
    take:    limit,
    include: { entries: { orderBy: { created_at: "desc" }, take: 3 } },
  });
}

export async function getDyadsWithRuptures() {
  return prisma.dyad.findMany({
    where:   { rupture_count: { gt: 0 } },
    orderBy: { last_rupture_at: "desc" },
    include: {
      entries: {
        where:   { rupture: true },
        orderBy: { created_at: "desc" },
        take:    3,
      },
    },
  });
}

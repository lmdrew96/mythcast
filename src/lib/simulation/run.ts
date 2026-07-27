// Simulation / Time Layer (spec Section 7, open implementation question #3).
// Pure decision logic for one generation of a run: whether a drift event
// fires and, if so, which one — kept framework-free so it's testable
// without Convex and shared between the "step one generation" and "run to
// completion" entry points in convex/simulation.ts.
//
// Manual injection always wins over procedural rolling for a given
// generation (spec: "both event types are structurally identical once
// injected" — the drift engine doesn't care which fired, but only one
// fires per generation, matching mutateMyth's "single dominant mutation
// per generation reads as real drift" design in myth/mutation.ts).

import { Rng, hashString } from "../rng";
import type { CultureProfile, DriftEvent, DriftEventType } from "../types";

/** Chance ANY procedural event fires in a quiet generation (no manual injection queued). Independent per generation — a starting heuristic, tuned later (spec Section 10 #3). */
const BASE_EVENT_CHANCE = 0.35;

/**
 * Threat-model bias, added on top of a uniform base-1 weight per type.
 * Reasoning mirrors myth/mutation.ts's event-to-operation bias table:
 * - rival-clans: war dominates.
 * - predators: framed like a natural threat, not a political one — disaster-leaning.
 * - natural-disaster-prone: disaster dominates outright, with some famine (a disaster-battered culture also goes hungry).
 * - colonizer-pressure: war and contact both elevated (the colonizer IS the contact).
 * - isolated: no one to fight or trade with — nothing is strongly elevated, disaster/famine lead by default.
 */
const THREAT_WEIGHTS: Record<CultureProfile["seed"]["threatModel"], Partial<Record<DriftEventType, number>>> = {
  "rival-clans": { war: 5 },
  predators: { disaster: 3, war: 1 },
  "natural-disaster-prone": { disaster: 5, famine: 2 },
  "colonizer-pressure": { war: 3, contact: 4 },
  isolated: { disaster: 1, famine: 1 },
};

/** Scarcity directly biases famine likelihood — spec's explicit example ("a famine-prone culture is more likely to procedurally roll a famine than a coastal abundant one"). */
const SCARCITY_FAMINE_BONUS: Record<CultureProfile["seed"]["resourceScarcity"], number> = {
  "famine-prone": 6,
  scarce: 3,
  moderate: 1,
  abundant: 0,
};

/** A culture that's already moving is more prone to migration events than a settled one. */
const SETTLEMENT_MIGRATION_BONUS: Record<CultureProfile["seed"]["settlementPattern"], number> = {
  nomadic: 3,
  "semi-nomadic": 2,
  "fixed-agrarian": 0,
  urban: 0,
};

export function proceduralEventRngSeed(runSeed: number, generation: number): number {
  return hashString(runSeed + ":roll:" + generation) >>> 0;
}

/** Deterministic per-myth, per-generation mutation seed for a simulation run — same run seed always reproduces the same drift, but different runs (or different founding myths) never collide. */
export function simulationMutationSeed(runSeed: number, foundingMythId: string, generation: number): number {
  return hashString(runSeed + ":mutate:" + foundingMythId + ":" + generation) >>> 0;
}

/** Rolls whether a procedural event fires this generation and, if so, which type — weighted by the culture's threat model, resource scarcity, and settlement pattern. Returns null on a quiet generation. */
export function rollProceduralEvent(culture: CultureProfile, generation: number, runSeed: number): DriftEvent | null {
  const rng = new Rng(proceduralEventRngSeed(runSeed, generation));
  if (!rng.chance(BASE_EVENT_CHANCE)) return null;

  const weights: Record<DriftEventType, number> = { war: 1, famine: 1, migration: 1, contact: 1, disaster: 1 };
  const threatBias = THREAT_WEIGHTS[culture.seed.threatModel];
  for (const [type, bonus] of Object.entries(threatBias)) {
    weights[type as DriftEventType] += bonus ?? 0;
  }
  weights.famine += SCARCITY_FAMINE_BONUS[culture.seed.resourceScarcity];
  weights.migration += SETTLEMENT_MIGRATION_BONUS[culture.seed.settlementPattern];

  const types = Object.keys(weights) as DriftEventType[];
  const type = rng.weightedPick(types, (t) => weights[t]);
  return { type, generation };
}

export type GenerationEventSource = "manual" | "procedural" | null;

export type GenerationPlan = {
  generation: number;
  event: DriftEvent | null;
  source: GenerationEventSource;
};

/** Decides this generation's event: a queued manual event always wins; otherwise roll procedurally. */
export function planGeneration(culture: CultureProfile, generation: number, runSeed: number, manualEvent: DriftEvent | null): GenerationPlan {
  if (manualEvent) return { generation, event: manualEvent, source: "manual" };
  const rolled = rollProceduralEvent(culture, generation, runSeed);
  return { generation, event: rolled, source: rolled ? "procedural" : null };
}

// Mutation / Drift Engine (spec Section 5, open question #2 from Section 10).
// Turns a parent Myth into a MythVariant one generation later. Drift is
// mostly event-driven — an injected DriftEvent biases which single
// operation fires (spec: "a culture that just fought a war biases
// peace-god myths toward violent reinterpretation") — with a small,
// independent chance of oral-transmission decay (omission) every
// generation regardless of events, per spec's "minor secondary effect."
//
// Five operations. Four are event-biased (substitution, conflation,
// inversion, causal-reversal); omission is decay-only, never event-biased,
// since it's specifically the "even a quiet run drifts a little" effect
// spec describes, not something a war or famine would cause more of.

import { Rng, hashString } from "../rng";
import type { DriftEvent, DriftEventType, God, Myth, MythEvent, MythEventDiff, MythEventType, MythVariant } from "../types";

function cloneEvents(events: MythEvent[]): MythEvent[] {
  return events.map((e) => ({ ...e, involvedGodIds: [...e.involvedGodIds], derivedFrom: [...e.derivedFrom] }));
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const SUBSTITUTION_TEMPLATES: Record<MythEventType, string[]> = {
  "god-acts": [
    "A different telling has the god act by different means, though the intent stays the same.",
    "In some villages they say it wasn't quite this god who first acted, but a nameless figure later folk identified this way.",
  ],
  consequence: [
    "Other tellings describe a milder consequence than the one most now repeat.",
    "Some say the consequence took far longer to arrive than the myth now suggests.",
  ],
  "human-response": [
    "Elsewhere, the people are said to have responded with silence rather than ritual.",
    "A neighboring telling has the people resist before eventually complying.",
  ],
  "moral-outcome": [
    "Neighboring villages draw a slightly different lesson from the same events.",
    "The takeaway has softened with each retelling, though the core warning remains.",
  ],
};

/** Re-tells a random event in different words — the underlying provenance (derivedFrom) is untouched, since a retelling doesn't change what actually caused the trait, only how it's phrased. */
function substitute(events: MythEvent[], _pantheon: God[], rng: Rng): MythEvent[] {
  const next = cloneEvents(events);
  const index = rng.int(0, next.length - 1);
  next[index] = { ...next[index], description: rng.pick(SUBSTITUTION_TEMPLATES[next[index].type]) };
  return next;
}

/** Merges the least-referenced god in the myth into the most-referenced one — "minor characters blur together" (spec Section 5). Falls back to substitution if the myth doesn't involve at least two distinct gods to conflate. */
function conflate(events: MythEvent[], pantheon: God[], rng: Rng): MythEvent[] {
  const counts = new Map<string, number>();
  for (const e of events) for (const id of e.involvedGodIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const distinctIds = [...counts.keys()];
  if (distinctIds.length < 2) return substitute(events, pantheon, rng);

  const sorted = [...distinctIds].sort((a, b) => counts.get(a)! - counts.get(b)!);
  const minorId = sorted[0];
  const majorId = sorted[sorted.length - 1];
  const minorGod = pantheon.find((g) => g.id === minorId);
  const majorGod = pantheon.find((g) => g.id === majorId);
  if (!minorGod || !majorGod) return substitute(events, pantheon, rng);

  return cloneEvents(events).map((e) => {
    const involvedGodIds = e.involvedGodIds.map((id) => (id === minorId ? majorId : id));
    const description = e.description.split(minorGod.name).join(majorGod.name);
    const derivedFrom = e.involvedGodIds.includes(minorId)
      ? Array.from(new Set([...e.derivedFrom, `god:${majorId}.domains`, `god:${majorId}.personality`]))
      : e.derivedFrom;
    return { ...e, involvedGodIds, description, derivedFrom };
  });
}

const INVERSION_TEMPLATES: Record<MythEventType, string[]> = {
  "god-acts": ["Some now tell it backward — the god merely responded to what people had already done, not the other way around."],
  consequence: ["In the newer telling, the consequence favored the people rather than punished them."],
  "human-response": ["Later tellings have the people defying the god instead of obeying."],
  "moral-outcome": ["The newer telling draws the opposite lesson entirely — what was once forbidden is now spoken of as merely unwise, not sacred law."],
};

/** Flips a random event's polarity by swapping in a contrasting rival-telling — competing oral variants, not a semantic negation of the exact original text. */
function invert(events: MythEvent[], _pantheon: God[], rng: Rng): MythEvent[] {
  const next = cloneEvents(events);
  const index = rng.int(0, next.length - 1);
  next[index] = { ...next[index], description: rng.pick(INVERSION_TEMPLATES[next[index].type]) };
  return next;
}

/** Swaps the god-acts and consequence slots' content, so what was framed as the god's deliberate act now reads as a reaction, and vice versa — event *type* labels stay in their original structural order (so the sequence still validates), only the content moves. */
function reverseCausality(events: MythEvent[]): MythEvent[] {
  const next = cloneEvents(events);
  const actsIdx = next.findIndex((e) => e.type === "god-acts");
  const consequenceIdx = next.findIndex((e) => e.type === "consequence");
  if (actsIdx === -1 || consequenceIdx === -1) return next;

  const actsContent = { description: next[actsIdx].description, involvedGodIds: next[actsIdx].involvedGodIds, derivedFrom: next[actsIdx].derivedFrom };
  const consequenceContent = {
    description: next[consequenceIdx].description,
    involvedGodIds: next[consequenceIdx].involvedGodIds,
    derivedFrom: next[consequenceIdx].derivedFrom,
  };
  next[actsIdx] = { ...next[actsIdx], ...consequenceContent };
  next[consequenceIdx] = { ...next[consequenceIdx], ...actsContent };
  return next;
}

/** Decay-only operation (never event-biased): either drops one god reference from a multi-god event, or — if only one god is named — softens that name into a vaguer reference. Both are the "details soften, minor characters blur" oral-transmission effect. */
function omit(events: MythEvent[], pantheon: God[], rng: Rng): MythEvent[] {
  const next = cloneEvents(events);
  const candidates = next.filter((e) => e.involvedGodIds.length > 0);
  if (candidates.length === 0) return next;
  const target = rng.pick(candidates);
  const index = next.indexOf(target);

  if (target.involvedGodIds.length > 1) {
    const dropId = rng.pick(target.involvedGodIds);
    next[index] = { ...target, involvedGodIds: target.involvedGodIds.filter((id) => id !== dropId) };
    return next;
  }

  const god = pantheon.find((g) => target.involvedGodIds.includes(g.id));
  if (god) {
    next[index] = { ...target, description: target.description.split(god.name).join("the old god") };
  }
  return next;
}

/**
 * Real cross-culture syncretism (spec: "syncretism with another culture's
 * telling") — folds an actual foreign god's name into an event that already
 * names a local god, rather than a generic reworded retelling. Only usable
 * when `foreignPantheon` (the target culture's real gods) is non-empty;
 * mutateMyth falls back to the generic event-biased operations otherwise,
 * so a contact/migration event on a culture with no world behaves exactly
 * as it did before multi-culture worlds existed.
 */
function syncretize(events: MythEvent[], pantheon: God[], foreignPantheon: God[], rng: Rng): MythEvent[] {
  const next = cloneEvents(events);
  const candidates = next.filter((e) => e.involvedGodIds.length > 0);
  const target = candidates.length > 0 ? rng.pick(candidates) : rng.pick(next);
  const index = next.indexOf(target);

  const localGod = pantheon.find((g) => target.involvedGodIds.includes(g.id)) ?? rng.pick(pantheon);
  const foreignGod = rng.pick(foreignPantheon);

  next[index] = {
    ...target,
    description: `${target.description} Traders and travelers now insist ${foreignGod.name}, a god of the people beyond, is simply ${localGod.name} by another name.`,
    derivedFrom: Array.from(new Set([...target.derivedFrom, `foreign-god:${foreignGod.id}`])),
  };
  return next;
}

// ---------------------------------------------------------------------------
// Event-to-operation bias (open implementation question, Section 10 #2)
// ---------------------------------------------------------------------------

export type MutationOperation = "substitution" | "conflation" | "inversion" | "causal-reversal" | "omission";
type EventBiasedOperation = Exclude<MutationOperation, "omission">;

const OPERATION_FNS: Record<EventBiasedOperation, (events: MythEvent[], pantheon: God[], rng: Rng) => MythEvent[]> = {
  substitution: substitute,
  conflation: conflate,
  inversion: invert,
  "causal-reversal": reverseCausality,
};

/**
 * Weight per operation, per event type. Reasoning, not just numbers:
 * - war/disaster: upheaval reframes causality and flips meaning — heavy on
 *   inversion + causal-reversal, light on the quieter operations.
 * - famine: scarcity most directly recolors *outcomes* — substitution and
 *   inversion (a myth's generosity/harshness can flip, mirroring the
 *   Pantheon Layer's own mismatch mechanic thematically) dominate.
 * - migration: a culture on the move blends details together — conflation
 *   dominates ("minor characters blur" fits a migrating retelling best).
 * - contact: syncretism with another culture's telling — substitution
 *   (new phrasing enters) and conflation (foreign figures merge with
 *   existing gods) dominate.
 */
const EVENT_OPERATION_WEIGHTS: Record<DriftEventType, Record<EventBiasedOperation, number>> = {
  war: { substitution: 1, conflation: 1, inversion: 4, "causal-reversal": 4 },
  disaster: { substitution: 1, conflation: 1, inversion: 3, "causal-reversal": 4 },
  famine: { substitution: 3, conflation: 1, inversion: 3, "causal-reversal": 1 },
  migration: { substitution: 2, conflation: 4, inversion: 1, "causal-reversal": 1 },
  contact: { substitution: 4, conflation: 3, inversion: 1, "causal-reversal": 1 },
};

/** Spec: "a small amount of drift even with no events injected... a minor secondary effect, not the primary engine." Independent of any event. */
const DECAY_CHANCE = 0.12;

/** mutateMyth/mutationRngSeed only ever read a parent's `id`/`events` — this lets convex/mythVariants.ts's parentDocToMyth build a minimal Myth-shaped view (a MythVariant parent has no `hookContext` of its own) without satisfying the full Myth type. */
type MythLike = Pick<Myth, "id" | "events">;

export function mutationRngSeed(myth: MythLike, generation: number, salt = 0): number {
  return hashString(myth.id + ":mutate:" + generation + ":" + salt) >>> 0;
}

export function diffMythEvents(before: MythEvent[], after: MythEvent[]): MythEventDiff[] {
  return before.map((b, index) => {
    const a = after[index];
    const changed = b.description !== a.description || JSON.stringify(b.involvedGodIds) !== JSON.stringify(a.involvedGodIds);
    return { index, changed, before: b, after: a };
  });
}

/**
 * Produces one generation's variant of `parent`. `event` is the drift
 * trigger for this generation (null for a quiet generation — Phase 8's
 * Simulation Loop decides what to pass in, manually or procedurally). Only
 * ever applies at most one event-biased operation (a single dominant
 * mutation per generation reads as real drift; several at once would read
 * as noise) plus, independently, a small chance of decay.
 */
export function mutateMyth(
  parent: MythLike,
  pantheon: God[],
  generation: number,
  event: DriftEvent | null,
  rngSeed?: number,
  foreignPantheon?: God[],
): MythVariant {
  const resolvedSeed = rngSeed ?? mutationRngSeed(parent, generation);
  const rng = new Rng(resolvedSeed);

  let events = cloneEvents(parent.events);
  const mutationOperations: string[] = [];

  if (event && (event.type === "contact" || event.type === "migration") && foreignPantheon && foreignPantheon.length > 0) {
    events = syncretize(events, pantheon, foreignPantheon, rng);
    mutationOperations.push("syncretism");
  } else if (event) {
    const weights = EVENT_OPERATION_WEIGHTS[event.type];
    const operations = Object.keys(weights) as EventBiasedOperation[];
    const chosen = rng.weightedPick(operations, (op) => weights[op]);
    events = OPERATION_FNS[chosen](events, pantheon, rng);
    mutationOperations.push(chosen);
  }

  if (rng.chance(DECAY_CHANCE)) {
    events = omit(events, pantheon, rng);
    mutationOperations.push("omission");
  }

  return {
    id: `variant-${resolvedSeed.toString(16)}`,
    parentMythId: parent.id,
    generation,
    events,
    mutationOperations,
    triggeringEventId: event ? `${event.type}@gen${generation}` : undefined,
    diff: diffMythEvents(parent.events, events),
  };
}

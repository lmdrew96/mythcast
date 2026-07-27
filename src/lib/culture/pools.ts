// Candidate pools for the Culture Generator (spec Section 3).
//
// Each candidate declares which seed dimensions it reads (`relevantKeys`) and
// a `weight` function scoring how strongly the current seed favors it. This
// is the mechanism behind "traceable in hindsight, not predictable in
// advance" (spec Section 2): the weighted roll means you can't call the
// exact output from the seed alone, but whichever candidate wins, its
// `relevantKeys` name exactly why it was in contention.

import type { CultureSeedParams, Traced } from "../types";
import type { Rng } from "../rng";

export type Candidate<T> = {
  value: T;
  relevantKeys: (keyof CultureSeedParams)[];
  weight: (seed: CultureSeedParams) => number;
};

const keys = (...k: (keyof CultureSeedParams)[]) => k;

/** Weighted-pick a single candidate; derivedFrom names only the seed keys that candidate actually reads. */
export function pickOne<T>(rng: Rng, seed: CultureSeedParams, candidates: Candidate<T>[]): Traced<T> {
  const chosen = rng.weightedPick(candidates, (c) => c.weight(seed));
  return { value: chosen.value, derivedFrom: chosen.relevantKeys.map((k) => `seed.${k}`) };
}

/** Weighted-rank `count` distinct candidates; derivedFrom is the union of relevant keys across all picks. */
export function pickRanked<T>(rng: Rng, seed: CultureSeedParams, candidates: Candidate<T>[], count: number): Traced<T[]> {
  const chosen = rng.weightedRank(candidates, (c) => c.weight(seed), count);
  const derivedFrom = Array.from(new Set(chosen.flatMap((c) => c.relevantKeys.map((k) => `seed.${k}`))));
  return { value: chosen.map((c) => c.value), derivedFrom };
}

// ---------------------------------------------------------------------------
// Core values (ranked)
// ---------------------------------------------------------------------------

export const CORE_VALUE_CANDIDATES: Candidate<string>[] = [
  {
    value: "self-sufficiency",
    relevantKeys: keys("threatModel", "resourceScarcity"),
    weight: (s) => 1 + (s.threatModel === "isolated" ? 2 : 0) + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 2 : 0),
  },
  {
    value: "hospitality",
    relevantKeys: keys("resourceScarcity", "threatModel"),
    weight: (s) => 1 + (s.resourceScarcity === "abundant" ? 2 : 0) + (s.threatModel !== "isolated" ? 1 : 0),
  },
  {
    value: "resilience",
    relevantKeys: keys("threatModel", "resourceScarcity"),
    weight: (s) => 1 + (s.threatModel === "natural-disaster-prone" ? 2 : 0) + (s.resourceScarcity === "famine-prone" ? 2 : 0),
  },
  {
    value: "hierarchy and order",
    relevantKeys: keys("governmentType"),
    weight: (s) => 1 + (["hereditary-monarchy", "theocracy"].includes(s.governmentType) ? 3 : 0),
  },
  {
    value: "consensus",
    relevantKeys: keys("governmentType"),
    weight: (s) => 1 + (["council", "stateless-egalitarian"].includes(s.governmentType) ? 3 : 0),
  },
  {
    value: "ancestor reverence",
    relevantKeys: keys("cosmologyStance", "kinshipStructure"),
    weight: (s) => 1 + (s.cosmologyStance === "polytheist-ancestral" ? 3 : 0) + (["patrilineal", "matrilineal"].includes(s.kinshipStructure) ? 1 : 0),
  },
  {
    value: "communal solidarity",
    relevantKeys: keys("kinshipStructure", "threatModel"),
    weight: (s) => 1 + (["clan-based", "non-kin-collective"].includes(s.kinshipStructure) ? 2 : 0) + (s.threatModel === "rival-clans" ? 1 : 0),
  },
  {
    value: "martial vigilance",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["rival-clans", "colonizer-pressure", "predators"].includes(s.threatModel) ? 3 : 0),
  },
  {
    value: "harmony with nature",
    relevantKeys: keys("cosmologyStance", "climate"),
    weight: (s) => 1 + (["animist", "pantheist"].includes(s.cosmologyStance) ? 3 : 0) + (["temperate", "tropical"].includes(s.climate) ? 1 : 0),
  },
  {
    value: "mastery over nature",
    relevantKeys: keys("climate", "technologyLevel"),
    weight: (s) => 1 + (["volcanic", "arctic"].includes(s.climate) ? 2 : 0) + (["iron", "early-industrial"].includes(s.technologyLevel) ? 2 : 0),
  },
  {
    value: "ritual purity",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "dualist" ? 3 : 0),
  },
  {
    value: "adaptability",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 3 : 0),
  },
  {
    value: "permanence",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (["fixed-agrarian", "urban"].includes(s.settlementPattern) ? 3 : 0),
  },
  {
    value: "generosity",
    relevantKeys: keys("resourceScarcity", "kinshipStructure"),
    weight: (s) => 1 + (s.resourceScarcity === "abundant" ? 2 : 0) + (s.kinshipStructure === "non-kin-collective" ? 2 : 0),
  },
  {
    value: "secrecy and caution",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["predators", "isolated"].includes(s.threatModel) ? 2 : 0),
  },
];

// ---------------------------------------------------------------------------
// Taboos
// ---------------------------------------------------------------------------

export const TABOO_CANDIDATES: Candidate<string>[] = [
  {
    value: "wasting food or resources",
    relevantKeys: keys("resourceScarcity"),
    weight: (s) => 1 + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 3 : 0),
  },
  {
    value: "hoarding from one's own kin",
    relevantKeys: keys("kinshipStructure", "resourceScarcity"),
    weight: (s) => 1 + (s.resourceScarcity === "abundant" ? 1 : 0) + (["clan-based", "non-kin-collective"].includes(s.kinshipStructure) ? 2 : 0),
  },
  {
    value: "improper death rites",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (["polytheist-ancestral", "animist"].includes(s.cosmologyStance) ? 3 : 0),
  },
  {
    value: "violence against kin",
    relevantKeys: keys("kinshipStructure"),
    weight: (s) => 1 + (["patrilineal", "matrilineal", "clan-based"].includes(s.kinshipStructure) ? 2 : 0),
  },
  {
    value: "transgressing one's assigned role",
    relevantKeys: keys("kinshipStructure"),
    weight: (s) => 1 + (["patrilineal", "matrilineal"].includes(s.kinshipStructure) ? 3 : 0),
  },
  {
    value: "speaking ill of the dead",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "polytheist-ancestral" ? 2 : 0),
  },
  {
    value: "trespass on sacred ground",
    relevantKeys: keys("cosmologyStance", "settlementPattern"),
    weight: (s) => 1 + (["animist", "pantheist"].includes(s.cosmologyStance) ? 2 : 0) + (s.settlementPattern === "fixed-agrarian" ? 1 : 0),
  },
  {
    value: "cowardice before a threat",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["rival-clans", "colonizer-pressure"].includes(s.threatModel) ? 3 : 0),
  },
  {
    value: "contact with outsiders",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (s.threatModel === "isolated" ? 3 : 0),
  },
  {
    value: "idleness",
    relevantKeys: keys("resourceScarcity", "technologyLevel"),
    weight: (s) => 1 + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 2 : 0) + (s.technologyLevel === "stone" ? 1 : 0),
  },
];

// ---------------------------------------------------------------------------
// Conflict resolution norms, authority, and inheritance are direct prose
// restatements of governmentType/kinshipStructure — not generated content
// with real range. A weighted roll here would mean a ~30% chance of a
// "hereditary-monarchy" culture describing council rule, which isn't
// productive tension (spec Section 2/3) — it's just an unflagged
// contradiction between the seed param and what it's supposed to mean.
// These stay deterministic lookups; unpredictability lives in the fields
// that are actually generated (values, taboos, rituals, art, narrative).
// ---------------------------------------------------------------------------

export const CONFLICT_RESOLUTION_BY_GOVERNMENT: Record<CultureSeedParams["governmentType"], string> = {
  chieftain: "A chieftain hears both sides and hands down a binding ruling.",
  council: "Disputes go before a council; resolution requires majority consensus.",
  theocracy: "Priests interpret omens or sacred law to settle disputes.",
  "hereditary-monarchy": "The monarch's court adjudicates; rulings can be appealed upward through the nobility.",
  "stateless-egalitarian": "Elders mediate restoratively — the goal is reconciliation, not punishment.",
};

export const AUTHORITY_BY_GOVERNMENT: Record<CultureSeedParams["governmentType"], string> = {
  chieftain: "A single chieftain, chosen for proven strength or wisdom, holds authority.",
  council: "Authority rests with a council of elders or representatives.",
  theocracy: "Religious authorities hold both spiritual and civil authority.",
  "hereditary-monarchy": "Authority passes down a ruling bloodline.",
  "stateless-egalitarian": "No formal ruler — authority is distributed and situational.",
};

export const INHERITANCE_BY_KINSHIP: Record<CultureSeedParams["kinshipStructure"], string> = {
  patrilineal: "Property and title pass from father to eldest son.",
  matrilineal: "Property and lineage pass through the mother's line.",
  "clan-based": "Inheritance is held and administered communally within the clan.",
  "non-kin-collective": "There is no personal inheritance — resources are redistributed by the collective.",
};

// ---------------------------------------------------------------------------
// Ritual practices
// ---------------------------------------------------------------------------

export const COMING_OF_AGE_CANDIDATES: Candidate<string>[] = [
  {
    value: "a solo wilderness trial, undertaken alone and unaided",
    relevantKeys: keys("settlementPattern", "threatModel"),
    weight: (s) => 1 + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 2 : 0) + (s.threatModel === "predators" ? 2 : 0),
  },
  {
    value: "a communal harvest-season initiation",
    relevantKeys: keys("settlementPattern", "cosmologyStance"),
    weight: (s) => 1 + (s.settlementPattern === "fixed-agrarian" ? 2 : 0) + (["animist", "polytheist-ancestral"].includes(s.cosmologyStance) ? 1 : 0),
  },
  {
    value: "a ritual first hunt or first kill",
    relevantKeys: keys("threatModel", "technologyLevel"),
    weight: (s) => 1 + (s.threatModel === "predators" ? 2 : 0) + (["stone", "bronze"].includes(s.technologyLevel) ? 1 : 0),
  },
  {
    value: "a rite of first blood, marking entry into a warrior's training",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["rival-clans", "colonizer-pressure"].includes(s.threatModel) ? 3 : 0),
  },
  {
    value: "a naming ceremony marking entry into adult ritual duties",
    relevantKeys: keys("governmentType", "cosmologyStance"),
    weight: (s) => 1 + (s.governmentType === "theocracy" ? 2 : 0) + (["dualist", "pantheist"].includes(s.cosmologyStance) ? 1 : 0),
  },
  {
    value: "the completion of an apprenticeship, marked before the craft guild",
    relevantKeys: keys("settlementPattern", "technologyLevel"),
    weight: (s) => 1 + (s.settlementPattern === "urban" ? 2 : 0) + (["iron", "early-industrial"].includes(s.technologyLevel) ? 2 : 0),
  },
];

export const DEATH_RITES_CANDIDATES: Candidate<string>[] = [
  {
    value: "sky burial — the body is left exposed, returned to sun and scavenger",
    relevantKeys: keys("climate", "cosmologyStance"),
    weight: (s) => 1 + (["arid", "volcanic"].includes(s.climate) ? 2 : 0) + (s.cosmologyStance === "animist" ? 1 : 0),
  },
  {
    value: "cremation, to release the spirit from the body",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (["polytheist-ancestral", "dualist"].includes(s.cosmologyStance) ? 3 : 0),
  },
  {
    value: "burial with grave goods, provisioned for the journey onward",
    relevantKeys: keys("resourceScarcity", "cosmologyStance"),
    weight: (s) => 1 + (["abundant", "moderate"].includes(s.resourceScarcity) ? 1 : 0) + (s.cosmologyStance === "polytheist-ancestral" ? 2 : 0),
  },
  {
    value: "a quiet return to the earth — the dead are honored, but resources are too precious to bury alongside them",
    relevantKeys: keys("resourceScarcity"),
    weight: (s) => 1 + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 3 : 0),
  },
  {
    value: "interment beneath the household or clan-ground, keeping the ancestors close",
    relevantKeys: keys("kinshipStructure", "cosmologyStance"),
    weight: (s) => 1 + (["clan-based", "patrilineal", "matrilineal"].includes(s.kinshipStructure) ? 2 : 0) + (s.cosmologyStance === "animist" ? 1 : 0),
  },
];

export const SEASONAL_RITUAL_CANDIDATES: Candidate<string>[] = [
  {
    value: "solstice bonfires marking the mid-winter turn",
    relevantKeys: keys("climate"),
    weight: (s) => 1 + (["arctic", "temperate"].includes(s.climate) ? 2 : 0),
  },
  {
    value: "first-thaw planting rites",
    relevantKeys: keys("climate", "settlementPattern"),
    weight: (s) => 1 + (s.climate === "temperate" ? 1 : 0) + (s.settlementPattern === "fixed-agrarian" ? 2 : 0),
  },
  {
    value: "rain-calling ceremonies ahead of the monsoon",
    relevantKeys: keys("climate"),
    weight: (s) => 1 + (s.climate === "tropical" ? 3 : 0),
  },
  {
    value: "ash-and-ember rites once the mountain quiets",
    relevantKeys: keys("climate"),
    weight: (s) => 1 + (s.climate === "volcanic" ? 3 : 0),
  },
  {
    value: "a blessing sung over the herd or household before seasonal migration",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 3 : 0),
  },
  {
    value: "harvest tribute offerings",
    relevantKeys: keys("settlementPattern", "governmentType"),
    weight: (s) => 1 + (s.settlementPattern === "fixed-agrarian" ? 2 : 0) + (["hereditary-monarchy", "theocracy"].includes(s.governmentType) ? 1 : 0),
  },
  {
    value: "ancestor-remembrance vigils",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "polytheist-ancestral" ? 3 : 0),
  },
  {
    value: "purification rites at the turn between opposing seasons",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "dualist" ? 3 : 0),
  },
];

// ---------------------------------------------------------------------------
// Art / aesthetic sensibility
// ---------------------------------------------------------------------------

export const BEAUTIFUL_CANDIDATES: Candidate<string>[] = [
  {
    value: "intricate ancestor-masks",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "polytheist-ancestral" ? 3 : 0),
  },
  {
    value: "flowing water-and-wind motifs",
    relevantKeys: keys("climate", "cosmologyStance"),
    weight: (s) => 1 + (["temperate", "tropical"].includes(s.climate) ? 1 : 0) + (["animist", "pantheist"].includes(s.cosmologyStance) ? 2 : 0),
  },
  {
    value: "geometric star-and-sky patterns",
    relevantKeys: keys("climate", "cosmologyStance"),
    weight: (s) => 1 + (s.climate === "arctic" ? 2 : 0) + (s.cosmologyStance === "dualist" ? 1 : 0),
  },
  {
    value: "scarification and body-marking as a mark of status",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["rival-clans", "predators"].includes(s.threatModel) ? 2 : 0),
  },
  {
    value: "woven textiles in earth-tones",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (s.settlementPattern === "fixed-agrarian" ? 2 : 0),
  },
  {
    value: "fire-and-ash imagery",
    relevantKeys: keys("climate"),
    weight: (s) => 1 + (s.climate === "volcanic" ? 3 : 0),
  },
  {
    value: "predator-tooth-and-claw ornamentation",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (s.threatModel === "predators" ? 3 : 0),
  },
  {
    value: "monumental stonework",
    relevantKeys: keys("settlementPattern", "technologyLevel"),
    weight: (s) => 1 + (s.settlementPattern === "urban" ? 2 : 0) + (["iron", "early-industrial"].includes(s.technologyLevel) ? 1 : 0),
  },
];

export const UGLY_CANDIDATES: Candidate<string>[] = [
  {
    value: "asymmetry and unbalanced forms",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "dualist" ? 3 : 0),
  },
  {
    value: "imagery associated with outsiders or rivals",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (["rival-clans", "colonizer-pressure", "isolated"].includes(s.threatModel) ? 2 : 0),
  },
  {
    value: "barren or wasted land, shown without disguise",
    relevantKeys: keys("resourceScarcity"),
    weight: (s) => 1 + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 3 : 0),
  },
  {
    value: "wealth hoarded and openly displayed",
    relevantKeys: keys("resourceScarcity"),
    weight: (s) => 1 + (["scarce", "famine-prone"].includes(s.resourceScarcity) ? 2 : 0),
  },
  {
    value: "the specific markings of a locally feared predator",
    relevantKeys: keys("threatModel"),
    weight: (s) => 1 + (s.threatModel === "predators" ? 3 : 0),
  },
];

export const SACRED_TO_DEPICT_CANDIDATES: Candidate<string>[] = [
  {
    value: "the faces of the ancestors",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "polytheist-ancestral" ? 3 : 0),
  },
  {
    value: "the weapon of the protector-god",
    relevantKeys: keys("threatModel", "cosmologyStance"),
    weight: (s) => 1 + (["rival-clans", "colonizer-pressure"].includes(s.threatModel) ? 2 : 0) + (s.cosmologyStance === "polytheist-ancestral" ? 1 : 0),
  },
  {
    value: "the harvest cycle, beginning to end",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (s.settlementPattern === "fixed-agrarian" ? 3 : 0),
  },
  {
    value: "the mountain itself",
    relevantKeys: keys("climate"),
    weight: (s) => 1 + (s.climate === "volcanic" ? 3 : 0),
  },
  {
    value: "the balance of light and dark forces",
    relevantKeys: keys("cosmologyStance"),
    weight: (s) => 1 + (s.cosmologyStance === "dualist" ? 3 : 0),
  },
  {
    value: "the route of the first migration",
    relevantKeys: keys("settlementPattern"),
    weight: (s) => 1 + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 3 : 0),
  },
];

// ---------------------------------------------------------------------------
// Economic structure
// ---------------------------------------------------------------------------

export const ECONOMIC_STRUCTURE_CANDIDATES: Candidate<"gift-economy" | "barter" | "tribute" | "trade-based">[] = [
  {
    value: "gift-economy",
    relevantKeys: keys("resourceScarcity", "kinshipStructure", "technologyLevel"),
    weight: (s) =>
      1 + (s.resourceScarcity === "abundant" ? 3 : 0) + (s.kinshipStructure === "non-kin-collective" ? 2 : 0) + (["stone", "bronze"].includes(s.technologyLevel) ? 1 : 0),
  },
  {
    value: "barter",
    relevantKeys: keys("settlementPattern", "resourceScarcity"),
    weight: (s) => 1 + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 3 : 0) + (s.resourceScarcity === "moderate" ? 1 : 0),
  },
  {
    value: "tribute",
    relevantKeys: keys("governmentType", "settlementPattern"),
    weight: (s) => 1 + (["hereditary-monarchy", "theocracy"].includes(s.governmentType) ? 3 : 0) + (["fixed-agrarian", "urban"].includes(s.settlementPattern) ? 1 : 0),
  },
  {
    value: "trade-based",
    relevantKeys: keys("settlementPattern", "technologyLevel", "threatModel"),
    weight: (s) => 1 + (s.settlementPattern === "urban" ? 3 : 0) + (["iron", "early-industrial"].includes(s.technologyLevel) ? 2 : 0) + (s.threatModel !== "isolated" ? 1 : 0),
  },
];

// ---------------------------------------------------------------------------
// Gender & role norms
// ---------------------------------------------------------------------------

export const GENDER_ROLE_CANDIDATES: Candidate<string>[] = [
  {
    value: "Rigid — men hold public authority and inheritance; women hold domestic and ritual authority.",
    relevantKeys: keys("kinshipStructure"),
    weight: (s) => 1 + (s.kinshipStructure === "patrilineal" ? 6 : 0) + (s.settlementPattern === "urban" ? 1 : 0),
  },
  {
    value: "Rigid but inverted — women hold lineage and inheritance authority; men marry into their wives' households.",
    relevantKeys: keys("kinshipStructure"),
    weight: (s) => 1 + (s.kinshipStructure === "matrilineal" ? 6 : 0),
  },
  {
    value: "Flexible within the clan, though clan elders hold the real authority regardless of gender.",
    relevantKeys: keys("kinshipStructure", "settlementPattern"),
    weight: (s) => 1 + (s.kinshipStructure === "clan-based" ? 5 : 0) + (["nomadic", "semi-nomadic"].includes(s.settlementPattern) ? 1 : 0),
  },
  {
    value: "Roles are assigned by aptitude and need rather than gender; the collective has no gendered authority structure.",
    relevantKeys: keys("kinshipStructure"),
    weight: (s) => 1 + (s.kinshipStructure === "non-kin-collective" ? 6 : 0),
  },
];

// ---------------------------------------------------------------------------
// Origin narrative — template pieces
// ---------------------------------------------------------------------------

export const CLIMATE_FEATURE: Record<CultureSeedParams["climate"], string> = {
  arid: "the cracked red plain",
  temperate: "the river valley",
  arctic: "the long ice",
  tropical: "the green canopy",
  volcanic: "the restless mountain",
};

// cosmologyStance defines the culture's worldview, and the origin narrative
// is that worldview's own account of itself — same tautology problem as
// authority/conflictResolutionNorms above, so this is a deterministic
// lookup by cosmologyStance rather than a weighted roll. The climate-feature
// substitution below is still real variation: the template is fixed, the
// specific imagery isn't.
export const ORIGIN_NARRATIVE_BY_COSMOLOGY: Record<CultureSeedParams["cosmologyStance"], (feature: string) => string> = {
  animist: (feature) => `In the beginning, ${feature} itself stirred and taught the first people to listen.`,
  "polytheist-ancestral": (feature) => `The first ancestors descended from ${feature}, and their deeds became the pattern every descendant follows.`,
  dualist: () => `Two opposing forces contended before the world settled, and the people are born of that unresolved contest.`,
  pantheist: (feature) => `The people say they were never made — they are simply one expression of the same living whole as ${feature}.`,
  other: () => `No single story is agreed upon — every elder tells the origin differently, and the disagreement itself is the tradition.`,
};

// ---------------------------------------------------------------------------
// Naming convention texture
// ---------------------------------------------------------------------------

export const NAMING_TEXTURE_CANDIDATES: Candidate<"harsh" | "flowing" | "clipped" | "ornate">[] = [
  {
    value: "harsh",
    relevantKeys: keys("climate", "threatModel"),
    weight: (s) => 1 + (s.climate === "volcanic" ? 2 : 0) + (["predators", "rival-clans"].includes(s.threatModel) ? 2 : 0),
  },
  {
    value: "flowing",
    relevantKeys: keys("climate", "threatModel"),
    weight: (s) => 1 + (["tropical", "temperate"].includes(s.climate) ? 2 : 0) + (s.threatModel === "isolated" ? 1 : 0),
  },
  {
    value: "clipped",
    relevantKeys: keys("climate", "threatModel"),
    weight: (s) => 1 + (s.climate === "arctic" ? 3 : 0) + (s.threatModel === "colonizer-pressure" ? 1 : 0),
  },
  {
    value: "ornate",
    relevantKeys: keys("governmentType", "cosmologyStance"),
    weight: (s) => 1 + (s.governmentType === "theocracy" ? 2 : 0) + (s.cosmologyStance === "dualist" ? 2 : 0),
  },
];

// Domain candidate pool for the Pantheon Generator (spec Section 4).
// "Weighted, not checklist" — domains are generated from what the culture's
// values/fears/taboos actually call for, not a fixed list every pantheon
// must fill. Weight functions read the seed directly (hard signals like
// threatModel/climate) and fuzzy-match against the culture's generated
// values/taboos text (soft signals) rather than coupling to the exact
// string literals in culture/pools.ts, which can be reworded independently.

import type { CultureProfile } from "../types";

export type DomainCandidate = {
  domain: string;
  /** Expected personality traits given how this culture relates to the domain (spec: "mostly derived from the culture's relationship to their domain"). */
  deriveTraits: (culture: CultureProfile) => string[];
  relevantFrom: string[];
  weight: (culture: CultureProfile) => number;
};

function hasValueLike(culture: CultureProfile, ...substrings: string[]): boolean {
  return culture.coreValues.value.some((v) => substrings.some((s) => v.includes(s)));
}

function hasTabooLike(culture: CultureProfile, ...substrings: string[]): boolean {
  return culture.taboos.value.some((t) => substrings.some((s) => t.includes(s)));
}

export const DOMAIN_CANDIDATES: DomainCandidate[] = [
  {
    domain: "harvest and fertility",
    deriveTraits: (c) =>
      ["scarce", "famine-prone"].includes(c.seed.resourceScarcity)
        ? ["stern", "tribute-demanding", "withholding"]
        : c.seed.resourceScarcity === "abundant"
          ? ["generous", "warm", "nurturing"]
          : ["fair", "measured"],
    relevantFrom: ["seed.resourceScarcity", "seed.settlementPattern"],
    weight: (c) => 1 + (c.seed.settlementPattern === "fixed-agrarian" ? 3 : 0) + (hasTabooLike(c, "wasting food") ? 1 : 0),
  },
  {
    domain: "war and protection",
    deriveTraits: (c) => (["rival-clans", "colonizer-pressure"].includes(c.seed.threatModel) ? ["fierce", "vigilant", "unyielding"] : ["watchful", "protective"]),
    relevantFrom: ["seed.threatModel"],
    weight: (c) => 1 + (["rival-clans", "colonizer-pressure", "predators"].includes(c.seed.threatModel) ? 4 : 0) + (hasValueLike(c, "martial vigilance") ? 2 : 0),
  },
  {
    domain: "death and the underworld",
    deriveTraits: (c) => (c.seed.cosmologyStance === "polytheist-ancestral" ? ["solemn", "dutiful"] : ["quiet", "patient", "unhurried"]),
    relevantFrom: ["seed.cosmologyStance"],
    weight: (c) => 1 + (["polytheist-ancestral", "animist"].includes(c.seed.cosmologyStance) ? 2 : 0) + (hasTabooLike(c, "death rites") ? 3 : 0),
  },
  {
    domain: "hearth and home",
    deriveTraits: () => ["steady", "nurturing", "dependable"],
    relevantFrom: ["seed.settlementPattern", "seed.kinshipStructure"],
    weight: (c) => 1 + (["fixed-agrarian", "urban"].includes(c.seed.settlementPattern) ? 2 : 0) + (hasValueLike(c, "permanence") ? 2 : 0),
  },
  {
    domain: "trade and travel",
    deriveTraits: (c) => (c.economicStructure.value === "trade-based" ? ["shrewd", "affable", "restless"] : ["practical", "even-handed"]),
    relevantFrom: ["culture.economicStructure", "seed.threatModel"],
    weight: (c) => 1 + (["trade-based", "barter"].includes(c.economicStructure.value) ? 3 : 0) + (c.seed.threatModel !== "isolated" ? 1 : 0),
  },
  {
    domain: "sea and water",
    deriveTraits: () => ["changeable", "restless"],
    relevantFrom: ["seed.climate"],
    weight: (c) => 1 + (["tropical", "temperate"].includes(c.seed.climate) ? 2 : 0),
  },
  {
    domain: "sky and storm",
    deriveTraits: (c) => (c.seed.threatModel === "natural-disaster-prone" ? ["wrathful", "unpredictable"] : ["distant", "watchful"]),
    relevantFrom: ["seed.threatModel", "seed.climate"],
    weight: (c) => 1 + (c.seed.threatModel === "natural-disaster-prone" ? 3 : 0) + (["arctic", "volcanic"].includes(c.seed.climate) ? 1 : 0),
  },
  {
    domain: "healing and medicine",
    deriveTraits: () => ["patient", "nurturing", "watchful"],
    relevantFrom: ["seed.resourceScarcity"],
    weight: (c) => 1 + (c.seed.resourceScarcity === "famine-prone" ? 2 : 0) + (hasValueLike(c, "resilience") ? 2 : 0),
  },
  {
    domain: "justice and law",
    deriveTraits: (c) => (["theocracy", "hereditary-monarchy"].includes(c.seed.governmentType) ? ["stern", "impartial"] : ["fair", "deliberate"]),
    relevantFrom: ["seed.governmentType"],
    weight: (c) => 1 + (hasValueLike(c, "hierarchy and order", "consensus") ? 3 : 0),
  },
  {
    domain: "hunting and beasts",
    deriveTraits: () => ["fierce", "solitary", "keen"],
    relevantFrom: ["seed.threatModel", "seed.technologyLevel"],
    weight: (c) => 1 + (c.seed.threatModel === "predators" ? 3 : 0) + (["stone", "bronze"].includes(c.seed.technologyLevel) ? 1 : 0),
  },
  {
    domain: "fire and the forge",
    deriveTraits: () => ["intense", "proud", "exacting"],
    relevantFrom: ["seed.technologyLevel", "seed.climate"],
    weight: (c) => 1 + (["iron", "early-industrial"].includes(c.seed.technologyLevel) ? 2 : 0) + (c.seed.climate === "volcanic" ? 2 : 0),
  },
  {
    domain: "wisdom and knowledge",
    deriveTraits: () => ["contemplative", "aloof", "exacting"],
    relevantFrom: ["seed.governmentType"],
    weight: (c) => 1 + (hasValueLike(c, "ritual purity", "ancestor reverence") ? 2 : 0) + (c.seed.governmentType === "theocracy" ? 2 : 0),
  },
  {
    domain: "love and kinship",
    deriveTraits: () => ["warm", "devoted", "generous"],
    relevantFrom: ["seed.kinshipStructure"],
    weight: (c) => 1 + (hasValueLike(c, "communal solidarity", "generosity") ? 3 : 0),
  },
  {
    domain: "trickery and luck",
    deriveTraits: () => ["playful", "unpredictable", "sly"],
    relevantFrom: ["seed.settlementPattern"],
    weight: (c) => 1 + (hasValueLike(c, "adaptability") ? 2 : 0) + (["nomadic", "semi-nomadic"].includes(c.seed.settlementPattern) ? 1 : 0),
  },
  {
    domain: "ancestors and lineage",
    deriveTraits: () => ["dutiful", "stern", "watchful"],
    relevantFrom: ["seed.cosmologyStance", "seed.kinshipStructure"],
    weight: (c) => 1 + (c.seed.cosmologyStance === "polytheist-ancestral" ? 3 : 0) + (hasValueLike(c, "ancestor reverence") ? 2 : 0),
  },
  {
    domain: "weather and seasons",
    deriveTraits: () => ["steady", "patient", "cyclical in temperament"],
    relevantFrom: ["seed.climate", "seed.settlementPattern"],
    weight: (c) => 1 + (["arctic", "temperate"].includes(c.seed.climate) ? 1 : 0) + (c.seed.settlementPattern === "fixed-agrarian" ? 2 : 0),
  },
  {
    domain: "the mountain and the earth",
    deriveTraits: () => ["immovable", "stern", "ancient"],
    relevantFrom: ["seed.climate"],
    weight: (c) => 1 + (["volcanic", "arid"].includes(c.seed.climate) ? 3 : 0),
  },
  {
    domain: "craft and artisanship",
    deriveTraits: () => ["meticulous", "proud", "exacting"],
    relevantFrom: ["seed.settlementPattern", "seed.technologyLevel"],
    weight: (c) => 1 + (c.seed.settlementPattern === "urban" ? 2 : 0) + (["iron", "early-industrial"].includes(c.seed.technologyLevel) ? 2 : 0),
  },
];

/** Bidirectional consolidation compatibility — domains a god could plausibly hold together (spec: "harvest-and-fertility", "death-and-winter" examples). */
const CONSOLIDATION_PAIRS: [string, string][] = [
  ["harvest and fertility", "weather and seasons"],
  ["harvest and fertility", "hearth and home"],
  ["war and protection", "hunting and beasts"],
  ["death and the underworld", "ancestors and lineage"],
  ["death and the underworld", "weather and seasons"],
  ["sea and water", "trade and travel"],
  ["sky and storm", "weather and seasons"],
  ["fire and the forge", "craft and artisanship"],
  ["wisdom and knowledge", "justice and law"],
  ["trickery and luck", "trade and travel"],
  ["love and kinship", "hearth and home"],
  ["the mountain and the earth", "sky and storm"],
];

export function compatibleDomainsFor(domain: string): string[] {
  return CONSOLIDATION_PAIRS.filter(([a, b]) => a === domain || b === domain).map(([a, b]) => (a === domain ? b : a));
}

/** Generic trait inversion for the personality mismatch roll — same mechanism as culture-layer determinism fix: the mismatch still reads as derived (an inverted trait), never arbitrary. */
export const TRAIT_OPPOSITES: Record<string, string> = {
  stern: "gentle",
  gentle: "stern",
  harsh: "kind",
  kind: "harsh",
  "tribute-demanding": "freely-giving",
  "freely-giving": "tribute-demanding",
  withholding: "generous",
  generous: "withholding",
  warm: "cold",
  cold: "warm",
  nurturing: "neglectful",
  neglectful: "nurturing",
  fierce: "meek",
  meek: "fierce",
  vigilant: "careless",
  careless: "vigilant",
  unyielding: "yielding",
  yielding: "unyielding",
  watchful: "distracted",
  distracted: "watchful",
  protective: "indifferent",
  indifferent: "protective",
  solemn: "playful",
  playful: "solemn",
  dutiful: "wayward",
  wayward: "dutiful",
  quiet: "boisterous",
  boisterous: "quiet",
  patient: "impatient",
  impatient: "patient",
  unhurried: "frantic",
  frantic: "unhurried",
  steady: "erratic",
  erratic: "steady",
  dependable: "fickle",
  fickle: "dependable",
  shrewd: "guileless",
  guileless: "shrewd",
  affable: "hostile",
  hostile: "affable",
  restless: "settled",
  settled: "restless",
  practical: "fanciful",
  fanciful: "practical",
  "even-handed": "capricious",
  capricious: "even-handed",
  changeable: "constant",
  constant: "changeable",
  wrathful: "serene",
  serene: "wrathful",
  unpredictable: "reliable",
  reliable: "unpredictable",
  distant: "intimate",
  intimate: "distant",
  stubborn: "flexible",
  flexible: "stubborn",
  impartial: "biased",
  biased: "impartial",
  fair: "unjust",
  unjust: "fair",
  deliberate: "impulsive",
  impulsive: "deliberate",
  solitary: "gregarious",
  gregarious: "solitary",
  keen: "dull",
  dull: "keen",
  intense: "mild",
  mild: "intense",
  proud: "humble",
  humble: "proud",
  exacting: "lax",
  lax: "exacting",
  contemplative: "impulsive-minded",
  aloof: "familiar",
  familiar: "aloof",
  devoted: "faithless",
  faithless: "devoted",
  sly: "forthright",
  forthright: "sly",
  ancient: "youthful",
  youthful: "ancient",
  immovable: "yielding",
  meticulous: "careless-in-craft",
};

export function invertTraits(traits: string[]): string[] {
  return traits.map((t) => TRAIT_OPPOSITES[t] ?? `unexpectedly not ${t}`);
}

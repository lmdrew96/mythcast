// Auto-suggest logic (spec Section 8.1): maps a Culture Profile's seed
// fields to a suggested theme. Always a suggestion, never a lock — the
// codex export UI must let the suggestion be overridden with any of the 10
// variants regardless of what the culture generated toward.
//
// Spec's trigger table names a few concepts that don't exist as literal
// enum values in CultureSeedParams (Section 3) — there's no "coastal"
// climate or "water-adjacent" threat model. Mapped to the closest actual
// enum values below (documented per theme) rather than left unimplemented;
// this mapping is exactly the kind of judgment call flagged for the
// Polish/Tuning pass (spec Section 10) to revisit.
//
// Each theme has a small list of trigger predicates; the theme with the
// most matching predicates for a given seed wins (ties broken by
// THEME_NAMES order, first declared wins — irrelevant in practice since
// it's always overridable).

import type { CultureSeedParams } from "../types";
import { THEME_NAMES, type ThemeName } from "./palettes";

type Trigger = (seed: CultureSeedParams) => boolean;

const AUTO_SUGGEST_TRIGGERS: Record<ThemeName, Trigger[]> = {
  "nightfall-indigo": [
    (s) => s.cosmologyStance === "dualist",
    (s) => s.settlementPattern === "urban",
    (s) => s.technologyLevel === "early-industrial",
  ],
  "glacial-current": [
    (s) => s.climate === "arctic",
    // No literal "water-adjacent" threat model exists; natural-disaster-prone
    // (floods, storms) is the closest available proxy for that concept.
    (s) => s.threatModel === "natural-disaster-prone",
  ],
  "autumn-hearth": [(s) => s.settlementPattern === "fixed-agrarian", (s) => s.cosmologyStance === "animist"],
  "ivory-ascension": [
    (s) => s.cosmologyStance === "pantheist",
    (s) => s.resourceScarcity === "abundant",
    // No literal "low threat" enum value; isolated (no active rivals/predators/colonizers) is the closest proxy.
    (s) => s.threatModel === "isolated",
  ],
  "moonlit-thicket": [(s) => s.cosmologyStance === "animist", (s) => s.kinshipStructure === "clan-based", (s) => s.resourceScarcity === "moderate"],
};

export function suggestTheme(seed: CultureSeedParams): ThemeName {
  let best: ThemeName = THEME_NAMES[0];
  let bestScore = -1;
  for (const name of THEME_NAMES) {
    const score = AUTO_SUGGEST_TRIGGERS[name].filter((trigger) => trigger(seed)).length;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

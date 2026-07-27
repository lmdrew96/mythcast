// Pantheon-layer validation (spec Section 6, per-layer specifics per Section 4).
//
// The interesting check here isn't just "is the mismatch flag present" —
// it's independently recomputing what the domain(s) would expect and
// checking the flag actually matches reality, in both directions: a real
// deviation with no flag is a bug; a flag with no real deviation is also a
// bug (a false alarm is still wrong, just in the other direction).

import type { CultureProfile, God } from "../types";
import { DOMAIN_CANDIDATES } from "../pantheon/domains";
import { dedupTraits } from "../pantheon/generate";
import { checkTraced, evaluateRule, type ContradictionRule } from "./core";
import type { ValidationReport } from "./types";

const GOD_TRACE_PREFIXES = ["seed.", "culture."];

function expectedTraitsFor(culture: CultureProfile, god: God): string[] {
  const traits = god.domains.value.flatMap((domainName) => {
    const candidate = DOMAIN_CANDIDATES.find((d) => d.domain === domainName);
    return candidate ? candidate.deriveTraits(culture) : [];
  });
  return dedupTraits(traits);
}

function sameTraits(a: string[], b: string[]): boolean {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.length === sortedB.length && sortedA.every((t, i) => t === sortedB[i]);
}

type GodSubject = { culture: CultureProfile; god: God };

/** A real personality deviation from what the domain(s) expect. Classified as flagged (feature) when personalityMismatch.isMismatch is true, bug (unflagged deviation) otherwise — this is the exact mechanism spec Section 4/6 describes. */
const PERSONALITY_DEVIATION_RULE: ContradictionRule<GodSubject> = {
  description: "personality doesn't match what the god's domain(s) would lead the culture to expect",
  detect: ({ culture, god }) => !sameTraits(god.personality.value, expectedTraitsFor(culture, god)),
  isFlagged: ({ god }) => god.personalityMismatch.isMismatch,
};

/** The inverse failure mode: the generator flagged a mismatch, but the stored personality doesn't actually differ from what was expected — a false alarm, always a bug since there's no such thing as an "intentional" false flag. */
const FALSE_POSITIVE_FLAG_RULE: ContradictionRule<GodSubject> = {
  description: "personalityMismatch.isMismatch is true, but the personality doesn't actually differ from the domain-expected traits",
  detect: ({ culture, god }) => god.personalityMismatch.isMismatch && sameTraits(god.personality.value, expectedTraitsFor(culture, god)),
  isFlagged: () => false,
};

export function validatePantheon(culture: CultureProfile, pantheon: God[]): ValidationReport {
  const perGod = pantheon.flatMap((god) => {
    const subject: GodSubject = { culture, god };
    return [
      ...evaluateRule(PERSONALITY_DEVIATION_RULE, subject, "pantheon", `god:${god.id}.personality`),
      ...evaluateRule(FALSE_POSITIVE_FLAG_RULE, subject, "pantheon", `god:${god.id}.personalityMismatch`),
      ...checkTraced(god.domains.derivedFrom, `god:${god.id}.domains`, "pantheon", GOD_TRACE_PREFIXES),
      ...checkTraced(god.personality.derivedFrom, `god:${god.id}.personality`, "pantheon", GOD_TRACE_PREFIXES),
    ];
  });

  // Domain uniqueness is always a bug if violated — there's no flag concept
  // for two gods sharing a domain (the generator is supposed to prevent it
  // entirely; the validator checks independently rather than trusting that).
  const allDomains = pantheon.flatMap((g) => g.domains.value);
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const d of allDomains) {
    if (seen.has(d)) duplicated.add(d);
    seen.add(d);
  }
  const domainBugs = Array.from(duplicated).map((domain) => ({
    severity: "bug" as const,
    layer: "pantheon" as const,
    path: "pantheon.domains",
    message: `domain "${domain}" is assigned to more than one god with no explanation`,
  }));

  return {
    bugs: [...perGod.filter((i) => i.severity === "bug"), ...domainBugs],
    flagged: perGod.filter((i) => i.severity === "flagged"),
  };
}

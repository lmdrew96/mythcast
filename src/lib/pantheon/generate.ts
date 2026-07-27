// Pantheon Generator (spec Section 4): Culture Profile -> gods.
//
// - Size scales with Culture Profile richness, no fixed god count.
// - Domains are a weighted pick from what the culture's seed/values/taboos
//   actually call for (domains.ts), not a checklist every pantheon fills.
// - Personality is mostly derived from the culture's relationship to a
//   god's domain(s), with a weighted (not coin-flip) chance of an
//   intentional mismatch — flagged, never silent, so it becomes a Myth
//   Layer hook later rather than reading as a generation bug.

import { Rng, hashString } from "../rng";
import { generateUniqueName } from "../names";
import type { CultureProfile, God } from "../types";
import { DOMAIN_CANDIDATES, compatibleDomainsFor, invertTraits, type DomainCandidate } from "./domains";

const MISMATCH_CHANCE = 0.15;
const CONSOLIDATION_CHANCE = 0.35;

export function pantheonRngSeed(culture: CultureProfile, salt = 0): number {
  return hashString(culture.id + ":pantheon:" + salt) >>> 0;
}

/**
 * No fixed god count — scales with how much texture the Culture Profile
 * actually has (spec Section 4; exact formula was an open question per
 * Section 10 #1, resolved here at Polish/Tuning).
 *
 * Culture Generator (Phase 2) always picks exactly 5 core values and 4
 * taboos — those two counts never vary per culture, so a formula built
 * only from them (plus flaggedTensions, which per tensions.ts can only
 * ever be 0 or 1, since every tension rule keys off a single threatModel
 * value) collapses almost all richness variation away. Empirically, the
 * original richness/2 formula produced ONLY sizes 5-6 across 500 random
 * cultures (see Tangle note on this tuning pass). "Distinct fears/threats"
 * — the scaling driver spec Section 4 actually names — is approximated
 * here as duress signals that DO vary per seed: an active external threat,
 * real material scarcity, and/or a cosmology complex enough to need more
 * distinct god-concepts to reconcile. Weighted so every size in [3, 8] is
 * reachable by some real seed combination, not just the middle of the range.
 */
export function pantheonSize(culture: CultureProfile): number {
  const duressSignals = [
    culture.seed.threatModel !== "isolated",
    culture.seed.resourceScarcity === "scarce" || culture.seed.resourceScarcity === "famine-prone",
    culture.seed.cosmologyStance === "dualist" || culture.seed.cosmologyStance === "polytheist-ancestral",
  ].filter(Boolean).length;

  const richness = culture.coreValues.value.length + culture.taboos.value.length + culture.flaggedTensions.length * 3 + duressSignals * 4;
  return Math.max(3, Math.min(8, Math.round(richness / 3)));
}

export function dedupTraits(traits: string[]): string[] {
  return Array.from(new Set(traits)).slice(0, 4);
}

export function generatePantheon(culture: CultureProfile, rngSeed?: number): God[] {
  const resolvedRngSeed = rngSeed ?? pantheonRngSeed(culture);
  const rng = new Rng(resolvedRngSeed);
  const size = pantheonSize(culture);

  const primaries = rng.weightedRank(DOMAIN_CANDIDATES, (d) => d.weight(culture), size);
  // Every primary is reserved up front so a secondary pick for an earlier
  // god can never collide with a domain that's a *later* god's primary.
  const usedDomains = new Set<string>(primaries.map((d) => d.domain));

  const gods: God[] = [];
  const takenNames = new Set<string>();

  for (let i = 0; i < primaries.length; i++) {
    const primary = primaries[i];

    let secondary: DomainCandidate | undefined;
    if (rng.chance(CONSOLIDATION_CHANCE)) {
      const compatibleNames = compatibleDomainsFor(primary.domain).filter((name) => !usedDomains.has(name));
      const compatibleCandidates = DOMAIN_CANDIDATES.filter((d) => compatibleNames.includes(d.domain));
      if (compatibleCandidates.length > 0) {
        secondary = rng.pick(compatibleCandidates);
        usedDomains.add(secondary.domain);
      }
    }

    const domainList = secondary ? [primary, secondary] : [primary];
    const domainNames = domainList.map((d) => d.domain);
    const domainDerivedFrom = Array.from(new Set(domainList.flatMap((d) => d.relevantFrom)));

    const expectedTraits = dedupTraits(domainList.flatMap((d) => d.deriveTraits(culture)));
    const isMismatch = rng.chance(MISMATCH_CHANCE);
    const finalTraits = isMismatch ? dedupTraits(invertTraits(expectedTraits)) : expectedTraits;

    const name = generateUniqueName(culture.namingConvention.value, rng, takenNames);
    takenNames.add(name);

    gods.push({
      id: `god-${resolvedRngSeed.toString(16)}-${i}`,
      name,
      domains: { value: domainNames, derivedFrom: domainDerivedFrom },
      personality: { value: finalTraits, derivedFrom: domainDerivedFrom },
      personalityMismatch: isMismatch
        ? {
            isMismatch: true,
            expectedPersonality: expectedTraits.join(", "),
            explanationHook: `${name}'s worshippers have no accepted account of why the god of ${domainNames.join(" and ")} defies what ${domainNames.length > 1 ? "these domains" : "this domain"} would lead one to expect — a story someone hasn't told yet.`,
          }
        : { isMismatch: false },
      cultureId: culture.id,
    });
  }

  return gods;
}

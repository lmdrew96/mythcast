// Culture Generator (spec Section 3): seed params -> full Culture Profile.
// Most fields are produced via a weighted roll over a candidate pool keyed
// to the seed (see pools.ts) — traceable in hindsight (the winning
// candidate's relevantKeys), not predictable in advance (it's still a
// roll). A few fields (conflict-resolution norms, authority, inheritance)
// are direct prose restatements of a single enum seed param rather than
// generated content, so those stay deterministic lookups instead — see the
// comment in pools.ts above CONFLICT_RESOLUTION_BY_GOVERNMENT. Tension
// between seed params is detected, never injected (tensions.ts).

import { Rng, hashString } from "../rng";
import type { CultureProfile, CultureSeedParams, Traced } from "../types";
import { buildNamingConvention } from "./naming";
import { detectFlaggedTensions } from "./tensions";
import {
  AUTHORITY_BY_GOVERNMENT,
  BEAUTIFUL_CANDIDATES,
  CLIMATE_FEATURE,
  COMING_OF_AGE_CANDIDATES,
  CONFLICT_RESOLUTION_BY_GOVERNMENT,
  CORE_VALUE_CANDIDATES,
  DEATH_RITES_CANDIDATES,
  ECONOMIC_STRUCTURE_CANDIDATES,
  GENDER_ROLE_CANDIDATES,
  INHERITANCE_BY_KINSHIP,
  NAMING_TEXTURE_CANDIDATES,
  ORIGIN_NARRATIVE_BY_COSMOLOGY,
  SACRED_TO_DEPICT_CANDIDATES,
  SEASONAL_RITUAL_CANDIDATES,
  TABOO_CANDIDATES,
  UGLY_CANDIDATES,
  pickOne,
  pickRanked,
} from "./pools";

function lookup<T>(value: T, ...fromKeys: (keyof CultureSeedParams)[]): Traced<T> {
  return { value, derivedFrom: fromKeys.map((k) => `seed.${k}`) };
}

/** Derives a numeric RNG seed from the seed params plus an optional salt, so the same seed always reproduces the same culture (spec Section 7). */
export function cultureRngSeed(seed: CultureSeedParams, salt = 0): number {
  return hashString(JSON.stringify(seed) + ":" + salt) >>> 0;
}

export function generateCulture(seed: CultureSeedParams, rngSeed?: number): CultureProfile {
  const resolvedRngSeed = rngSeed ?? cultureRngSeed(seed);
  const rng = new Rng(resolvedRngSeed);

  const coreValues = pickRanked(rng, seed, CORE_VALUE_CANDIDATES, 5);
  const taboos = pickRanked(rng, seed, TABOO_CANDIDATES, 4);
  const conflictResolutionNorms = lookup(CONFLICT_RESOLUTION_BY_GOVERNMENT[seed.governmentType], "governmentType");

  const authority = lookup(AUTHORITY_BY_GOVERNMENT[seed.governmentType], "governmentType");
  const inheritance = lookup(INHERITANCE_BY_KINSHIP[seed.kinshipStructure], "kinshipStructure");
  const socialStructure = {
    value: { authority: authority.value, inheritance: inheritance.value },
    derivedFrom: Array.from(new Set([...authority.derivedFrom, ...inheritance.derivedFrom])),
  };

  const comingOfAge = pickOne(rng, seed, COMING_OF_AGE_CANDIDATES);
  const deathRites = pickOne(rng, seed, DEATH_RITES_CANDIDATES);
  const seasonal = pickRanked(rng, seed, SEASONAL_RITUAL_CANDIDATES, 2);
  const ritualPractices = {
    value: { comingOfAge: comingOfAge.value, deathRites: deathRites.value, seasonal: seasonal.value },
    derivedFrom: Array.from(new Set([...comingOfAge.derivedFrom, ...deathRites.derivedFrom, ...seasonal.derivedFrom])),
  };

  const beautiful = pickRanked(rng, seed, BEAUTIFUL_CANDIDATES, 3);
  const ugly = pickRanked(rng, seed, UGLY_CANDIDATES, 2);
  const sacredToDepict = pickRanked(rng, seed, SACRED_TO_DEPICT_CANDIDATES, 2);
  const artSensibility = {
    value: { beautiful: beautiful.value, ugly: ugly.value, sacredToDepict: sacredToDepict.value },
    derivedFrom: Array.from(new Set([...beautiful.derivedFrom, ...ugly.derivedFrom, ...sacredToDepict.derivedFrom])),
  };

  const economicStructure = pickOne(rng, seed, ECONOMIC_STRUCTURE_CANDIDATES);
  const genderRoleNorms = pickOne(rng, seed, GENDER_ROLE_CANDIDATES);

  const originNarrative = lookup(
    ORIGIN_NARRATIVE_BY_COSMOLOGY[seed.cosmologyStance](CLIMATE_FEATURE[seed.climate]),
    "cosmologyStance",
    "climate",
  );

  const texture = pickOne(rng, seed, NAMING_TEXTURE_CANDIDATES);
  const namingConvention = {
    value: buildNamingConvention(texture.value),
    derivedFrom: texture.derivedFrom,
  };

  return {
    id: `culture-${resolvedRngSeed.toString(16)}`,
    seed,
    coreValues,
    taboos,
    conflictResolutionNorms,
    socialStructure,
    ritualPractices,
    artSensibility,
    economicStructure,
    genderRoleNorms,
    originNarrative,
    namingConvention,
    flaggedTensions: detectFlaggedTensions(seed),
  };
}

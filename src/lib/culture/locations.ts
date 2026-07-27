// Named Locations (2026-07-27 DM-worldbuilding gap report, high-value add
// #4): `settlementPattern` is a category, not an actual place — a DM needs
// something to put a pin on. Synthesizes 1-3 named, traceable places from
// culture + founding-myth data that's already generated (no new generation
// primitives beyond naming): a capital, a sacred site tied to the origin
// myth, and the place a taboo is actually about.

import { Rng, hashString } from "../rng";
import { generateName } from "../names";
import type { CultureProfile, Myth, MythHookContext } from "../types";

export type LocationKind = "capital" | "sacred-site" | "taboo-site";

export type Location = {
  id: string;
  name: string;
  kind: LocationKind;
  description: string;
  derivedFrom: string[];
};

const SETTLEMENT_PHRASE: Record<CultureProfile["seed"]["settlementPattern"], string> = {
  nomadic: "wherever the current camp stands",
  "semi-nomadic": "the largest of the season's camps",
  "fixed-agrarian": "the largest of the fixed settlements",
  urban: "the walled city at the culture's center",
};

export function locationsRngSeed(culture: CultureProfile, salt = 0): number {
  return hashString(culture.id + ":locations:" + salt) >>> 0;
}

export function generateLocations(culture: CultureProfile, myths: Myth[], rngSeed?: number): Location[] {
  const resolvedRngSeed = rngSeed ?? locationsRngSeed(culture);
  const rng = new Rng(resolvedRngSeed);
  const locations: Location[] = [];
  let index = 0;

  const authority = culture.socialStructure.value.authority;
  const settlementDesc = SETTLEMENT_PHRASE[culture.seed.settlementPattern];
  locations.push({
    id: `location-${resolvedRngSeed.toString(16)}-${index++}`,
    name: generateName(culture.namingConvention.value, rng),
    kind: "capital",
    description: `Seat of ${authority}, ${settlementDesc}.`,
    derivedFrom: ["seed.settlementPattern", "culture.socialStructure"],
  });

  const originMyth = myths.find((m) => m.hookContext.kind === "origin");
  if (originMyth) {
    const ctx = originMyth.hookContext as Extract<MythHookContext, { kind: "origin" }>;
    locations.push({
      id: `location-${resolvedRngSeed.toString(16)}-${index++}`,
      name: generateName(culture.namingConvention.value, rng),
      kind: "sacred-site",
      description: `Where ${ctx.godName} is said to have acted in the origin story — the culture's most sacred ground.`,
      derivedFrom: ["culture.originNarrative", `myth:${originMyth.id}`],
    });
  }

  const cautionaryMyth = myths.find((m) => m.hookContext.kind === "cautionary");
  if (cautionaryMyth) {
    const ctx = cautionaryMyth.hookContext as Extract<MythHookContext, { kind: "cautionary" }>;
    locations.push({
      id: `location-${resolvedRngSeed.toString(16)}-${index++}`,
      name: generateName(culture.namingConvention.value, rng),
      kind: "taboo-site",
      description: `Where ${ctx.offender} broke the taboo against ${ctx.taboo} — still avoided, or watched closely.`,
      derivedFrom: ["culture.taboos", `myth:${cautionaryMyth.id}`],
    });
  }

  return locations;
}

// Named Factions (2026-07-27 DM-worldbuilding gap report, high-value add
// #6). DMs think in organizations, not just individual gods. Synthesizes
// 1-3 named factions from data the myth generator already produced
// (hookContext for cautionary/tension/rival-relationship myths) — no new
// generation primitives, just a synthesis layer.

import { Rng, hashString } from "../rng";
import type { CultureProfile, Myth, MythHookContext } from "../types";

export type FactionKind = "priesthood" | "enforcer-clan" | "tension-cult" | "rival-cult";

export type Faction = {
  id: string;
  name: string;
  kind: FactionKind;
  goal: string;
  allegiance: string;
  derivedFrom: string[];
};

export function factionsRngSeed(culture: CultureProfile, salt = 0): number {
  return hashString(culture.id + ":factions:" + salt) >>> 0;
}

export function generateFactions(culture: CultureProfile, myths: Myth[], rngSeed?: number): Faction[] {
  const resolvedRngSeed = rngSeed ?? factionsRngSeed(culture);
  const rng = new Rng(resolvedRngSeed);
  const candidates: Faction[] = [];
  let index = 0;

  const originMyth = myths.find((m) => m.hookContext.kind === "origin");
  if (originMyth) {
    const ctx = originMyth.hookContext as Extract<MythHookContext, { kind: "origin" }>;
    candidates.push({
      id: `faction-${resolvedRngSeed.toString(16)}-${index++}`,
      name: `The Priesthood of ${ctx.godName}`,
      kind: "priesthood",
      goal: `Preserve the origin narrative and uphold ${rng.pick(culture.coreValues.value)}.`,
      allegiance: ctx.godName,
      derivedFrom: ["culture.originNarrative", `myth:${originMyth.id}`],
    });
  }

  const cautionaryMyths = myths.filter((m) => m.hookContext.kind === "cautionary");
  if (cautionaryMyths.length > 0) {
    const myth = rng.pick(cautionaryMyths);
    const ctx = myth.hookContext as Extract<MythHookContext, { kind: "cautionary" }>;
    candidates.push({
      id: `faction-${resolvedRngSeed.toString(16)}-${index++}`,
      name: `The Watch Against ${ctx.taboo}`,
      kind: "enforcer-clan",
      goal: `Prevent anyone from repeating what ${ctx.offender} once did.`,
      allegiance: ctx.godName,
      derivedFrom: ["culture.taboos", `myth:${myth.id}`],
    });
  }

  const tensionMyths = myths.filter((m) => m.hookContext.kind === "tension");
  if (tensionMyths.length > 0) {
    const myth = rng.pick(tensionMyths);
    const ctx = myth.hookContext as Extract<MythHookContext, { kind: "tension" }>;
    candidates.push({
      id: `faction-${resolvedRngSeed.toString(16)}-${index++}`,
      name: `Heirs of ${ctx.seeker}`,
      kind: "tension-cult",
      goal: `Finish what ${ctx.seeker} started — resolve what ${ctx.godName} leaves unsettled.`,
      allegiance: ctx.godName,
      derivedFrom: [`myth:${myth.id}`],
    });
  }

  const rivalryMyths = myths.filter((m) => m.hookContext.kind === "relationship" && m.hookContext.relationshipType === "rival-of");
  if (rivalryMyths.length > 0) {
    const myth = rng.pick(rivalryMyths);
    const ctx = myth.hookContext as Extract<MythHookContext, { kind: "relationship" }>;
    const side = rng.chance(0.5) ? ctx.fromName : ctx.toName;
    candidates.push({
      id: `faction-${resolvedRngSeed.toString(16)}-${index++}`,
      name: `Followers of ${side}`,
      kind: "rival-cult",
      goal: `Keep the old quarrel between ${ctx.fromName} and ${ctx.toName} alive, on ${side}'s side of it.`,
      allegiance: side,
      derivedFrom: [`myth:${myth.id}`],
    });
  }

  if (candidates.length === 0) return [];
  const [first, ...rest] = candidates;
  return [first, ...rng.shuffle(rest)].slice(0, 3);
}

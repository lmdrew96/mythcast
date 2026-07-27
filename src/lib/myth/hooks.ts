// Adventure Hook Synthesizer: turns a founding myth's already-generated
// content into a one-line DM-usable hook — pure downstream synthesis of
// each myth generator's `hookContext` (myth/generate.ts), no new
// generation primitives. Every myth kind (origin/cautionary/mismatch/
// relationship/tension) gets a hook; the rivalry/tension/mismatch
// archetypes are the richest source material per the DM-worldbuilding gap
// report, but there's no reason to leave the other two kinds hookless.

import type { MythHookContext } from "../types";

function relationshipHook(ctx: Extract<MythHookContext, { kind: "relationship" }>): string {
  switch (ctx.relationshipType) {
    case "rival-of":
      return `The standing quarrel between ${ctx.fromName} and ${ctx.toName} flares up again — their followers need someone neutral (or exploitable) to mediate.`;
    case "parent-of":
      return `A claimant says they're a mortal descendant of ${ctx.toName}'s line from ${ctx.fromName} — and wants proof, or wants it disproven.`;
    case "consort-of":
      return `A rite meant to honor ${ctx.fromName} and ${ctx.toName} together has been performed incorrectly, and something is demanding it be redone right.`;
    case "usurped-by":
      return `A cult still loyal to the diminished ${ctx.fromName} is stirring, refusing to accept ${ctx.toName}'s claim.`;
  }
}

/** Produces a one-line DM adventure hook for a founding myth, derived purely from the `hookContext` its generator already captured. */
export function generateAdventureHook(myth: { hookContext: MythHookContext }): string {
  const ctx = myth.hookContext;
  switch (ctx.kind) {
    case "origin":
      return `A shrine tied to ${ctx.godName}'s founding act has begun acting strangely, and the old origin story is the only clue why.`;
    case "cautionary":
      return `Someone is accused of breaking the taboo against ${ctx.taboo} — just as ${ctx.offender} once did — and ${ctx.godName} is said to notice everything.`;
    case "mismatch":
      return `${ctx.godName}'s true reason for changing has never been told — a lead on the secret ${ctx.witness} died keeping has just surfaced, and someone wants it kept buried.`;
    case "tension":
      return `Someone is trying to succeed where ${ctx.seeker} failed — resolving what ${ctx.godName} leaves unsettled, whatever the cost.`;
    case "relationship":
      return relationshipHook(ctx);
  }
}

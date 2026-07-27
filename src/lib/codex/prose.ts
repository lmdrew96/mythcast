// Codex prose rendering (spec Section 8, Section 2's structure/prose split):
// turns already-structured generator output (Culture Profile, God, Myth
// event sequence) into the readable in-world text the codex export
// renders. Every myth event already carries a natural-language
// `description` (see myth/generate.ts), so rendering a myth as prose is a
// direct join of those descriptions in event order — no separate NLG layer
// needed, keeping this proportional to what the data already provides.

import type { CultureProfile, God, Myth, MythVariant } from "../types";

export type ProseMyth = {
  title: string;
  generation: number;
  paragraph: string;
};

export function mythToProse(myth: Myth): ProseMyth {
  return { title: myth.title, generation: myth.generation, paragraph: myth.events.map((e) => e.description).join(" ") };
}

/** A variant has no `.title` of its own (spec: it's a retelling of its parent) — the caller supplies the founding myth's title so the codex still reads as "the same myth, later telling." */
export function mythVariantToProse(variant: MythVariant, foundingTitle: string): ProseMyth {
  return { title: foundingTitle, generation: variant.generation, paragraph: variant.events.map((e) => e.description).join(" ") };
}

export function cultureToProseSummary(culture: CultureProfile): string {
  const values = culture.coreValues.value.join(", ");
  return `${culture.originNarrative.value} Above all, this people holds ${values}. ${culture.conflictResolutionNorms.value}`;
}

export function godToProse(god: God): string {
  const domains = god.domains.value.join(" and ");
  const personality = god.personality.value.join(", ");
  const mismatchNote = god.personalityMismatch.isMismatch ? " Stranger still: this runs against everything the people expected of a god of this domain." : "";
  return `${god.name}, keeper of ${domains}, is known as ${personality}.${mismatchNote}`;
}

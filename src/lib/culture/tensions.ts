// Emergent tension detection (spec Section 3/6). No forced-injection of
// conflict — these rules only ever *notice* tension that the seed param
// combination already implies, and flag it so the validator (Phase 5) can
// tell it apart from an actual, unflagged contradiction.

import type { CultureSeedParams, FlaggedTension } from "../types";

type TensionRule = {
  description: string;
  involvedFields: (keyof CultureSeedParams)[];
  applies: (seed: CultureSeedParams) => boolean;
};

const TENSION_RULES: TensionRule[] = [
  {
    description:
      "Isolationist by threat model, but scarce enough in resources to need what only outside trade could reliably provide — self-sufficiency is the ideal, dependency is the reality.",
    involvedFields: ["threatModel", "resourceScarcity"],
    applies: (s) => s.threatModel === "isolated" && ["scarce", "famine-prone"].includes(s.resourceScarcity),
  },
  {
    description:
      "A rival-clan threat model rewards fast, decisive responses, but the culture's own government requires slow consensus-building — the culture is structurally slower than the threats it faces.",
    involvedFields: ["threatModel", "governmentType"],
    applies: (s) => s.threatModel === "rival-clans" && ["council", "stateless-egalitarian"].includes(s.governmentType),
  },
  {
    description:
      "A high-exposure threat (predators or frequent disaster) sits against a mobile settlement pattern that can't easily fortify — safety would mean staying put, but staying put isn't how this culture lives.",
    involvedFields: ["threatModel", "settlementPattern"],
    applies: (s) => ["predators", "natural-disaster-prone"].includes(s.threatModel) && ["nomadic", "semi-nomadic"].includes(s.settlementPattern),
  },
  {
    description:
      "Colonizer pressure calls for a unified defense, but the culture has no central authority capable of organizing one — the threat that most needs coordination is the one this government is worst suited to meet.",
    involvedFields: ["threatModel", "governmentType"],
    applies: (s) => s.threatModel === "colonizer-pressure" && s.governmentType === "stateless-egalitarian",
  },
];

export function detectFlaggedTensions(seed: CultureSeedParams): FlaggedTension[] {
  return TENSION_RULES.filter((rule) => rule.applies(seed)).map((rule) => ({
    description: rule.description,
    involvedFields: rule.involvedFields.map((k) => `seed.${k}`),
  }));
}

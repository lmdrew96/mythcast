// Myth Generator (spec Section 5): Pantheon + Culture -> structured founding
// myths. Each myth is a typed event sequence — [god-acts, consequence,
// human-response, moral-outcome] — not free prose; the `description` on
// each event is a short readable label, not a narrative rendering (that's
// Phase 10's job per spec Section 2's structure/prose split). No mutation
// yet (Phase 7) — every myth here is generation 0.
//
// Three founding-myth kinds, per the patch spec ("origin stories,
// why-things-are-this-way, cautionary tales"):
//   - one origin myth, tied to the culture's origin narrative and its most
//     cosmologically-coded god
//   - one cautionary tale per 1-2 taboos, tied to a stern/vigilant god
//   - one myth per personality-mismatched god, explaining the mismatch —
//     this is the explicit validator hook from spec Section 4/6: a flagged
//     mismatch "becomes a hook for the next layer down."

import { Rng, hashString } from "../rng";
import { CLIMATE_FEATURE } from "../culture/pools";
import type { CultureProfile, God, Myth, MythEvent } from "../types";

export function mythRngSeed(culture: CultureProfile, salt = 0): number {
  return hashString(culture.id + ":myth:" + salt) >>> 0;
}

const COSMOLOGICAL_DOMAINS = ["the mountain and the earth", "sky and storm", "ancestors and lineage", "weather and seasons", "harvest and fertility"];
const PUNITIVE_TRAITS = ["stern", "vigilant", "impartial", "dutiful", "fierce", "unyielding", "watchful"];

type SettlementPattern = CultureProfile["seed"]["settlementPattern"];

const SETTLEMENT_PHRASE: Record<SettlementPattern, string> = {
  nomadic: "nomadic",
  "semi-nomadic": "semi-nomadic",
  "fixed-agrarian": "settled, field-tending",
  urban: "city-building",
};

function pickGodBy(rng: Rng, pantheon: God[], weight: (god: God) => number): God {
  return rng.weightedPick(pantheon, weight);
}

function event(rng: Rng, type: MythEvent["type"], variants: string[], involvedGodIds: string[], derivedFrom: string[]): MythEvent {
  return { type, description: rng.pick(variants), involvedGodIds, derivedFrom };
}

function generateOriginMyth(culture: CultureProfile, pantheon: God[], rng: Rng, index: number, rngSeed: number): Myth {
  const god = pickGodBy(rng, pantheon, (g) => 1 + (g.domains.value.some((d) => COSMOLOGICAL_DOMAINS.includes(d)) ? 6 : 0));
  const domainsStr = god.domains.value.join(" and ");
  const feature = CLIMATE_FEATURE[culture.seed.climate];
  const settlementPhrase = SETTLEMENT_PHRASE[culture.seed.settlementPattern];
  const comingOfAge = culture.ritualPractices.value.comingOfAge;
  const coreValue = rng.pick(culture.coreValues.value);

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [
        `${god.name}, keeper of ${domainsStr}, shaped ${feature} before the first people opened their eyes.`,
        `Before there were people to remember it, ${god.name} moved through ${feature} and left the shape of the world behind.`,
      ],
      [god.id],
      [`god:${god.id}.domains`, "culture.originNarrative"],
    ),
    event(
      rng,
      "consequence",
      [
        `From that shaping came the ${settlementPhrase} life the people still know.`,
        `Everything that followed — the ${settlementPhrase} way of living — traces back to that first act.`,
      ],
      [god.id],
      ["seed.settlementPattern"],
    ),
    event(
      rng,
      "human-response",
      [`In answer, the people began the practice of ${comingOfAge}.`, `The people took up ${comingOfAge} to keep faith with what ${god.name} had done.`],
      [god.id],
      ["culture.ritualPractices"],
    ),
    event(
      rng,
      "moral-outcome",
      [`This is why ${coreValue} is held above all else.`, `And so ${coreValue} became the thing this culture will not set down.`],
      [god.id],
      ["culture.coreValues"],
    ),
  ];

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: `${god.name} and the First Days`,
    events,
    cultureId: culture.id,
    generation: 0,
  };
}

function generateCautionaryTale(culture: CultureProfile, pantheon: God[], taboo: string, rng: Rng, index: number, rngSeed: number): Myth {
  const god = pickGodBy(rng, pantheon, (g) => 1 + (g.personality.value.some((t) => PUNITIVE_TRAITS.includes(t)) ? 5 : 0));
  const trait = rng.pick(god.personality.value);

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [`${god.name} watched as someone broke the old rule against ${taboo}.`, `It's said ${god.name} sees every act of ${taboo}, even the ones done in secret.`],
      [god.id],
      ["culture.taboos"],
    ),
    event(
      rng,
      "consequence",
      [
        `${god.name} answered with ${trait} judgment, and the offender did not go unmarked.`,
        `What followed was swift and ${trait} — ${god.name} does not warn twice.`,
      ],
      [god.id],
      [`god:${god.id}.personality`],
    ),
    event(
      rng,
      "human-response",
      [
        `The people saw, and remembered; from then on ${taboo} was spoken of only as a warning.`,
        `Word of it spread, and the people quietly agreed never to test ${god.name} the same way.`,
      ],
      [god.id],
      ["culture.taboos"],
    ),
    event(
      rng,
      "moral-outcome",
      [`So the people learned: ${taboo} is not merely frowned upon — it invites ${god.name}'s notice.`, `Even now, ${taboo} is the kind of thing no one in this culture risks twice.`],
      [god.id],
      ["culture.taboos"],
    ),
  ];

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: `The Tale of ${god.name} and the Broken Rule (${taboo})`,
    events,
    cultureId: culture.id,
    generation: 0,
  };
}

function generateMismatchMyth(culture: CultureProfile, god: God, rng: Rng, index: number, rngSeed: number): Myth {
  const domainsStr = god.domains.value.join(" and ");
  const expected = god.personalityMismatch.expectedPersonality ?? "";
  const actual = god.personality.value.join(", ");

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [
        `Once, it's said, ${god.name} was as ${expected} as the people always expected of ${domainsStr}.`,
        `The old telling has ${god.name} once matching ${domainsStr} the way everyone assumed a god of that kind would.`,
      ],
      [god.id],
      [`god:${god.id}.personalityMismatch`],
    ),
    event(
      rng,
      "consequence",
      [`But something changed — the people argue about what — and ${god.name} was never the same again.`, `Then came a turn no one agrees on, and ${god.name} changed, for good, it seems.`],
      [god.id],
      [`god:${god.id}.personalityMismatch`],
    ),
    event(
      rng,
      "human-response",
      [`The people never settled on why; every elder tells it differently.`, `No two households tell the reason the same way, and none claim to be certain.`],
      [god.id],
      [`god:${god.id}.personalityMismatch`],
    ),
    event(
      rng,
      "moral-outcome",
      [
        `Now ${god.name} is known as ${actual}, and the disagreement itself has become part of the telling.`,
        `So ${god.name} remains ${actual} — unexplained, and somehow more sacred for it.`,
      ],
      [god.id],
      [`god:${god.id}.personalityMismatch`, `god:${god.id}.personality`],
    ),
  ];

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: `${god.name}'s Unexplained Turn`,
    events,
    cultureId: culture.id,
    generation: 0,
  };
}

export function generateMyths(culture: CultureProfile, pantheon: God[], rngSeed?: number): Myth[] {
  const resolvedRngSeed = rngSeed ?? mythRngSeed(culture);
  const rng = new Rng(resolvedRngSeed);
  const myths: Myth[] = [];
  let index = 0;

  myths.push(generateOriginMyth(culture, pantheon, rng, index++, resolvedRngSeed));

  const tabooCount = Math.max(1, Math.min(2, culture.taboos.value.length));
  const chosenTaboos = rng.shuffle(culture.taboos.value).slice(0, rng.int(1, tabooCount));
  for (const taboo of chosenTaboos) {
    myths.push(generateCautionaryTale(culture, pantheon, taboo, rng, index++, resolvedRngSeed));
  }

  for (const god of pantheon.filter((g) => g.personalityMismatch.isMismatch)) {
    myths.push(generateMismatchMyth(culture, god, rng, index++, resolvedRngSeed));
  }

  return myths;
}

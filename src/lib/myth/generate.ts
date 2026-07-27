// Myth Generator (spec Section 5): Pantheon + Culture -> structured founding
// myths. Each myth is a typed event sequence — [god-acts, consequence,
// human-response, moral-outcome] — not free prose; the `description` on
// each event is a short readable label, not a narrative rendering (that's
// Phase 10's job per spec Section 2's structure/prose split). No mutation
// yet (Phase 7) — every myth here is generation 0.
//
// Five founding-myth kinds, per the patch spec ("origin stories,
// why-things-are-this-way, cautionary tales") plus two added to actually use
// data the Pantheon/Culture layers already generate but the myth layer
// previously ignored:
//   - one origin myth, tied to the culture's origin narrative and its most
//     cosmologically-coded god
//   - one cautionary tale per 1-3 taboos, tied to a stern/vigilant god,
//     starring a named mortal offender rather than a generic "someone"
//   - one myth per personality-mismatched god, explaining the mismatch —
//     this is the explicit validator hook from spec Section 4/6: a flagged
//     mismatch "becomes a hook for the next layer down."
//   - one myth per generated god-to-god relationship (parent-of/rival-of/
//     consort-of/usurped-by) — this data already exists (pantheon/
//     relationships.ts) and drives the Relationship Graph view, but nothing
//     previously turned it into myth content.
//   - one myth per flagged cultural tension (culture/tensions.ts) — spec
//     Section 6 explicitly calls flagged tensions a hook for "the next layer
//     down," same as personality mismatches; this dramatizes it instead of
//     leaving it as validator-only metadata.

import { Rng, hashString } from "../rng";
import { CLIMATE_FEATURE } from "../culture/pools";
import { generateGodRelationships, type GodRelationship, type GodRelationshipType } from "../pantheon/relationships";
import { generateUniqueName } from "../names";
import type { CultureProfile, FlaggedTension, God, Myth, MythEvent } from "../types";

export function mythRngSeed(culture: CultureProfile, salt = 0): number {
  return hashString(culture.id + ":myth:" + salt) >>> 0;
}

const COSMOLOGICAL_DOMAINS = ["the mountain and the earth", "sky and storm", "ancestors and lineage", "weather and seasons", "harvest and fertility"];
const PUNITIVE_TRAITS = ["stern", "vigilant", "impartial", "dutiful", "fierce", "unyielding", "watchful"];

type SettlementPattern = CultureProfile["seed"]["settlementPattern"];
type KinshipStructure = CultureProfile["seed"]["kinshipStructure"];
type EconomicStructure = CultureProfile["economicStructure"]["value"];

const SETTLEMENT_PHRASE: Record<SettlementPattern, string> = {
  nomadic: "nomadic",
  "semi-nomadic": "semi-nomadic",
  "fixed-agrarian": "settled, field-tending",
  urban: "city-building",
};

const KINSHIP_PHRASE: Record<KinshipStructure, string> = {
  patrilineal: "father-to-son lines",
  matrilineal: "mother-to-daughter lines",
  "clan-based": "clan loyalty above all",
  "non-kin-collective": "chosen kinship, not blood",
};

const ECONOMY_PHRASE: Record<EconomicStructure, string> = {
  "gift-economy": "a gift economy",
  barter: "barter",
  tribute: "a tribute system",
  "trade-based": "trade networks",
};

function pickGodBy(rng: Rng, pantheon: God[], weight: (god: God) => number): God {
  return rng.weightedPick(pantheon, weight);
}

function event(rng: Rng, type: MythEvent["type"], variants: string[], involvedGodIds: string[], derivedFrom: string[]): MythEvent {
  return { type, description: rng.pick(variants), involvedGodIds, derivedFrom };
}

function newMortalName(culture: CultureProfile, rng: Rng, takenNames: Set<string>): string {
  const name = generateUniqueName(culture.namingConvention.value, rng, takenNames);
  takenNames.add(name);
  return name;
}

function generateOriginMyth(culture: CultureProfile, pantheon: God[], rng: Rng, index: number, rngSeed: number): Myth {
  const god = pickGodBy(rng, pantheon, (g) => 1 + (g.domains.value.some((d) => COSMOLOGICAL_DOMAINS.includes(d)) ? 6 : 0));
  const domainsStr = god.domains.value.join(" and ");
  const feature = CLIMATE_FEATURE[culture.seed.climate];
  const settlementPhrase = SETTLEMENT_PHRASE[culture.seed.settlementPattern];
  const kinshipPhrase = KINSHIP_PHRASE[culture.seed.kinshipStructure];
  const economyPhrase = ECONOMY_PHRASE[culture.economicStructure.value];
  const comingOfAge = culture.ritualPractices.value.comingOfAge;
  const authority = culture.socialStructure.value.authority;
  const coreValue = rng.pick(culture.coreValues.value);

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [
        `${god.name}, keeper of ${domainsStr}, shaped ${feature} before the first people opened their eyes.`,
        `Before there were people to remember it, ${god.name} moved through ${feature} and left the shape of the world behind.`,
        `It's told that ${god.name} worked alone through ${feature}, with no one there yet to witness it, let alone thank them.`,
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
        `That first shaping is why the people still organize themselves by ${kinshipPhrase}, tracing the arrangement straight back to ${god.name}.`,
      ],
      [god.id],
      ["seed.settlementPattern", "seed.kinshipStructure"],
    ),
    event(
      rng,
      "human-response",
      [
        `In answer, the people began the practice of ${comingOfAge}.`,
        `The people took up ${comingOfAge} to keep faith with what ${god.name} had done.`,
        `Alongside ${comingOfAge}, the people built ${economyPhrase} they still credit to ${god.name}'s example.`,
      ],
      [god.id],
      ["culture.ritualPractices", "culture.economicStructure"],
    ),
    event(
      rng,
      "moral-outcome",
      [
        `This is why ${coreValue} is held above all else.`,
        `And so ${coreValue} became the thing this culture will not set down.`,
        `Because of it, ${authority} answers to ${coreValue} before anything else — or claims to.`,
      ],
      [god.id],
      ["culture.coreValues", "culture.socialStructure"],
    ),
  ];

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: `${god.name} and the First Days`,
    events,
    cultureId: culture.id,
    generation: 0,
    hookContext: { kind: "origin", godName: god.name },
  };
}

function generateCautionaryTale(culture: CultureProfile, pantheon: God[], taboo: string, rng: Rng, index: number, rngSeed: number, takenNames: Set<string>): Myth {
  const god = pickGodBy(rng, pantheon, (g) => 1 + (g.personality.value.some((t) => PUNITIVE_TRAITS.includes(t)) ? 5 : 0));
  const trait = rng.pick(god.personality.value);
  const authority = culture.socialStructure.value.authority;
  const offender = newMortalName(culture, rng, takenNames);

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [
        `${god.name} watched as ${offender} broke the old rule against ${taboo}.`,
        `It's said ${god.name} sees every act of ${taboo}, even the ones done in secret — even ${offender}'s.`,
        `They say ${offender} thought no one was watching when they broke the rule against ${taboo} — but ${god.name} sees what even ${authority} cannot.`,
      ],
      [god.id],
      ["culture.taboos", "culture.socialStructure"],
    ),
    event(
      rng,
      "consequence",
      [
        `${god.name} answered with ${trait} judgment, and ${offender} did not go unmarked.`,
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
        `Word of it spread, and the people quietly agreed never to test ${god.name} the way ${offender} had.`,
        `Word reached ${authority}, and from then on ${offender}'s name was the one told to children who asked why ${taboo} matters.`,
      ],
      [god.id],
      ["culture.taboos", "culture.socialStructure"],
    ),
    event(
      rng,
      "moral-outcome",
      [
        `So the people learned: ${taboo} is not merely frowned upon — it invites ${god.name}'s notice.`,
        `Even now, ${taboo} is the kind of thing no one in this culture risks twice.`,
        `Even now, when ${authority} needs a warning short enough to remember, it's ${offender}'s name they use.`,
      ],
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
    hookContext: { kind: "cautionary", godName: god.name, taboo, offender },
  };
}

function generateMismatchMyth(culture: CultureProfile, god: God, rng: Rng, index: number, rngSeed: number, takenNames: Set<string>): Myth {
  const domainsStr = god.domains.value.join(" and ");
  const expected = god.personalityMismatch.expectedPersonality ?? "";
  const actual = god.personality.value.join(", ");
  const witness = newMortalName(culture, rng, takenNames);

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
      [
        `The people never settled on why; every elder tells it differently.`,
        `No two households tell the reason the same way, and none claim to be certain.`,
        `One elder, ${witness}, claimed to know the reason once — and refused to say, right up until they died.`,
      ],
      [god.id],
      [`god:${god.id}.personalityMismatch`],
    ),
    event(
      rng,
      "moral-outcome",
      [
        `Now ${god.name} is known as ${actual}, and the disagreement itself has become part of the telling.`,
        `So ${god.name} remains ${actual} — unexplained, and somehow more sacred for it.`,
        `So the people settled on ${actual}, and on ${witness}'s silence as the closest thing to an answer they'll ever get.`,
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
    hookContext: { kind: "mismatch", godName: god.name, witness },
  };
}

function generateRelationshipMyth(culture: CultureProfile, pantheon: God[], relationship: GodRelationship, rng: Rng, index: number, rngSeed: number): Myth {
  const from = pantheon.find((g) => g.id === relationship.fromGodId);
  const to = pantheon.find((g) => g.id === relationship.toGodId);
  if (!from || !to) throw new Error(`generateRelationshipMyth: dangling god reference in relationship ${relationship.fromGodId}->${relationship.toGodId}`);

  const fromDomains = from.domains.value.join(" and ");
  const toDomains = to.domains.value.join(" and ");
  // A single representative domain per god, for clauses that put both gods'
  // domains side by side in one sentence — joining two full (possibly
  // multi-domain) lists there reads as an unreadable run-on, so those
  // clauses use one domain each instead of the full consolidated list.
  const fromDomain = rng.pick(from.domains.value);
  const toDomain = rng.pick(to.domains.value);
  const fromTrait = rng.pick(from.personality.value);
  const toTrait = rng.pick(to.personality.value);
  const derivedFromBoth = [`god:${from.id}.domains`, `god:${to.id}.domains`, `god:${from.id}.personality`, `god:${to.id}.personality`];
  const involved = [from.id, to.id];

  let titleOptions: string[];
  let events: MythEvent[];

  switch (relationship.type as GodRelationshipType) {
    case "parent-of":
      titleOptions = [`How ${to.name} Came From ${from.name}`, `${from.name}'s Line: The Birth of ${to.name}`];
      events = [
        event(
          rng,
          "god-acts",
          [
            `${from.name}, keeper of ${fromDomains}, brought ${to.name} into being to hold what ${from.name} alone could not carry.`,
            `Long before ${to.name} had a name, ${from.name} shaped them from the same substance that governs ${fromDomains}.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "consequence",
          [
            `${to.name} grew into their own domain — ${toDomains} — distinct from ${from.name}'s, though the resemblance never fully faded.`,
            `In time ${to.name} was recognized as keeper of ${toDomains}, a child grown into their own authority.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "human-response",
          [`The people came to honor both in the same breath, one rite folding into the next.`, `Households still name ${from.name} first and ${to.name} second, whenever the two are invoked together.`],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "moral-outcome",
          [
            `This is why ${to.name}'s ${toDomain} is never spoken of without some mention of ${from.name}'s ${fromDomain} close behind.`,
            `So the people understand: what ${to.name} governs was never separate from what ${from.name} began.`,
          ],
          involved,
          derivedFromBoth,
        ),
      ];
      break;

    case "consort-of":
      titleOptions = [`${from.name} and ${to.name}, Bound Together`, `The Pairing of ${from.name} and ${to.name}`];
      events = [
        event(
          rng,
          "god-acts",
          [
            `${from.name}, ${fromTrait} in all things, first sought out ${to.name} across the distance between ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain}.`,
            `It's told that ${from.name} and ${to.name} found each other before either had worshippers to explain it to.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "consequence",
          [
            `Since then, ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain} have been treated as two halves of the same understanding.`,
            `Where ${from.name} is ${fromTrait} and ${to.name} is ${toTrait}, the pairing is said to balance rather than clash.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "human-response",
          [`No wedding or bonding rite is complete without naming both.`, `The people built shrines that face each other, one for ${from.name}, one for ${to.name}, so neither stands alone.`],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "moral-outcome",
          [
            `This is why devotion here is never asked to choose between ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain} — the culture holds both are owed at once.`,
            `So the people say: to honor one without the other is to only half understand either.`,
          ],
          involved,
          derivedFromBoth,
        ),
      ];
      break;

    case "usurped-by":
      titleOptions = [`How ${to.name} Took ${from.name}'s Place`, `${from.name}'s Fall, ${to.name}'s Rise`];
      events = [
        event(
          rng,
          "god-acts",
          [
            `${from.name} once held ${fromDomains} alone, ${fromTrait} and unchallenged — until ${to.name} came for it.`,
            `${to.name}, ${toTrait} where ${from.name} had grown complacent, moved against ${from.name}'s hold on ${fromDomains}.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "consequence",
          [
            `What ${from.name} could not defend, ${to.name} claimed — and much of ${fromDomains} passed into ${to.name}'s keeping.`,
            `${from.name} was not destroyed, only diminished; ${to.name} now speaks first where ${from.name} once spoke alone.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "human-response",
          [`Old shrines to ${from.name} still stand, though fewer offerings reach them now.`, `The people adjusted their prayers to ${to.name} without ever formally renouncing ${from.name}.`],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "moral-outcome",
          [
            `This is why the people say no domain is held forever — even a god can lose ground.`,
            `So it's told: ${to.name}'s claim to ${toDomains} is real, but it was ${from.name}'s first, and some remember that on purpose.`,
          ],
          involved,
          derivedFromBoth,
        ),
      ];
      break;

    case "rival-of":
    default:
      titleOptions = [`${from.name} and ${to.name}: An Old Grudge`, `The Standing Quarrel of ${from.name} and ${to.name}`];
      events = [
        event(
          rng,
          "god-acts",
          [
            `${from.name}, ${fromTrait} where ${to.name} is ${toTrait}, has never once agreed with ${to.name} on how ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain} ought to meet.`,
            `It's said ${from.name} and ${to.name} clashed before the people existed to take sides.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "consequence",
          [
            `Every telling of one god's deeds is, somewhere, an argument against the other's.`,
            `Neither has ever won outright — ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain} stay separate on purpose, kept apart by the standing quarrel.`,
          ],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "human-response",
          [`The people learned not to invoke both in the same rite, for fear of reopening it.`, `Some households favor ${from.name}, some ${to.name}, and the split runs old enough that no one remembers starting it.`],
          involved,
          derivedFromBoth,
        ),
        event(
          rng,
          "moral-outcome",
          [
            `This is why ${from.name}'s ${fromDomain} and ${to.name}'s ${toDomain} are still treated as opposed, whatever the truth of the original quarrel.`,
            `So the rivalry outlives any reason for it — ${from.name} and ${to.name} simply do not agree, and the people have stopped asking why.`,
          ],
          involved,
          derivedFromBoth,
        ),
      ];
      break;
  }

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: rng.pick(titleOptions),
    events,
    cultureId: culture.id,
    generation: 0,
    hookContext: { kind: "relationship", relationshipType: relationship.type, fromName: from.name, toName: to.name },
  };
}

/** Rough domain-substring hints per tension-rule seed field, used to weight-pick a thematically relevant god to anchor a tension myth on. Not exhaustive — a fallback flat weight keeps every pick valid even with no match. */
const TENSION_FIELD_DOMAIN_HINTS: Record<string, string[]> = {
  "seed.threatModel": ["war and protection", "hunting and beasts"],
  "seed.resourceScarcity": ["harvest and fertility", "healing and medicine"],
  "seed.governmentType": ["justice and law", "wisdom and knowledge"],
  "seed.settlementPattern": ["hearth and home", "trickery and luck", "trade and travel"],
};

function tensionRelevance(god: God, tension: FlaggedTension): boolean {
  const hintDomains = tension.involvedFields.flatMap((f) => TENSION_FIELD_DOMAIN_HINTS[f] ?? []);
  return god.domains.value.some((d) => hintDomains.includes(d));
}

function generateTensionMyth(culture: CultureProfile, pantheon: God[], tension: FlaggedTension, rng: Rng, index: number, rngSeed: number, takenNames: Set<string>): Myth {
  const god = pickGodBy(rng, pantheon, (g) => 1 + (tensionRelevance(g, tension) ? 5 : 0));
  const domainsStr = god.domains.value.join(" and ");
  const seeker = newMortalName(culture, rng, takenNames);
  const derivedFrom = Array.from(new Set([...tension.involvedFields, `god:${god.id}.domains`, `god:${god.id}.personality`]));

  const events: MythEvent[] = [
    event(
      rng,
      "god-acts",
      [
        `${god.name}, keeper of ${domainsStr}, is prayed to for two things at once that were never meant to sit together.`,
        `It's said ${seeker} was the first to notice it: ${god.name} answers one prayer, and in the same breath leaves another unanswered.`,
      ],
      [god.id],
      derivedFrom,
    ),
    event(
      rng,
      "consequence",
      [
        `Whichever way ${god.name} leans, someone goes without — the people have never found a telling where both sides are satisfied.`,
        `${seeker} tried once to resolve it outright, and only proved that no resolution holds for more than a season.`,
      ],
      [god.id],
      derivedFrom,
    ),
    event(
      rng,
      "human-response",
      [
        `So the people stopped expecting an answer and started living with the question instead.`,
        `Elders now teach ${seeker}'s attempt as a caution: don't try to settle what ${god.name} leaves open.`,
      ],
      [god.id],
      derivedFrom,
    ),
    event(
      rng,
      "moral-outcome",
      [
        `This is why the culture still carries the pull in both directions, unresolved, generation after generation.`,
        `So it remains: neither side wins, and no one who understands ${god.name} expects it to.`,
      ],
      [god.id],
      derivedFrom,
    ),
  ];

  return {
    id: `myth-${rngSeed.toString(16)}-${index}`,
    title: rng.pick([`${seeker}'s Unanswered Question`, `What ${god.name} Leaves Unsettled`]),
    events,
    cultureId: culture.id,
    generation: 0,
    hookContext: { kind: "tension", godName: god.name, seeker },
  };
}

export function generateMyths(culture: CultureProfile, pantheon: God[], rngSeed?: number): Myth[] {
  const resolvedRngSeed = rngSeed ?? mythRngSeed(culture);
  const rng = new Rng(resolvedRngSeed);
  const myths: Myth[] = [];
  const takenNames = new Set(pantheon.map((g) => g.name));
  let index = 0;

  myths.push(generateOriginMyth(culture, pantheon, rng, index++, resolvedRngSeed));

  const tabooCount = Math.max(1, Math.min(3, culture.taboos.value.length));
  const chosenTaboos = rng.shuffle(culture.taboos.value).slice(0, rng.int(1, tabooCount));
  for (const taboo of chosenTaboos) {
    myths.push(generateCautionaryTale(culture, pantheon, taboo, rng, index++, resolvedRngSeed, takenNames));
  }

  for (const god of pantheon.filter((g) => g.personalityMismatch.isMismatch)) {
    myths.push(generateMismatchMyth(culture, god, rng, index++, resolvedRngSeed, takenNames));
  }

  // Same rngSeed the graph sync layer uses (convex/graph/sync.ts's
  // syncGodRelationships) so the relationships dramatized here are the exact
  // ones shown in the Relationship Graph view, not an independently-rolled set.
  const relationships = generateGodRelationships(pantheon, resolvedRngSeed);
  for (const relationship of relationships) {
    myths.push(generateRelationshipMyth(culture, pantheon, relationship, rng, index++, resolvedRngSeed));
  }

  for (const tension of culture.flaggedTensions) {
    myths.push(generateTensionMyth(culture, pantheon, tension, rng, index++, resolvedRngSeed, takenNames));
  }

  return myths;
}

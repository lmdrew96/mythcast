# Mythcast — Design Doc

## 1. Overview

**Mythcast** is a tool that generates internally-consistent mythologies — cultures, pantheons, and myths that drift coherently over simulated time.

It exists for two reasons, both genuine:

- **An exploration of procedural generation itself.** A real technical stretch into constraint-based, multi-layer generation where each layer's output has to stay consistent with the layer below it — a genuinely hard problem, not a random-table exercise.
- **A worldbuilding and culture playground.** A space to build cultures and belief systems that feel lived-in rather than assembled, with natural crossover into TTRPG worldbuilding (FeyForge, The Majorot) down the line.

## 2. Design Principles

**Traceable in hindsight, not predictable in advance.** Every generated trait — a culture value, a god's personality, a myth beat — should be explainable once you see it: you can point to the seed parameters or upstream traits that produced it. But you shouldn't be able to look at the seed params ahead of time and call the specific output. Traceability protects against nonsense; unpredictability protects against boredom. This is the line between a lookup table and a system with real texture.

**Tension and conflict are a feature, not a bug.** Cultures shouldn't resolve cleanly. An isolationist culture that's resource-poor enough to need trade, a peace-coded pantheon with one violently protective war-god exception — these unresolved pulls are often *exactly* what makes downstream output feel alive rather than assembled. Consistency validation (Section 6) should catch actual contradictions, not flatten productive tension into tidiness.

**Structure and prose, balanced.** Myths and culture output need to be mechanically sound (traceable, internally consistent) *and* read like something worth reading — not just a data dump wearing narrative clothing. Structure comes first in the generation pipeline (so consistency can be checked and drift can be tracked), but prose rendering is a first-class concern, not an afterthought bolted on at the end.

**Steerable, not just random.** The system should support dials — nudging generation toward a vibe or theme — the same way ConLangLab lets you steer phonological aesthetics rather than pure typological chance. Full-random should still be a valid mode, but steerability is core, not a stretch feature.

## 3. Culture Layer

**Seed parameters:**
- Climate (arid / temperate / arctic / tropical / volcanic / etc.)
- Resource scarcity (abundant / moderate / scarce / famine-prone)
- Threat model (isolated / rival-clans / predators / natural-disaster-prone / colonizer-pressure)
- Kinship structure (patrilineal / matrilineal / clan-based / non-kin collective)
- Settlement pattern (nomadic / semi-nomadic / fixed-agrarian / urban)
- Religion/cosmology stance (animist / polytheist-ancestral / dualist / pantheist / other — this seeds Layer 2 rather than fully determining it)
- Technology level (stone / bronze / iron / early-industrial / etc. — scoped loosely, not a hard tech tree)
- Government type (chieftain / council / theocracy / hereditary-monarchy / stateless-egalitarian)

**Culture Profile output (expanded):**
- Core values (ranked)
- Taboos
- Conflict-resolution norms
- Social structure (authority, inheritance)
- Ritual practices (coming-of-age, death rites, seasonal observances)
- Art/aesthetic sensibility (what's beautiful/ugly/sacred-to-depict)
- Economic structure (gift economy / barter / tribute / trade-based)
- Gender & role norms (who does what, how rigid)
- Origin self-narrative (how the culture explains its own existence — this is proto-myth, and becomes a direct seed for Layer 3)
- Naming conventions (a lightweight per-culture phoneme/syllable-shape preference — e.g. harsh consonant clusters vs. flowing open vowels — used to generate names for gods and myth figures downstream. Intentionally simple: a built-in rule set, not a full phonology engine like ConLangLab.)

**Contradiction handling:** no forced-injection of conflict. Tension (Principle: "tension is a feature") is left to emerge naturally from parameter combinations — e.g. isolationist threat-model + scarce resources naturally produces a trade-dependency tension without the generator needing a dedicated "inject contradiction" step. The consistency validator's job (Section 6) is to distinguish *productive* tension like this from *actual* contradiction (e.g. a culture simultaneously coded as strictly patrilineal and matrilineal with no explanation), not to eliminate all friction.

**Traceability requirement:** every field in the Culture Profile must cite which seed parameter(s) it derived from, so downstream layers (and you, reading the output) can always answer "why does this culture have this trait."

## 4. Pantheon Layer

**Personality determinism — mostly derived, with a mismatch chance.** A god's personality is primarily generated from the culture's relationship to their domain (e.g. hoarding-coded scarcity → harsh, tribute-demanding harvest god, most of the time). But there's a defined chance — a weighted roll, not a coin flip — for the generator to land on a *mismatched* personality instead (a hoarding culture with a terrifyingly generous harvest god). When a mismatch happens, it's flagged as such rather than silently generated — the mismatch itself becomes a hook for Layer 3 (a myth explaining *why* this god defies what the culture expects) instead of an unexplained anomaly.

**Pantheon size — scales with the culture.** No fixed number of major gods. Scale roughly with the richness of the Culture Profile — number of core values, number of distinct fears/threats, number of taboos — so a culture generated with more texture naturally produces a fuller pantheon, and a sparser culture produces a leaner one. Exact scaling formula is an open implementation question (see Section 10).

**Domain coverage — weighted, not checklist.** No fixed domain list every culture must fill. Domains are generated from what the culture's values/fears/taboos actually call for — a coastal culture with a low-threat threat-model may simply have no war god. Weighting also allows **domain consolidation**: one god can plausibly hold multiple related domains (a harvest-and-fertility god, a death-and-winter god) rather than every domain needing its own dedicated deity. This keeps pantheons from feeling padded out to hit a quota.

**Consistency implication:** because personality mismatches and domain consolidation are both intentional possibilities, the pantheon validator (Section 6) needs to distinguish "this god's personality doesn't match their domain because the generator flagged an intentional mismatch" from "this god's personality doesn't match their domain because of a generation bug" — the flag is what makes that distinction possible.

## 5. Myth Layer

**Myth structure — structured event sequence, not prose-first.** Myths are generated as a sequence of discrete, typed events (e.g. `[god-acts, consequence, human-response, moral-outcome]`) rather than free prose. This makes mutation operations well-defined (substitute an event, reorder, conflate two events, invert an outcome) and keeps the myth mechanically checkable against the pantheon/culture it derived from. Prose rendering is a separate downstream step (Section 8, Output/UI) that turns the event sequence into readable text — structure and prose stay decoupled, in line with the balance principle from Section 2.

**Drift triggers — mostly event-driven, with light generational drift.** The primary driver of myth mutation is **injected events** — war, famine, migration, contact with another culture — each of which biases mutation in a specific direction (a culture that just fought a war biases peace-god myths toward violent reinterpretation). Generational passage alone still causes a *small* amount of drift even with no events injected (pure oral-transmission decay — details soften, minor characters blur together), but it's a minor secondary effect, not the primary engine. This means a "quiet" simulation run (no injected events) still shows some drift over many generations, but the interesting, legible mutations come from events.

Exact drift-operation set and event-to-operation mapping is an open implementation question (see Section 10).

## 6. Consistency Validation

Cross-cutting logic shared across all three generation layers (Culture, Pantheon, Myth) — one shared approach rather than three separate reimplementations per layer.

**Core distinction: productive tension vs. actual contradiction.** Per the tension principle (Section 2), unresolved pulls are a feature, not something to eliminate. The validator's job is to catch cases where two facts are simply incompatible with no in-world explanation available — e.g. a culture simultaneously coded strictly patrilineal and matrilineal with nothing accounting for it, or a god trait that contradicts itself with no flag attached.

**Flag-based exceptions, not silent failures.** Intentional deviations — a Pantheon Layer personality mismatch (Section 4), a culture-level tension emerging from parameter combinations (Section 3) — are explicitly flagged by the layer that produced them, not silently passed through unmarked. The validator's rule of thumb: an *unflagged* inconsistency is a bug; a *flagged* one is a feature and gets left alone — and often becomes a hook for the next layer down (e.g. Myth Layer generating a myth that explains a flagged mismatch).

**Traceability check.** Every output field across all three layers must be traceable to at least one upstream cause — a seed parameter, a culture trait, a god trait. The validator's most basic job is confirming no field is an orphan, generated with no documented "why" (per the Traceability requirement, Section 3).

**Scope note:** this section describes the shared philosophy and rules; per-layer specifics (what counts as a contradiction at the Culture Layer vs. the Pantheon Layer) stay documented in each layer's own section (3, 4, 5) as they already are. This section is the referee, not a duplicate rulebook.

## 7. Simulation / Time Layer

**Run length — user-defined at setup.** You set the number of generations for a run up front (e.g. "run for 50 generations") rather than an indefinite loop you have to manually stop. This keeps runs bounded and reproducible — same seed + same generation count + same injected events should reproduce the same output.

**Event injection — both manual and procedural.** Two event sources feed the same drift mechanism from Section 5:
- **Manual injection** — you steer live, dropping in "a great war happens now" at a specific generation.
- **Procedural injection** — the simulation can also roll for events on its own each generation (weighted by the culture's threat model / scarcity / etc., so a famine-prone culture is more likely to procedurally roll a famine than a coastal abundant one).

Both event types are structurally identical once injected — the drift engine doesn't need to know or care whether an event was hand-placed or rolled. This means a fully hands-off run (procedural-only) and a fully authored run (manual-only) both work, and mixing them is the default expected mode.

Exact procedural event-roll frequency/weighting formula is an open implementation question (see Section 10).

## 8. Output / UI

Two deliverables, both first-class — they're different experiences of the same underlying data, not a primary/secondary pair:

**Codex export (the story experience).** A styled, readable in-world document — the generated pantheon and myths rendered as if it were an anthropological/mythological text. Two output modes:
- **Styled PDF** — full visual treatment (ADHDesigns-adjacent styling, decorative touches appropriate to the culture/pantheon being exported), meant to be read on-screen or shared.
- **Printer-friendly PDF** — same content, stripped down for actual printing (minimal ink use, clean typography, no heavy background styling) — useful for TTRPG table use (FeyForge/Majorot crossover).

**Lineage viewer (the graph/digital experience).** An interactive view of how a myth mutated across generations — either a diff-style comparison between two generation snapshots, or a Neo4j-backed graph render showing the branching mutation history visually. This is where the "watching drift happen" payoff actually becomes visible, versus the codex which shows you a single frozen snapshot.

**Relationship graph view.** Pantheon rendered as an interactive graph (via Neo4j) — gods as nodes, relationships (parent-of, rival-of, consort-of, usurped-by) as edges. Complements the lineage viewer as a second graph-based view, but of pantheon structure rather than myth mutation.

Exact PDF generation approach is an open implementation question (see Section 10).

### 8.1 Visual Theming System

Five set themes, each with a coordinated light and dark variant (10 total), sourced from curated color palettes. Used both as **UI preference** (you pick a default) and as **auto-suggestion per generated culture** (a culture's climate/cosmology/threat-model can suggest a matching theme for its codex export).

| # | Theme name | Source colors (hex) |
|---|---|---|
| 1 | **Nightfall Indigo** | Chinese Black `0D0E20` · Persian Indigo `2D1C7F` · Majorelle Blue `7546E8` · Vodka `C8B3F6` · Max Blue Purple `B0A9E5` |
| 2 | **Glacial Current** | Pale Cerulean `99B9DF` · Maastricht Blue `0E1B33` · Bright Navy Blue `117AE0` · Cobalt Blue `0949A5` · Blue Jeans `5FAEF8` |
| 3 | **Autumn Hearth** | Beige `E6D7C4` · Oliva Claro `9F9A60` · Madera `6E5335` · Tierra `4D3920` · Terracota `A05432` |
| 4 | **Ivory Ascension** | Ivory `F4F7EA` · Lavender Blush `E2D9E2` · Thistle `CDB9DD` · Sky Reflection `75ADC9` · Soft Periwinkle `9580D4` |
| 5 | **Moonlit Thicket** | `BDDEDD` · `8BB9C1` · `7F5388` · `564A70` · `34283F` |

**Role mapping (per theme, both variants):** each palette's 5 colors map to `background`, `surface`, `primary accent`, `secondary accent`, `text`. Light variant draws `background`/`surface` from the palette's lighter members and `text` from a darker member; dark variant inverts that (dark `background`/`surface`, light `text`). The **primary accent color stays constant across both variants** of a theme, so the theme reads as the same identity in light or dark mode (e.g. Majorelle Blue `7546E8` anchors Nightfall Indigo either way).

**Auto-suggest trigger logic** (culture → theme), mapped from Culture Profile fields (Section 3):

| Theme | Suggested when culture leans toward... |
|---|---|
| Nightfall Indigo | Dualist cosmology, urban/high-tech settlement |
| Glacial Current | Coastal/arctic climate, water-adjacent threat model |
| Autumn Hearth | Agrarian settlement, animist religion, fixed-settlement pattern |
| Ivory Ascension | Pantheist/gentle cosmology, abundant resources, low threat |
| Moonlit Thicket | Nature-based animism, clan-based kinship, moderate scarcity |

This is a suggestion, not a lock — the codex export UI should let you override the auto-picked theme with any of the 10 variants regardless of what the culture generated toward.

## 9. Tech Stack

**Framework/backend:** Next.js + Convex, matching ConLangLab's stack.

**Graph database: Neo4j Aura.** Given the graph-heavy nature of this project — god relationships, myth lineage across generations, culture→pantheon→myth derivation links — a dedicated graph database sits alongside Convex rather than trying to force graph traversal into Convex's document model. Neo4j Aura (managed, free tier available) over Memgraph/ArangoDB for maturity, the official TypeScript driver, and Cypher being well-suited to exactly the kind of query this project needs ("find all myth variants derived from this god within N generations," "show me every culture trait this taboo traces back to").

**Split of responsibility:**
- **Convex** — Culture Profiles, Pantheon/God records, Myth event-sequences, simulation run state, user-facing app data
- **Neo4j** — relationship graph (god-to-god edges), myth lineage graph (variant-to-parent edges), and derivation-tracing edges (culture trait → god trait → myth beat) — the traceability requirement from Section 2 is easiest to query when it's an actual graph rather than foreign-key chains

**Sync approach (implementation detail for the Build Phases section):** Convex holds source-of-truth records; Neo4j holds relationship/lineage edges referencing those record IDs. Writes to Convex that create relationships also write the corresponding edge to Neo4j — needs a defined sync pattern (e.g. a Convex action that writes to both) to avoid drift between the two stores.

**Auth: Clerk**, matching the rest of the Chaos ecosystem stack.

**Note on Vertex (existing MCP tool):** with a dedicated Neo4j instance in place, Vertex's role shifts from "the graph layer" to more of a Tangle-adjacent tool — useful for ad-hoc exploration/notes about the Vertexism philosophical framework itself, not the production graph store for Mythcast's data.

**Note on naming:** no ConLangLab integration. Naming uses the lightweight built-in per-culture naming conventions described in Section 3, not a separate conlang engine — keeps the naming system scoped and self-contained rather than pulling in a whole additional app dependency.

Tangle epistemic-note logging remains as described in Section 5.

## 10. Open Implementation Questions

Judgment calls deliberately left open at the design stage — implementation-level decisions to resolve during the corresponding build phase, not before. Good candidates for Tangle logging as they get tuned.

1. **Pantheon scaling formula** (Section 4) — exact function mapping Culture Profile richness (value count, fear count, taboo count) to number of major gods generated.
2. **Myth drift-operation set** (Section 5) — the full list of mutation operations (substitution / conflation / inversion / causal-reversal / others) and how injected event type biases which operation is more likely to fire.
3. **Procedural event-roll weighting** (Section 7) — frequency and weighting formula for the simulation's own procedural event rolls, keyed to a culture's threat model / scarcity / etc.
4. **PDF generation approach** (Section 8) — HTML/CSS-to-PDF pipeline vs. a dedicated PDF library, for the styled and printer-friendly codex exports.

## 11. Build Phases

Dependencies flow top to bottom — each phase needs what's above it.

1. **Project scaffolding & core data model** — Next.js + Convex + Clerk, core TypeScript types for CultureProfile, God, Myth, MythVariant.
2. **Culture Generator** — seed params (Section 3) → Culture Profile, including naming conventions.
3. **Pantheon Generator** — Culture Profile → gods, including mismatch-chance personality generation and weighted/consolidated domains (Section 4).
4. **Myth Generator** — structured event-sequence myths from Pantheon + Culture (Section 5), no mutation yet.
5. **Consistency Validator** — cross-layer validation and flag-based exception handling (Section 6).
6. **Neo4j graph layer + sync pattern** — relationship/lineage graph, Convex↔Neo4j sync (Section 9).
7. **Mutation/Drift Engine** — event-biased myth mutation operations (Section 5).
8. **Simulation Loop** — generational runs with manual + procedural event injection (Section 7).
9. **Visual Theming System** — 10 theme variants (5 palettes × light/dark) with auto-suggest logic (Section 8.1).
10. **Output/UI** — codex PDFs (styled + printer-friendly), lineage viewer, relationship graph view (Section 8).
11. **Polish/Tuning** — resolve Section 10's open implementation questions, tune drift parameters, Tangle review pass on judgment calls made along the way.

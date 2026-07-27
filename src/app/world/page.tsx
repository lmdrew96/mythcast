"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { suggestTheme } from "@/lib/theming/autoSuggest";
import { ThemePicker } from "@/components/ThemePicker";
import { CultureMasthead } from "@/components/CultureMasthead";
import { CodexExport } from "@/components/CodexExport";
import { RelationshipGraph } from "@/components/RelationshipGraph";
import { LineageViewer, type LineageEntry } from "@/components/LineageViewer";
import { SeedForm } from "@/components/SeedForm";
import { EventQueue } from "@/components/EventQueue";
import { MythCard } from "@/components/MythCard";
import { LocationList } from "@/components/LocationList";
import { NpcRoster } from "@/components/NpcRoster";
import { FactionList } from "@/components/FactionList";
import { Button } from "@/components/ui/Button";
import { mythToProse } from "@/lib/codex/prose";
import type { CultureProfile, CultureSeedParams, Myth } from "@/lib/types";
import type { Location } from "@/lib/culture/locations";
import type { Faction } from "@/lib/culture/factions";
import type { GraphEdge, GraphNode } from "@/lib/graph/layout";

const DEFAULT_SEED_PARAMS: CultureSeedParams = {
  climate: "volcanic",
  resourceScarcity: "famine-prone",
  threatModel: "rival-clans",
  kinshipStructure: "clan-based",
  settlementPattern: "fixed-agrarian",
  cosmologyStance: "animist",
  technologyLevel: "iron",
  governmentType: "chieftain",
};

const SIMULATION_GENERATIONS = 8;

export default function WorldPage() {
  const createCulture = useMutation(api.cultures.create);
  const createPantheon = useMutation(api.gods.createPantheon);
  const createMyths = useMutation(api.myths.createMyths);
  const createLocations = useMutation(api.locations.createLocations);
  const createFactions = useMutation(api.factions.createFactions);
  const syncGodRelationships = useAction(api.graph.sync.syncGodRelationships);
  const syncDerivationTrace = useAction(api.graph.sync.syncDerivationTrace);
  const startRun = useMutation(api.simulation.startRun);
  const runToCompletion = useAction(api.simulation.runToCompletion);
  const getLineageView = useAction(api.lineage.getLineageView);
  const getRelationshipGraph = useAction(api.lineage.getRelationshipGraph);
  const loadForResume = useAction(api.cultures.loadForResume);
  const createWorldEntity = useMutation(api.worlds.create);
  const deleteDownstreamOfCulture = useMutation(api.regenerate.deleteDownstreamOfCulture);
  const myCultures = useQuery(api.cultures.listByOwner);

  const [seedParams, setSeedParams] = useState<CultureSeedParams>(DEFAULT_SEED_PARAMS);
  const [newWorldName, setNewWorldName] = useState("");
  const [addingToWorld, setAddingToWorld] = useState(false);
  const [cultureId, setCultureId] = useState<Id<"cultures"> | null>(null);
  const [runId, setRunId] = useState<Id<"simulationRuns"> | null>(null);
  const [simulationDone, setSimulationDone] = useState(false);
  const [mythIds, setMythIds] = useState<Id<"myths">[]>([]);
  const [selectedMythId, setSelectedMythId] = useState<Id<"myths"> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lineage, setLineage] = useState<LineageEntry[]>([]);
  const [relationshipGraph, setRelationshipGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  const cultureDoc = useQuery(api.cultures.get, cultureId ? { cultureId } : "skip");
  const mythDocs = useQuery(api.myths.listByCulture, cultureId ? { cultureId } : "skip");
  const locationDocs = useQuery(api.locations.listByCulture, cultureId ? { cultureId } : "skip");
  const npcDocs = useQuery(api.npcs.listByCulture, cultureId ? { cultureId } : "skip");
  const factionDocs = useQuery(api.factions.listByCulture, cultureId ? { cultureId } : "skip");
  const worldCultures = useQuery(api.worlds.listCultures, cultureDoc?.worldId ? { worldId: cultureDoc.worldId } : "skip");

  /** Generates a pantheon + founding myths + locations + factions + relationship/derivation sync + a fresh simulation run for an already-created culture. Shared by "Generate world" (fresh culture) and "Reroll pantheon" (same culture, everything below it rerolled). */
  async function generateDownstreamOfCulture(targetCultureId: Id<"cultures">, runSeed: number) {
    setProgressStep("Generating pantheon…");
    await createPantheon({ cultureId: targetCultureId, rngSeed: runSeed });
    setProgressStep("Writing founding myths…");
    const newMythIds = await createMyths({ cultureId: targetCultureId, rngSeed: runSeed });
    setProgressStep("Placing named locations…");
    await createLocations({ cultureId: targetCultureId, rngSeed: runSeed });
    setProgressStep("Forming factions…");
    await createFactions({ cultureId: targetCultureId, rngSeed: runSeed });
    setProgressStep("Syncing relationship graph…");
    await syncGodRelationships({ cultureId: targetCultureId, rngSeed: runSeed });
    await syncDerivationTrace({ cultureId: targetCultureId });
    setProgressStep("Preparing simulation…");
    const newRunId = await startRun({ cultureId: targetCultureId, totalGenerations: SIMULATION_GENERATIONS, seed: runSeed });
    return { mythIds: newMythIds, runId: newRunId };
  }

  /** Creates a culture (and its pantheon/myths/run), optionally inside an existing world — the shared core of both "Generate world" (no worldId) and "Add another culture to this world" (worldId from the currently loaded culture). */
  async function generateCulture(worldId?: Id<"worlds">) {
    setGenerating(true);
    setError(null);
    try {
      // A fresh random seed per run — a hardcoded seed would make every
      // "Generate world" click reproduce the exact same culture/myths.
      const runSeed = Math.floor(Math.random() * 2 ** 31);
      setProgressStep("Building culture…");
      const newCultureId = await createCulture({ seed: seedParams, rngSeed: runSeed, worldId });
      const { mythIds: newMythIds, runId: newRunId } = await generateDownstreamOfCulture(newCultureId, runSeed);

      setCultureId(newCultureId);
      setMythIds(newMythIds);
      setSelectedMythId(newMythIds[0] ?? null);
      setRunId(newRunId);
      setSimulationDone(false);
      setAddingToWorld(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate world");
    } finally {
      setGenerating(false);
      setProgressStep(null);
    }
  }

  /** Partial regeneration: keeps the current culture (seed params + every trait rolled from them) fixed and rerolls everything below it — pantheon, myths, locations, factions, and the simulation run. Only offered before a run has produced any drift, since rerolling mid-run would orphan already-simulated variants. */
  async function rerollPantheon() {
    if (!cultureId) return;
    setGenerating(true);
    setError(null);
    try {
      setProgressStep("Clearing old pantheon…");
      await deleteDownstreamOfCulture({ cultureId });
      const runSeed = Math.floor(Math.random() * 2 ** 31);
      const { mythIds: newMythIds, runId: newRunId } = await generateDownstreamOfCulture(cultureId, runSeed);

      setMythIds(newMythIds);
      setSelectedMythId(newMythIds[0] ?? null);
      setRunId(newRunId);
      setSimulationDone(false);
      setLineage([]);
      const graph = await getRelationshipGraph({ cultureId });
      setRelationshipGraph(graph);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reroll pantheon");
    } finally {
      setGenerating(false);
      setProgressStep(null);
    }
  }

  /** Entry point for the "no culture loaded yet" generate flow — starts a new world first if a name was given, then creates the culture inside it. */
  async function startGenerating() {
    if (!newWorldName.trim()) {
      await generateCulture();
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      setProgressStep("Starting a new world…");
      const worldId = await createWorldEntity({ name: newWorldName.trim() });
      setNewWorldName("");
      await generateCulture(worldId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start world");
      setGenerating(false);
      setProgressStep(null);
    }
  }

  async function loadCulture(pastCultureId: Id<"cultures">) {
    setGenerating(true);
    setError(null);
    try {
      const resumed = await loadForResume({ cultureId: pastCultureId });
      setCultureId(pastCultureId);
      setMythIds(resumed.mythIds);
      setSelectedMythId(resumed.mythIds[0] ?? null);
      setRunId(resumed.runId);
      setSimulationDone(resumed.simulationDone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load world");
    } finally {
      setGenerating(false);
    }
  }

  function returnToWorldPicker() {
    setCultureId(null);
    setRunId(null);
    setSimulationDone(false);
    setMythIds([]);
    setSelectedMythId(null);
    setLineage([]);
    setRelationshipGraph({ nodes: [], edges: [] });
    setError(null);
    setAddingToWorld(false);
    setNewWorldName("");
  }

  async function runSimulation() {
    if (!runId) return;
    setGenerating(true);
    setError(null);
    try {
      setProgressStep(`Simulating ${SIMULATION_GENERATIONS} generations of drift…`);
      await runToCompletion({ runId });
      setSimulationDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run simulation");
    } finally {
      setGenerating(false);
      setProgressStep(null);
    }
  }

  useEffect(() => {
    if (!cultureId) return;
    getRelationshipGraph({ cultureId })
      .then(setRelationshipGraph)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load relationship graph"));
  }, [cultureId, getRelationshipGraph]);

  useEffect(() => {
    // Wait for the simulation to actually produce drift — fetching keyed only
    // on selectedMythId would freeze on the pre-simulation (founding-only)
    // lineage, since nothing else re-triggers this effect once the run completes.
    if (!selectedMythId || !simulationDone) return;
    let cancelled = false;
    getLineageView({ foundingMythId: selectedMythId })
      .then((entries) => {
        if (!cancelled) setLineage(entries as LineageEntry[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load myth lineage");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMythId, simulationDone, getLineageView]);

  const suggested = suggestTheme((cultureDoc?.data as CultureProfile | undefined)?.seed ?? seedParams);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl">Mythcast — World Output</h1>
        <p className="mt-1 font-mono text-xs tracking-wide uppercase opacity-60">Codex export · myth lineage · pantheon relationships</p>
      </div>

      {!cultureId && myCultures && myCultures.length > 0 && (
        <div className="mc-card flex flex-col gap-2 p-6">
          <h2 className="font-mono text-xs tracking-wide uppercase opacity-60">Your worlds</h2>
          <ul className="flex flex-col gap-1">
            {myCultures.map((culture) => (
              <li key={culture._id}>
                <button
                  type="button"
                  onClick={() => loadCulture(culture._id)}
                  disabled={generating}
                  className="text-sm underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground disabled:opacity-50"
                >
                  {culture.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!cultureId && (
        <div className="mc-card flex flex-col items-start gap-4 p-6">
          <p className="text-sm opacity-80">
            Choose seed parameters, simulate {SIMULATION_GENERATIONS} generations of drift, and see it here — codex, lineage, and pantheon.
          </p>
          <SeedForm value={seedParams} onChange={setSeedParams} disabled={generating} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-mono tracking-wide uppercase opacity-60">Start a new world (optional)</span>
            <input
              type="text"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              placeholder="e.g. The Salt Coast"
              disabled={generating}
              className="rounded-md border bg-transparent px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--mc-secondary)" }}
            />
            <span className="opacity-60">Name a world to let contact/migration events reference cultures you add to it later.</span>
          </label>
          <Button onClick={() => startGenerating()} disabled={generating}>
            {generating ? (progressStep ?? "Generating world…") : "Generate world"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {cultureId && cultureDoc && (
        <ThemePicker suggested={suggested}>
          {(themeName, themeVariant) => (
            <div className="flex flex-col gap-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <CultureMasthead name={cultureDoc.name} culture={cultureDoc.data as CultureProfile} />
                  <p className="font-mono text-[0.6875rem] tracking-wide uppercase opacity-60">
                    {simulationDone
                      ? `${SIMULATION_GENERATIONS} generations simulated · ${mythIds.length} founding myth${mythIds.length === 1 ? "" : "s"}`
                      : `Culture created · ${mythIds.length} founding myth${mythIds.length === 1 ? "" : "s"} · ready to simulate`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!simulationDone && (
                    <Button variant="ghost" onClick={rerollPantheon} disabled={generating}>
                      {generating ? (progressStep ?? "Rerolling…") : "Reroll pantheon (keep culture)"}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={returnToWorldPicker} disabled={generating}>
                    ← Start a new world
                  </Button>
                </div>
              </div>

              {cultureDoc.worldId && (
                <section className="mc-card flex flex-col gap-3 p-4">
                  <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                    This World
                  </h2>
                  {worldCultures && worldCultures.filter((c) => c._id !== cultureId).length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {worldCultures
                        .filter((c) => c._id !== cultureId)
                        .map((c) => (
                          <li key={c._id}>
                            <button
                              type="button"
                              onClick={() => loadCulture(c._id)}
                              disabled={generating}
                              className="text-sm underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground disabled:opacity-50"
                            >
                              {c.name}
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                  <Button variant="ghost" onClick={() => setAddingToWorld((v) => !v)} disabled={generating}>
                    {addingToWorld ? "Cancel" : "+ Add another culture to this world"}
                  </Button>
                  {addingToWorld && (
                    <div className="flex flex-col items-start gap-3">
                      <SeedForm value={seedParams} onChange={setSeedParams} disabled={generating} />
                      <Button onClick={() => generateCulture(cultureDoc.worldId)} disabled={generating}>
                        {generating ? (progressStep ?? "Generating culture…") : "Generate culture"}
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {mythDocs && mythDocs.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                    Founding Myths
                  </h2>
                  <div className="flex flex-col gap-4">
                    {mythDocs.map((doc) => {
                      const prose = mythToProse(doc.data as Myth);
                      return <MythCard key={doc._id} title={prose.title} generation={prose.generation} paragraph={prose.paragraph} hook={prose.hook} />;
                    })}
                  </div>
                </section>
              )}

              {locationDocs && locationDocs.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                    Named Locations
                  </h2>
                  <LocationList locations={locationDocs.map((doc) => doc.data as Location)} />
                </section>
              )}

              {npcDocs && npcDocs.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                    NPC Roster
                  </h2>
                  <NpcRoster npcs={npcDocs} />
                </section>
              )}

              {factionDocs && factionDocs.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                    Factions
                  </h2>
                  <FactionList factions={factionDocs.map((doc) => doc.data as Faction)} />
                </section>
              )}

              {!simulationDone && runId && (
                <section className="flex flex-col gap-3">
                  <EventQueue runId={runId} totalGenerations={SIMULATION_GENERATIONS} cultureId={cultureId} worldId={cultureDoc.worldId} />
                  <Button onClick={runSimulation} disabled={generating}>
                    {generating ? (progressStep ?? "Simulating…") : `Run ${SIMULATION_GENERATIONS}-generation simulation`}
                  </Button>
                </section>
              )}

              {simulationDone && (
                <>
                  <section className="flex flex-col gap-3">
                    <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                      Codex Export
                    </h2>
                    <CodexExport cultureId={cultureId} themeName={themeName} themeVariant={themeVariant} />
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                      Relationship Graph
                    </h2>
                    <RelationshipGraph nodes={relationshipGraph.nodes} edges={relationshipGraph.edges} />
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="font-display text-xl" style={{ color: "var(--mc-primary)" }}>
                      Lineage Viewer
                    </h2>
                    {mythIds.length > 1 && (
                      <label className="flex w-fit flex-col gap-1 text-xs">
                        <span className="font-mono tracking-wide uppercase opacity-60">Founding myth</span>
                        <select
                          value={selectedMythId ?? undefined}
                          onChange={(e) => setSelectedMythId(e.target.value as Id<"myths">)}
                          className="rounded-md border bg-transparent px-2 py-1 font-mono text-xs"
                          style={{ borderColor: "var(--mc-secondary)" }}
                        >
                          {mythIds.map((id, i) => (
                            <option key={id} value={id}>
                              Founding myth {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <LineageViewer entries={lineage} />
                  </section>
                </>
              )}
            </div>
          )}
        </ThemePicker>
      )}
    </main>
  );
}

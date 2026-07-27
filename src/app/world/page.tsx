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
import { Button } from "@/components/ui/Button";
import type { CultureProfile, CultureSeedParams } from "@/lib/types";
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
  const syncGodRelationships = useAction(api.graph.sync.syncGodRelationships);
  const syncDerivationTrace = useAction(api.graph.sync.syncDerivationTrace);
  const startRun = useMutation(api.simulation.startRun);
  const runToCompletion = useAction(api.simulation.runToCompletion);
  const getLineageView = useAction(api.lineage.getLineageView);
  const getRelationshipGraph = useAction(api.lineage.getRelationshipGraph);

  const [seedParams, setSeedParams] = useState<CultureSeedParams>(DEFAULT_SEED_PARAMS);
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

  async function createWorld() {
    setGenerating(true);
    setError(null);
    try {
      // A fresh random seed per run — a hardcoded seed would make every
      // "Generate world" click reproduce the exact same culture/myths.
      const runSeed = Math.floor(Math.random() * 2 ** 31);
      setProgressStep("Building culture…");
      const newCultureId = await createCulture({ seed: seedParams, rngSeed: runSeed });
      setProgressStep("Generating pantheon…");
      await createPantheon({ cultureId: newCultureId, rngSeed: runSeed });
      setProgressStep("Writing founding myths…");
      const newMythIds = await createMyths({ cultureId: newCultureId, rngSeed: runSeed });
      setProgressStep("Syncing relationship graph…");
      await syncGodRelationships({ cultureId: newCultureId, rngSeed: runSeed });
      await syncDerivationTrace({ cultureId: newCultureId });
      setProgressStep("Preparing simulation…");
      const newRunId = await startRun({ cultureId: newCultureId, totalGenerations: SIMULATION_GENERATIONS, seed: runSeed });

      setCultureId(newCultureId);
      setMythIds(newMythIds);
      setSelectedMythId(newMythIds[0] ?? null);
      setRunId(newRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate world");
    } finally {
      setGenerating(false);
      setProgressStep(null);
    }
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

  const suggested = suggestTheme(seedParams);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl">Mythcast — World Output</h1>
        <p className="mt-1 font-mono text-xs tracking-wide uppercase opacity-60">Codex export · myth lineage · pantheon relationships</p>
      </div>

      {!cultureId && (
        <div className="mc-card flex flex-col items-start gap-4 p-6">
          <p className="text-sm opacity-80">
            Choose seed parameters, simulate {SIMULATION_GENERATIONS} generations of drift, and see it here — codex, lineage, and pantheon.
          </p>
          <SeedForm value={seedParams} onChange={setSeedParams} disabled={generating} />
          <Button onClick={createWorld} disabled={generating}>
            {generating ? (progressStep ?? "Generating world…") : "Generate world"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {cultureId && cultureDoc && (
        <ThemePicker suggested={suggested}>
          {(themeName, themeVariant) => (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <CultureMasthead name={cultureDoc.name} culture={cultureDoc.data as CultureProfile} />
                <p className="font-mono text-[0.6875rem] tracking-wide uppercase opacity-60">
                  {simulationDone
                    ? `${SIMULATION_GENERATIONS} generations simulated · ${mythIds.length} founding myth${mythIds.length === 1 ? "" : "s"}`
                    : `Culture created · ${mythIds.length} founding myth${mythIds.length === 1 ? "" : "s"} · ready to simulate`}
                </p>
              </div>

              {!simulationDone && runId && (
                <section className="flex flex-col gap-3">
                  <EventQueue runId={runId} totalGenerations={SIMULATION_GENERATIONS} />
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
                      <select
                        value={selectedMythId ?? undefined}
                        onChange={(e) => setSelectedMythId(e.target.value as Id<"myths">)}
                        className="w-fit rounded-md border bg-transparent px-2 py-1 font-mono text-xs"
                        style={{ borderColor: "var(--mc-secondary)" }}
                      >
                        {mythIds.map((id, i) => (
                          <option key={id} value={id}>
                            Founding myth {i + 1}
                          </option>
                        ))}
                      </select>
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

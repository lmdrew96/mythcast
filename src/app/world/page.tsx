"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { suggestTheme } from "@/lib/theming/autoSuggest";
import { ThemePicker } from "@/components/ThemePicker";
import { CodexExport } from "@/components/CodexExport";
import { RelationshipGraph } from "@/components/RelationshipGraph";
import { LineageViewer, type LineageEntry } from "@/components/LineageViewer";
import type { CultureSeedParams } from "@/lib/types";
import type { GraphEdge, GraphNode } from "@/lib/graph/layout";

const DEMO_SEED: CultureSeedParams = {
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

  const [cultureId, setCultureId] = useState<Id<"cultures"> | null>(null);
  const [mythIds, setMythIds] = useState<Id<"myths">[]>([]);
  const [selectedMythId, setSelectedMythId] = useState<Id<"myths"> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineage, setLineage] = useState<LineageEntry[]>([]);
  const [relationshipGraph, setRelationshipGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  const cultureDoc = useQuery(api.cultures.get, cultureId ? { cultureId } : "skip");

  async function generateWorld() {
    setGenerating(true);
    setError(null);
    try {
      const newCultureId = await createCulture({ seed: DEMO_SEED, rngSeed: 1 });
      await createPantheon({ cultureId: newCultureId, rngSeed: 1 });
      const newMythIds = await createMyths({ cultureId: newCultureId, rngSeed: 1 });
      await syncGodRelationships({ cultureId: newCultureId, rngSeed: 1 });
      await syncDerivationTrace({ cultureId: newCultureId });
      const runId = await startRun({ cultureId: newCultureId, totalGenerations: SIMULATION_GENERATIONS, seed: 1 });
      await runToCompletion({ runId });

      setCultureId(newCultureId);
      setMythIds(newMythIds);
      setSelectedMythId(newMythIds[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate demo world");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!cultureId) return;
    getRelationshipGraph({ cultureId }).then(setRelationshipGraph);
  }, [cultureId, getRelationshipGraph]);

  useEffect(() => {
    if (!selectedMythId) return;
    let cancelled = false;
    getLineageView({ foundingMythId: selectedMythId }).then((entries) => {
      if (!cancelled) setLineage(entries as LineageEntry[]);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMythId, getLineageView]);

  const suggested = suggestTheme(DEMO_SEED);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8 text-sm">
      <h1 className="text-xl font-bold">Mythcast — World Output</h1>
      <p className="text-xs opacity-70">Codex export, myth lineage, and pantheon relationships for a persisted, simulated culture.</p>

      {!cultureId && (
        <button
          type="button"
          onClick={generateWorld}
          disabled={generating}
          className="w-fit rounded border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
        >
          {generating ? "Generating world…" : "Generate demo world"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {cultureId && cultureDoc && (
        <ThemePicker suggested={suggested}>
          {(themeName, themeVariant) => (
            <div className="flex flex-col gap-6">
              <section>
                <h2 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
                  {cultureDoc.name}
                </h2>
                <p className="mt-1 text-xs opacity-70">
                  Simulated {SIMULATION_GENERATIONS} generations · {mythIds.length} founding myth{mythIds.length === 1 ? "" : "s"}
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
                  Codex Export
                </h3>
                <CodexExport cultureId={cultureId} themeName={themeName} themeVariant={themeVariant} />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
                  Relationship Graph
                </h3>
                <RelationshipGraph nodes={relationshipGraph.nodes} edges={relationshipGraph.edges} />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
                  Lineage Viewer
                </h3>
                {mythIds.length > 1 && (
                  <select
                    value={selectedMythId ?? undefined}
                    onChange={(e) => setSelectedMythId(e.target.value as Id<"myths">)}
                    className="w-fit rounded border bg-transparent px-2 py-1 text-xs"
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
            </div>
          )}
        </ThemePicker>
      )}
    </main>
  );
}

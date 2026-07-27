"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { DriftEventType } from "@/lib/types";
import { Button } from "./ui/Button";

const EVENT_TYPES: DriftEventType[] = ["war", "famine", "migration", "contact", "disaster"];
const TARGETABLE_TYPES: DriftEventType[] = ["migration", "contact"];

export function EventQueue({
  runId,
  totalGenerations,
  cultureId,
  worldId,
}: {
  runId: Id<"simulationRuns">;
  totalGenerations: number;
  cultureId: Id<"cultures">;
  worldId?: Id<"worlds">;
}) {
  const injectEvent = useMutation(api.simulation.injectEvent);
  const clearEvent = useMutation(api.simulation.clearEvent);
  const events = useQuery(api.simulation.listEvents, { runId });
  const worldCultures = useQuery(api.worlds.listCultures, worldId ? { worldId } : "skip");
  const [generation, setGeneration] = useState(1);
  const [type, setType] = useState<DriftEventType>("war");
  const [targetCultureId, setTargetCultureId] = useState<Id<"cultures"> | "">("");
  const [queuing, setQueuing] = useState(false);

  const siblingCultures = worldCultures?.filter((c) => c._id !== cultureId) ?? [];
  const showTargetPicker = TARGETABLE_TYPES.includes(type) && siblingCultures.length > 0;

  async function queueEvent() {
    setQueuing(true);
    try {
      await injectEvent({ runId, generation, type, targetCultureId: showTargetPicker && targetCultureId ? targetCultureId : undefined });
    } finally {
      setQueuing(false);
    }
  }

  return (
    <div className="mc-card flex flex-col gap-3 p-4">
      <p className="text-sm opacity-80">
        Optionally queue events at specific generations before running the simulation — e.g. &ldquo;a war happens at generation 4.&rdquo;
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-mono tracking-wide uppercase opacity-60">Generation</span>
          <select
            value={generation}
            onChange={(e) => setGeneration(Number(e.target.value))}
            className="rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--mc-secondary)" }}
          >
            {Array.from({ length: totalGenerations }, (_, i) => i + 1).map((gen) => (
              <option key={gen} value={gen}>
                {gen}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-mono tracking-wide uppercase opacity-60">Event</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as DriftEventType);
              setTargetCultureId("");
            }}
            className="rounded-md border bg-transparent px-2 py-1.5 text-sm capitalize"
            style={{ borderColor: "var(--mc-secondary)" }}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </label>
        {showTargetPicker && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-mono tracking-wide uppercase opacity-60">With culture</span>
            <select
              value={targetCultureId}
              onChange={(e) => setTargetCultureId(e.target.value as Id<"cultures">)}
              className="rounded-md border bg-transparent px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--mc-secondary)" }}
            >
              <option value="">(unspecified)</option>
              {siblingCultures.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button variant="ghost" onClick={queueEvent} disabled={queuing}>
          {queuing ? "Queuing…" : "Queue event"}
        </Button>
      </div>
      {events && events.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {[...events]
            .sort((a, b) => a.generation - b.generation)
            .map((e) => {
              const target = e.targetCultureId ? siblingCultures.find((c) => c._id === e.targetCultureId) : undefined;
              return (
                <li key={e._id} className="mc-badge gap-1 capitalize">
                  <span>
                    Gen {e.generation}: {e.type}
                    {target ? ` with ${target.name}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearEvent({ runId, generation: e.generation })}
                    aria-label={`Remove queued event at generation ${e.generation}`}
                    className="opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

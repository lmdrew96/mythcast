"use client";

import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

export type LineageDiffEntry = {
  index: number;
  changed: boolean;
  before: { description: string };
  after: { description: string };
};

export type LineageEntry = {
  generation: number;
  title: string;
  paragraph: string;
  mutationOperations: string[];
  triggeringEventId: string | null;
  diff: LineageDiffEntry[] | null;
};

export function LineageViewer({ entries }: { entries: LineageEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm italic opacity-70">No drift history yet — run a simulation first.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => {
        const changedBeats = entry.diff?.filter((d) => d.changed) ?? [];
        return (
          <Card key={entry.generation} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Badge>{entry.generation === 0 ? "founding" : `gen ${entry.generation}`}</Badge>
              {entry.triggeringEventId && (
                <span className="font-mono text-[0.6875rem] opacity-70" style={{ color: "var(--mc-secondary, currentColor)" }}>
                  {entry.triggeringEventId}
                </span>
              )}
            </div>
            <p className="prose-myth text-sm">{entry.paragraph}</p>
            {changedBeats.length > 0 && (
              <div className="mc-marginalia mt-1 flex flex-col gap-1">
                {changedBeats.map((d) => (
                  <div key={d.index}>
                    <span className="line-through opacity-60">{d.before.description}</span>
                    {" → "}
                    <span className="not-italic" style={{ color: "var(--mc-primary, currentColor)" }}>
                      {d.after.description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

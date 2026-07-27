"use client";

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
    return <p className="text-sm italic">No drift history yet — run a simulation first.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => {
        const changedBeats = entry.diff?.filter((d) => d.changed) ?? [];
        return (
          <div key={entry.generation} className="rounded border p-3" style={{ borderColor: "var(--mc-secondary, currentColor)" }}>
            <div className="flex items-center justify-between text-xs opacity-70">
              <span>Generation {entry.generation}</span>
              {entry.triggeringEventId && <span>{entry.triggeringEventId}</span>}
            </div>
            <p className="mt-1 text-sm">{entry.paragraph}</p>
            {changedBeats.length > 0 && (
              <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-xs" style={{ borderColor: "var(--mc-secondary, currentColor)" }}>
                {changedBeats.map((d) => (
                  <div key={d.index}>
                    <span className="line-through opacity-60">{d.before.description}</span>
                    {" → "}
                    <span style={{ color: "var(--mc-primary, currentColor)" }}>{d.after.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

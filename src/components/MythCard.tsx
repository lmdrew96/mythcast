import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

export function MythCard({ title, generation, paragraph, hook }: { title: string; generation: number; paragraph: string; hook?: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg" style={{ color: "var(--mc-primary, currentColor)" }}>
          {title}
        </h3>
        <Badge>{generation === 0 ? "founding" : `gen ${generation}`}</Badge>
      </div>
      <p className="prose-myth prose-myth-lead text-sm">{paragraph}</p>
      {hook && (
        <p className="mc-marginalia">
          <span className="font-mono text-[0.6875rem] tracking-wide uppercase not-italic opacity-75">Adventure hook —</span> {hook}
        </p>
      )}
    </Card>
  );
}

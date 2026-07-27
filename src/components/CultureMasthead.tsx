import { Badge } from "./ui/Badge";
import type { CultureProfile } from "@/lib/types";

export function CultureMasthead({ name, culture }: { name: string; culture: CultureProfile }) {
  const seedTags = Object.values(culture.seed);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-3xl" style={{ color: "var(--mc-primary, currentColor)" }}>
        {name}
      </h1>
      <p className="prose-myth prose-myth-lead text-base italic">{culture.originNarrative.value}</p>
      <div className="flex flex-wrap gap-1.5">
        {seedTags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </div>
  );
}

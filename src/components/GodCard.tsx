import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { God } from "@/lib/types";

export function GodCard({ god }: { god: God }) {
  const isMismatch = god.personalityMismatch.isMismatch;

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display text-xl" style={{ color: "var(--mc-primary, currentColor)" }}>
        {god.name}
        {isMismatch && (
          <sup className="ml-1 text-sm not-italic" style={{ color: "var(--mc-secondary, currentColor)" }} title="Flagged personality mismatch">
            †
          </sup>
        )}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {god.domains.value.map((domain) => (
          <Badge key={domain}>{domain}</Badge>
        ))}
      </div>
      <p className="text-sm">{god.personality.value.join(", ")}.</p>
      {isMismatch && god.personalityMismatch.explanationHook && <p className="mc-marginalia">† {god.personalityMismatch.explanationHook}</p>}
    </Card>
  );
}

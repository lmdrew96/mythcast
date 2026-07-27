import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { Faction } from "@/lib/culture/factions";

const KIND_LABEL: Record<Faction["kind"], string> = {
  priesthood: "Priesthood",
  "enforcer-clan": "Enforcer clan",
  "tension-cult": "Cult",
  "rival-cult": "Cult",
};

export function FactionList({ factions }: { factions: Faction[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {factions.map((faction) => (
        <Card key={faction.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg" style={{ color: "var(--mc-primary, currentColor)" }}>
              {faction.name}
            </h3>
            <Badge>{KIND_LABEL[faction.kind]}</Badge>
          </div>
          <p className="text-sm">{faction.goal}</p>
          <p className="mc-marginalia">
            <span className="font-mono text-[0.6875rem] tracking-wide uppercase not-italic opacity-75">Allegiance —</span> {faction.allegiance}
          </p>
        </Card>
      ))}
    </div>
  );
}

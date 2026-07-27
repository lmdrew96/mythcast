import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

export type NpcEntry = { _id: string; name: string; role: string; hook: string };

export function NpcRoster({ npcs }: { npcs: NpcEntry[] }) {
  return (
    <div className="flex flex-col gap-3">
      {npcs.map((npc) => (
        <Card key={npc._id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg" style={{ color: "var(--mc-primary, currentColor)" }}>
              {npc.name}
            </h3>
            <Badge>{npc.role}</Badge>
          </div>
          <p className="text-sm">{npc.hook}</p>
        </Card>
      ))}
    </div>
  );
}

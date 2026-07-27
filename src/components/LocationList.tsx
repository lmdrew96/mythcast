import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { Location } from "@/lib/culture/locations";

const KIND_LABEL: Record<Location["kind"], string> = {
  capital: "Capital",
  "sacred-site": "Sacred site",
  "taboo-site": "Taboo site",
};

export function LocationList({ locations }: { locations: Location[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {locations.map((location) => (
        <Card key={location.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg" style={{ color: "var(--mc-primary, currentColor)" }}>
              {location.name}
            </h3>
            <Badge>{KIND_LABEL[location.kind]}</Badge>
          </div>
          <p className="text-sm">{location.description}</p>
        </Card>
      ))}
    </div>
  );
}

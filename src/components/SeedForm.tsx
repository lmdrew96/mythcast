"use client";

import type {
  Climate,
  CosmologyStance,
  CultureSeedParams,
  GovernmentType,
  KinshipStructure,
  ResourceScarcity,
  SettlementPattern,
  TechnologyLevel,
  ThreatModel,
} from "@/lib/types";

const CLIMATE_OPTIONS: Climate[] = ["arid", "temperate", "arctic", "tropical", "volcanic"];
const RESOURCE_SCARCITY_OPTIONS: ResourceScarcity[] = ["abundant", "moderate", "scarce", "famine-prone"];
const THREAT_MODEL_OPTIONS: ThreatModel[] = ["isolated", "rival-clans", "predators", "natural-disaster-prone", "colonizer-pressure"];
const KINSHIP_STRUCTURE_OPTIONS: KinshipStructure[] = ["patrilineal", "matrilineal", "clan-based", "non-kin-collective"];
const SETTLEMENT_PATTERN_OPTIONS: SettlementPattern[] = ["nomadic", "semi-nomadic", "fixed-agrarian", "urban"];
const COSMOLOGY_STANCE_OPTIONS: CosmologyStance[] = ["animist", "polytheist-ancestral", "dualist", "pantheist", "other"];
const TECHNOLOGY_LEVEL_OPTIONS: TechnologyLevel[] = ["stone", "bronze", "iron", "early-industrial"];
const GOVERNMENT_TYPE_OPTIONS: GovernmentType[] = ["chieftain", "council", "theocracy", "hereditary-monarchy", "stateless-egalitarian"];

const FIELDS: { key: keyof CultureSeedParams; label: string; options: readonly string[] }[] = [
  { key: "climate", label: "Climate", options: CLIMATE_OPTIONS },
  { key: "resourceScarcity", label: "Resource scarcity", options: RESOURCE_SCARCITY_OPTIONS },
  { key: "threatModel", label: "Threat model", options: THREAT_MODEL_OPTIONS },
  { key: "kinshipStructure", label: "Kinship structure", options: KINSHIP_STRUCTURE_OPTIONS },
  { key: "settlementPattern", label: "Settlement pattern", options: SETTLEMENT_PATTERN_OPTIONS },
  { key: "cosmologyStance", label: "Cosmology stance", options: COSMOLOGY_STANCE_OPTIONS },
  { key: "technologyLevel", label: "Technology level", options: TECHNOLOGY_LEVEL_OPTIONS },
  { key: "governmentType", label: "Government type", options: GOVERNMENT_TYPE_OPTIONS },
];

export function SeedForm({
  value,
  onChange,
  disabled,
}: {
  value: CultureSeedParams;
  onChange: (next: CultureSeedParams) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-xs">
          <span className="font-mono tracking-wide uppercase opacity-60">{field.label}</span>
          <select
            value={value[field.key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [field.key]: e.target.value } as CultureSeedParams)}
            className="rounded-md border border-foreground/25 bg-transparent px-2 py-1.5 text-sm capitalize disabled:opacity-50"
          >
            {field.options.map((option) => (
              <option key={option} value={option} className="capitalize">
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

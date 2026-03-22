"use client";

import { SUPPORTED_GEOS } from "@/lib/geo-config";

interface GeoSelectorProps {
  value: string;
  onChange: (geo: string) => void;
}

export function GeoSelector({ value, onChange }: GeoSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-alt border border-border text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
    >
      {SUPPORTED_GEOS.map((geo) => (
        <option key={geo.code} value={geo.code}>
          {geo.name}
        </option>
      ))}
    </select>
  );
}

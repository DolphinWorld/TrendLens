"use client";

import type { TimeRange } from "@/lib/types";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "1d", label: "1D" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
];

function dateRangeLabel(range: TimeRange): string {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "1h": start.setHours(end.getHours() - 1); break;
    case "6h": start.setHours(end.getHours() - 6); break;
    case "1d": start.setDate(end.getDate() - 1); break;
    case "7d": start.setDate(end.getDate() - 7); break;
    case "30d": start.setDate(end.getDate() - 30); break;
    case "90d": start.setDate(end.getDate() - 90); break;
    case "12m": start.setFullYear(end.getFullYear() - 1); break;
  }
  if (range === "1h" || range === "6h") {
    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${fmt(start)} — ${fmt(end)}`;
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} — ${fmt(end)}`;
}

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <div className="flex items-center bg-surface-alt rounded-xl p-1 gap-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              value === r.value
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-text-muted">
        {dateRangeLabel(value)}
      </span>
    </div>
  );
}

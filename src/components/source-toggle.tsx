"use client";

import { ALL_SOURCES, type SourceKey } from "@/lib/types";

const SHORT_LABELS: Record<SourceKey, string> = {
  google: "Google",
  reddit: "Reddit",
  hackernews: "HN",
  wikipedia: "Wiki",
  github: "GitHub",
};

interface SourceToggleProps {
  enabled: Set<SourceKey>;
  onChange: (enabled: Set<SourceKey>) => void;
}

export function SourceToggle({ enabled, onChange }: SourceToggleProps) {
  function toggle(key: SourceKey) {
    const next = new Set(enabled);
    if (next.has(key)) {
      if (next.size <= 1) return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  return (
    <div className="flex items-center bg-surface-alt rounded-xl p-1 gap-0.5">
      {ALL_SOURCES.map((s) => (
        <button
          key={s.key}
          onClick={() => toggle(s.key)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
            enabled.has(s.key)
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
          title={`${enabled.has(s.key) ? "Disable" : "Enable"} ${s.label}`}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0 transition-colors"
            style={{
              backgroundColor: enabled.has(s.key) ? s.color : "var(--color-border)",
            }}
          />
          {SHORT_LABELS[s.key]}
        </button>
      ))}
    </div>
  );
}

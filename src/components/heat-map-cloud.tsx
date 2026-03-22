"use client";

import type { HotWord } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";

interface HeatMapCloudProps {
  words: HotWord[];
  onWordClick: (word: string) => void;
  loading?: boolean;
  geoLabel?: string;
}

function heatSize(traffic: number, maxTraffic: number): number {
  const ratio = maxTraffic > 0 ? traffic / maxTraffic : 0;
  return 0.75 + ratio * 0.75; // 0.75rem to 1.5rem
}

export function HeatMapCloud({ words, onWordClick, loading, geoLabel = "US" }: HeatMapCloudProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-36 bg-surface-alt rounded mb-3" />
        <div className="flex flex-wrap gap-2 justify-center">
          {[80, 110, 70, 95, 120, 85, 100, 75, 90, 65, 105, 72].map((w, i) => (
            <div
              key={i}
              className="h-7 bg-surface-alt rounded-full"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!words.length) return null;

  const maxTraffic = Math.max(...words.map((w) => w.traffic));

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Trending Now
        </h3>
        <span className="text-xs text-text-muted">{geoLabel}</span>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {words.map((w) => {
          const color = scoreColor(Math.round((w.traffic / Math.max(maxTraffic, 1)) * 100));
          const size = heatSize(w.traffic, maxTraffic);
          return (
            <button
              key={w.word}
              onClick={() => onWordClick(w.word)}
              className="px-3 py-1 rounded-full border border-border/50 hover:border-accent/50 transition-all cursor-pointer hover:shadow-sm hover:scale-105 active:scale-95"
              style={{
                fontSize: `${size}rem`,
                color,
                fontWeight: w.traffic > maxTraffic * 0.5 ? 600 : 400,
              }}
              title={`${w.word} — ${w.trafficLabel}${w.source === "mastodon" ? " (Mastodon)" : ""}`}
            >
              {w.word}
              {w.source === "mastodon" && (
                <span className="ml-1 text-[0.6rem] opacity-60 align-super">M</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

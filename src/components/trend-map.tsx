"use client";

import dynamic from "next/dynamic";
import type { TrendResult, StateKeywordMatrix, WorldHotWords } from "@/lib/types";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-72 rounded-xl bg-surface-alt animate-pulse flex items-center justify-center">
      <span className="text-text-muted text-sm">Loading map...</span>
    </div>
  ),
});

interface TrendMapProps {
  trends: TrendResult[];
  stateMatrix?: StateKeywordMatrix | null;
  matrixLoading?: boolean;
  geo?: string;
  worldHotWords?: WorldHotWords | null;
  worldHotWordsLoading?: boolean;
}

export function TrendMap({
  trends, stateMatrix, matrixLoading, geo = "US",
  worldHotWords, worldHotWordsLoading,
}: TrendMapProps) {
  const isWorldMode = !!worldHotWords && Object.keys(worldHotWords).length > 0;
  const hasRegions = trends.some((t) => t.regions && t.regions.length > 0);
  const hasMatrix = stateMatrix && Object.keys(stateMatrix).length > 0;
  const hasData = hasRegions || hasMatrix || isWorldMode;

  const topTrend = trends[0];
  const label = isWorldMode
    ? "Global Trends"
    : trends.length === 1 && topTrend
    ? topTrend.keyword
    : hasMatrix
    ? "Hot Trends by Region"
    : `${trends.length} topics`;

  const isLoading = matrixLoading || worldHotWordsLoading;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary">
          {isWorldMode ? "Global Trend Map" : "Regional Interest"}
        </h3>
        <span className="text-xs text-text-muted capitalize">
          {label}
        </span>
      </div>
      <div className="h-72 rounded-xl overflow-hidden relative">
        {hasData ? (
          <MapInner
            trends={trends}
            stateMatrix={stateMatrix}
            geo={geo}
            worldHotWords={worldHotWords}
          />
        ) : isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-surface-alt rounded-xl text-text-muted text-sm gap-2">
            <span className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Loading trend data...
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-surface-alt rounded-xl text-text-muted text-sm gap-1">
            <span>Search for a keyword to see regional data</span>
            {trends.length > 1 && (
              <span className="text-xs opacity-60">Regional data may be temporarily unavailable due to rate limits</span>
            )}
          </div>
        )}
        {isLoading && hasData && (
          <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-surface/90 rounded-full border border-border text-xs text-text-muted">
            <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Updating...
          </div>
        )}
      </div>
      {hasData && (
        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span>Low</span>
          <div
            className="flex-1 h-2.5 rounded-full"
            style={{
              background: "linear-gradient(to right, hsl(45,8%,68%), hsl(45,85%,55%), hsl(145,70%,42%))",
            }}
          />
          <span>High</span>
          {!isWorldMode && (
            <span className="ml-2 text-text-muted italic">
              Zoom to change detail level
            </span>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { TrendResult, AiInsight, TrendDataPoint } from "@/lib/types";
import { ScoreRing } from "./score-ring";
import { Sparkline } from "./sparkline";
import { scoreColor } from "@/lib/score-color";

const SOURCE_COLORS: Record<string, string> = {
  google: "var(--color-accent)",
  reddit: "var(--color-hot)",
  hackernews: "var(--color-warm)",
  wikipedia: "#3b82f6",
  github: "#8b5cf6",
};

const MOMENTUM_BADGE: Record<string, { label: string; cls: string }> = {
  rising: { label: "Rising", cls: "bg-rising-light text-rising" },
  stable: { label: "Stable", cls: "bg-accent-light text-accent" },
  declining: { label: "Declining", cls: "bg-surface-alt text-text-muted" },
};

function combineSources(trend: TrendResult): TrendDataPoint[] {
  const buckets = new Map<string, number>();
  for (const source of trend.sources) {
    for (const dp of source.dataPoints) {
      buckets.set(dp.date, (buckets.get(dp.date) ?? 0) + dp.value);
    }
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function TrendCard({ trend }: { trend: TrendResult }) {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const badge = MOMENTUM_BADGE[trend.momentum] ?? MOMENTUM_BADGE.stable;
  const combinedData = useMemo(() => combineSources(trend), [trend]);

  async function loadInsight() {
    if (insight) {
      setInsightExpanded(!insightExpanded);
      return;
    }
    setLoading(true);
    setInsightExpanded(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trend),
      });
      const data = await res.json();
      setInsight(data);
    } catch {
      setInsight({
        summary: "Unable to generate insight at this time.",
        opportunities: [],
        targetAudience: "General audience",
        riskLevel: "medium",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:shadow-lg hover:border-accent/30 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate capitalize">
            {trend.keyword}
          </h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>
        <ScoreRing score={trend.compositeScore} />
      </div>

      {/* Combined Sparkline */}
      <button
        onClick={() => setSourcesExpanded(!sourcesExpanded)}
        className="mt-4 w-full flex items-center gap-3 group/spark cursor-pointer"
      >
        <span className="text-xs text-text-muted w-20 shrink-0 text-left">
          Combined
        </span>
        <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${trend.compositeScore}%`, backgroundColor: scoreColor(trend.compositeScore) }}
          />
        </div>
        <Sparkline
          data={combinedData}
          width={100}
          height={28}
          color="var(--color-accent)"
        />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-text-muted shrink-0 transition-transform duration-200 ${
            sourcesExpanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Individual Source Breakdown (expandable) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          sourcesExpanded ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2 pl-2 border-l-2 border-border ml-9">
          {trend.sources.map((source) => (
            <div key={source.source} className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-20 shrink-0">
                {source.label}
              </span>
              <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${source.score}%`,
                    backgroundColor: scoreColor(source.score),
                  }}
                />
              </div>
              <Sparkline
                data={source.dataPoints}
                width={80}
                height={24}
                color={SOURCE_COLORS[source.source]}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight Button */}
      <button
        onClick={loadInsight}
        disabled={loading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-accent bg-accent-light rounded-xl hover:bg-accent/15 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Analyzing...
          </>
        ) : insightExpanded && insight ? (
          "Hide Insight"
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            AI Insight
          </>
        )}
      </button>

      {/* Expanded Insight */}
      {insightExpanded && insight && (
        <div className="mt-3 p-4 bg-accent-light/50 rounded-xl text-sm space-y-3 animate-fade-in">
          <p className="text-text-secondary leading-relaxed">
            {insight.summary}
          </p>

          {insight.opportunities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Opportunities
              </h4>
              <ul className="space-y-1">
                {insight.opportunities.map((opp, i) => (
                  <li key={i} className="flex gap-2 text-text-secondary">
                    <span className="text-accent shrink-0">-</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Target: {insight.targetAudience}</span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                insight.riskLevel === "low"
                  ? "bg-cool-light text-cool"
                  : insight.riskLevel === "high"
                  ? "bg-hot-light text-hot"
                  : "bg-warm-light text-warm"
              }`}
            >
              {insight.riskLevel} risk
            </span>
          </div>
        </div>
      )}

      {/* Sample posts */}
      {trend.sources.some(
        (s) => s.sampleItems && s.sampleItems.length > 0
      ) && (
        <details className="mt-3 group/details">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
            View top posts
          </summary>
          <div className="mt-2 space-y-1.5">
            {trend.sources
              .flatMap((s) =>
                (s.sampleItems ?? []).map((item) => ({
                  ...item,
                  sourceName: s.label,
                }))
              )
              .slice(0, 5)
              .map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-text-secondary hover:text-accent transition-colors truncate"
                >
                  <span className="text-text-muted">[{item.sourceName}]</span>{" "}
                  {item.title}
                  {item.score ? (
                    <span className="text-text-muted">
                      {" "}
                      ({item.score} pts)
                    </span>
                  ) : null}
                </a>
              ))}
          </div>
        </details>
      )}

      {/* Related news */}
      {trend.newsArticles && trend.newsArticles.length > 0 && (
        <details className="mt-3 group/details">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
            Related news ({trend.newsArticles.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {trend.newsArticles.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-text-secondary hover:text-accent transition-colors truncate"
              >
                <span className="text-text-muted">[{article.source}]</span>{" "}
                {article.title}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

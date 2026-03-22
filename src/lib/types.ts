export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface SourceData {
  source: "google" | "reddit" | "hackernews" | "wikipedia" | "github";
  label: string;
  score: number; // 0-100 normalized
  dataPoints: TrendDataPoint[];
  sampleItems?: { title: string; url?: string; score?: number }[];
}

export interface RegionInterest {
  name: string;
  value: number; // 0-100
  geo: string; // geo code like "US-CA"
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  pubDate: string;
}

export interface TrendResult {
  keyword: string;
  compositeScore: number; // 0-100 weighted
  momentum: "rising" | "stable" | "declining";
  sources: SourceData[];
  regions?: RegionInterest[];
  newsArticles?: NewsArticle[];
  category?: string;
  queriedAt: string;
  timeRange?: string;
}

export interface AiInsight {
  summary: string;
  opportunities: string[];
  targetAudience: string;
  riskLevel: "low" | "medium" | "high";
}

export interface TrendWithInsight extends TrendResult {
  insight?: AiInsight;
}

export type TimeRange = "1h" | "6h" | "1d" | "7d" | "30d" | "90d" | "12m";

export type SourceKey = "google" | "reddit" | "hackernews" | "wikipedia" | "github";

export const ALL_SOURCES: { key: SourceKey; label: string; weight: number; color: string }[] = [
  { key: "google",     label: "Google Trends", weight: 0.30, color: "var(--color-accent)" },
  { key: "reddit",     label: "Reddit",        weight: 0.22, color: "var(--color-hot)" },
  { key: "hackernews", label: "Hacker News",   weight: 0.18, color: "var(--color-warm)" },
  { key: "wikipedia",  label: "Wikipedia",     weight: 0.15, color: "#3b82f6" },
  { key: "github",     label: "GitHub",        weight: 0.15, color: "#8b5cf6" },
];

export interface HotWord {
  word: string;
  traffic: number;
  trafficLabel: string;
  source?: "google" | "mastodon";
}

export interface StateKeywordMatrix {
  [stateGeo: string]: { name: string; keywords: { keyword: string; score: number }[] };
}

export interface WorldHotWords {
  [geo: string]: HotWord[];
}

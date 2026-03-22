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

import type { SourceData, TrendDataPoint, RegionInterest, TimeRange, HotWord, StateKeywordMatrix, NewsArticle, WorldHotWords } from "./types";
import { SUPPORTED_GEOS } from "./geo-config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api");

const cache = new Map<string, { data: unknown; ts: number; ttl: number }>();
const CACHE_TTL = 15 * 60 * 1000;
const CACHE_TTL_LONG = 30 * 60 * 1000;

// Track Google rate limit — skip calls for 5 min after a 302 CAPTCHA
let googleRateLimitedUntil = 0;
function isGoogleRateLimited(): boolean {
  return Date.now() < googleRateLimitedUntil;
}
function markGoogleRateLimited() {
  googleRateLimitedUntil = Date.now() + 5 * 60 * 1000;
}

function cached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < entry.ttl) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown, ttl: number = CACHE_TTL) {
  cache.set(key, { data, ts: Date.now(), ttl });
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseTraffic(s: string): number {
  const cleaned = s.replace(/[+,]/g, "").trim();
  if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1_000;
  return parseInt(cleaned, 10) || 0;
}

function timeRangeToMs(range: TimeRange): number {
  const map: Record<TimeRange, number> = {
    "1h": 3600000,
    "6h": 6 * 3600000,
    "1d": 86400000,
    "7d": 7 * 86400000,
    "30d": 30 * 86400000,
    "90d": 90 * 86400000,
    "12m": 365 * 86400000,
  };
  return map[range];
}

function redditTimeParam(range: TimeRange): string {
  const map: Record<TimeRange, string> = {
    "1h": "day",
    "6h": "day",
    "1d": "day",
    "7d": "week",
    "30d": "month",
    "90d": "year",
    "12m": "year",
  };
  return map[range];
}

// ─── Google Trends ────────────────────────────────────────────────────────────

export async function fetchGoogleTrends(
  keyword: string,
  range: TimeRange = "7d",
  geo: string = "US"
): Promise<SourceData> {
  const cacheKey = `google:${keyword}:${range}:${geo}`;
  const hit = cached<SourceData>(cacheKey);
  if (hit) return hit;

  try {
    if (isGoogleRateLimited()) {
      return { source: "google", label: "Google Trends", score: 0, dataPoints: [] };
    }

    const raw: string = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - timeRangeToMs(range)),
      geo: geo || undefined,
      granularTimeResolution: true,
    });

    if (raw.startsWith("<") || raw.includes("302 Moved")) {
      markGoogleRateLimited();
      return { source: "google", label: "Google Trends", score: 0, dataPoints: [] };
    }

    const json = JSON.parse(raw);
    const timelineData = json?.default?.timelineData ?? [];

    const dataPoints: TrendDataPoint[] = timelineData.map(
      (pt: { formattedAxisTime: string; formattedTime: string; value: number[] }) => ({
        date: pt.formattedAxisTime ?? pt.formattedTime ?? "",
        value: pt.value?.[0] ?? 0,
      })
    );

    const values = dataPoints.map((d) => d.value);
    const avg =
      values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;

    const third = Math.max(1, Math.floor(values.length / 3));
    const avgFirst = values.slice(0, third).reduce((a, b) => a + b, 0) / third;
    const avgLast = values.slice(-third).reduce((a, b) => a + b, 0) / third;

    let score = avg;
    if (avgLast > avgFirst * 1.2) score = Math.min(100, score + 10);

    const result: SourceData = { source: "google", label: "Google Trends", score, dataPoints };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    const msg = String(err);
    if (msg.includes("302") || msg.includes("<HTML>") || msg.includes("<html") || msg.includes("is not valid JSON")) {
      markGoogleRateLimited();
      console.warn("Google rate-limited, backing off for 5 min");
    } else {
      console.error("Google Trends fetch failed:", err);
    }
    return { source: "google", label: "Google Trends", score: 0, dataPoints: [] };
  }
}

// ─── Google Trends Regional Interest ──────────────────────────────────────────

export async function fetchGoogleRegions(
  keyword: string,
  geo: string = "US"
): Promise<RegionInterest[]> {
  const cacheKey = `google-regions:${keyword}:${geo}`;
  const hit = cached<RegionInterest[]>(cacheKey);
  if (hit) return hit;

  try {
    if (isGoogleRateLimited()) return [];

    const raw: string = await googleTrends.interestByRegion({
      keyword,
      startTime: new Date(Date.now() - 7 * 86400000),
      geo: geo || undefined,
      resolution: geo ? "REGION" : "COUNTRY",
    });

    if (raw.startsWith("<") || raw.includes("302 Moved")) {
      markGoogleRateLimited();
      return [];
    }

    const json = JSON.parse(raw);
    const geoData = json?.default?.geoMapData ?? [];

    const regions: RegionInterest[] = geoData
      .map(
        (d: { geoCode: string; geoName: string; value: number[] }) => ({
          name: d.geoName ?? "",
          value: d.value?.[0] ?? 0,
          geo: d.geoCode ?? "",
        })
      )
      .filter((r: RegionInterest) => r.value > 0)
      .sort((a: RegionInterest, b: RegionInterest) => b.value - a.value);

    setCache(cacheKey, regions);
    return regions;
  } catch (err) {
    const msg = String(err);
    if (msg.includes("302") || msg.includes("<HTML>") || msg.includes("<html") || msg.includes("is not valid JSON")) {
      markGoogleRateLimited();
      console.warn("Google rate-limited (regions), backing off for 5 min");
    } else {
      console.error("Google Regions fetch failed:", err);
    }
    return [];
  }
}

// ─── Reddit ───────────────────────────────────────────────────────────────────

export async function fetchRedditTrends(
  keyword: string,
  range: TimeRange = "7d"
): Promise<SourceData> {
  const cacheKey = `reddit:${keyword}:${range}`;
  const hit = cached<SourceData>(cacheKey);
  if (hit) return hit;

  try {
    const q = encodeURIComponent(keyword);
    const t = redditTimeParam(range);
    const url = `https://www.reddit.com/search.json?q=${q}&sort=hot&limit=25&t=${t}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TrendLens/1.0 (trend analysis tool)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);

    const json = await res.json();
    const posts = json?.data?.children ?? [];

    let totalUpvotes = 0;
    let totalComments = 0;
    const dayBuckets = new Map<string, number>();
    const sampleItems: { title: string; url: string; score: number }[] = [];

    for (const post of posts) {
      const d = post.data;
      totalUpvotes += d.ups ?? 0;
      totalComments += d.num_comments ?? 0;
      const date = new Date((d.created_utc ?? 0) * 1000).toISOString().split("T")[0];
      dayBuckets.set(date, (dayBuckets.get(date) ?? 0) + (d.ups ?? 0));
      if (sampleItems.length < 5) {
        sampleItems.push({
          title: d.title ?? "",
          url: `https://reddit.com${d.permalink ?? ""}`,
          score: d.ups ?? 0,
        });
      }
    }

    const dataPoints: TrendDataPoint[] = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    const avgUpvotes = posts.length > 0 ? totalUpvotes / posts.length : 0;
    const score = Math.min(
      100,
      Math.round((avgUpvotes / 100) * 20 + (totalComments / 50) * 10 + posts.length * 2)
    );

    const result: SourceData = { source: "reddit", label: "Reddit", score, dataPoints, sampleItems };
    setCache(cacheKey, result);
    return result;
  } catch {
    return { source: "reddit", label: "Reddit", score: 0, dataPoints: [], sampleItems: [] };
  }
}

// ─── Hacker News ──────────────────────────────────────────────────────────────

export async function fetchHackerNewsTrends(
  keyword: string,
  range: TimeRange = "7d"
): Promise<SourceData> {
  const cacheKey = `hn:${keyword}:${range}`;
  const hit = cached<SourceData>(cacheKey);
  if (hit) return hit;

  try {
    const q = encodeURIComponent(keyword);
    const since = Math.floor((Date.now() - timeRangeToMs(range)) / 1000);
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=30`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HN HTTP ${res.status}`);

    const json = await res.json();
    const hits = json?.hits ?? [];

    let totalPoints = 0;
    const dayBuckets = new Map<string, number>();
    const sampleItems: { title: string; url: string; score: number }[] = [];

    for (const h of hits) {
      totalPoints += h.points ?? 0;
      const date = (h.created_at ?? "").split("T")[0];
      if (date) dayBuckets.set(date, (dayBuckets.get(date) ?? 0) + (h.points ?? 0));
      if (sampleItems.length < 5) {
        sampleItems.push({
          title: h.title ?? "",
          url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
          score: h.points ?? 0,
        });
      }
    }

    const dataPoints: TrendDataPoint[] = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    const avgPoints = hits.length > 0 ? totalPoints / hits.length : 0;
    const score = Math.min(100, Math.round(hits.length * 3 + (avgPoints / 50) * 15));

    const result: SourceData = { source: "hackernews", label: "Hacker News", score, dataPoints, sampleItems };
    setCache(cacheKey, result);
    return result;
  } catch {
    return { source: "hackernews", label: "Hacker News", score: 0, dataPoints: [], sampleItems: [] };
  }
}

// ─── Wikipedia PageViews ──────────────────────────────────────────────────────

export async function fetchWikipediaPageViews(
  keyword: string,
  range: TimeRange = "7d"
): Promise<SourceData> {
  const cacheKey = `wiki:${keyword}:${range}`;
  const hit = cached<SourceData>(cacheKey);
  if (hit) return hit;

  try {
    // Title-case and underscore-join for Wikipedia article name
    const article = keyword
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("_");

    const end = new Date();
    // Wikipedia only supports daily granularity; use at least 1 day
    const wikiMs = Math.max(timeRangeToMs(range), 86400000);
    const start = new Date(Date.now() - wikiMs);
    const fmt = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");

    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmt(start)}/${fmt(end)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TrendLens/1.0 (trend-analysis; contact@trendlens.app)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);

    const json = await res.json();
    const items = json?.items ?? [];

    const dataPoints: TrendDataPoint[] = items.map(
      (item: { timestamp: string; views: number }) => ({
        date: item.timestamp
          ? `${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}-${item.timestamp.slice(6, 8)}`
          : "",
        value: item.views ?? 0,
      })
    );

    // Normalize views to 0-100 scale relative to max
    const maxViews = Math.max(...dataPoints.map((d) => d.value), 1);
    const avgViews =
      dataPoints.length > 0
        ? dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length
        : 0;

    // Heuristic: 5000+ daily avg → score 100
    const score = Math.min(100, Math.round((avgViews / 5000) * 100));

    const normalizedPoints = dataPoints.map((d) => ({
      ...d,
      value: Math.round((d.value / maxViews) * 100),
    }));

    const result: SourceData = {
      source: "wikipedia",
      label: "Wikipedia",
      score,
      dataPoints: normalizedPoints,
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    return { source: "wikipedia", label: "Wikipedia", score: 0, dataPoints: [] };
  }
}

// ─── GitHub Trending Repos ────────────────────────────────────────────────────

export async function fetchGitHubTrends(
  keyword: string,
  range: TimeRange = "7d"
): Promise<SourceData> {
  const cacheKey = `github:${keyword}:${range}`;
  const hit = cached<SourceData>(cacheKey);
  if (hit) return hit;

  try {
    const q = encodeURIComponent(keyword);
    const since = new Date(Date.now() - timeRangeToMs(range))
      .toISOString()
      .split("T")[0];
    const url = `https://api.github.com/search/repositories?q=${q}+pushed:>${since}&sort=stars&order=desc&per_page=15`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TrendLens/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);

    const json = await res.json();
    const repos = json?.items ?? [];

    let totalStars = 0;
    const dayBuckets = new Map<string, number>();
    const sampleItems: { title: string; url: string; score: number }[] = [];

    for (const repo of repos) {
      totalStars += repo.stargazers_count ?? 0;
      const date = (repo.pushed_at ?? "").split("T")[0];
      if (date) {
        dayBuckets.set(
          date,
          (dayBuckets.get(date) ?? 0) + (repo.stargazers_count ?? 0)
        );
      }
      if (sampleItems.length < 5) {
        sampleItems.push({
          title: `${repo.full_name}: ${repo.description ?? ""}`.slice(0, 120),
          url: repo.html_url ?? "",
          score: repo.stargazers_count ?? 0,
        });
      }
    }

    const dataPoints: TrendDataPoint[] = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    const avgStars = repos.length > 0 ? totalStars / repos.length : 0;
    const score = Math.min(
      100,
      Math.round(repos.length * 3 + (avgStars / 500) * 15)
    );

    const result: SourceData = {
      source: "github",
      label: "GitHub",
      score,
      dataPoints,
      sampleItems,
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    return { source: "github", label: "GitHub", score: 0, dataPoints: [] };
  }
}

// ─── Daily Trending Searches ──────────────────────────────────────────────────

export async function fetchDailyTrends(geo: string = "US"): Promise<HotWord[]> {
  const cacheKey = `daily-trends:${geo}`;
  const hit = cached<HotWord[]>(cacheKey);
  if (hit) return hit;

  try {
    // Use Google Trends RSS feed (the JSON API endpoint is unreliable/404)
    const rssGeo = geo || "US";
    const res = await fetch(
      `https://trends.google.com/trending/rss?geo=${rssGeo}`,
      {
        headers: {
          "User-Agent": "TrendLens/1.0 (trend analysis tool)",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) throw new Error(`DailyTrends RSS HTTP ${res.status}`);

    const xml = await res.text();

    // Parse <item> elements from RSS XML
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const words: HotWord[] = [];

    for (const item of items) {
      if (words.length >= 20) break;
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ??
                         item.match(/<title>(.*?)<\/title>/);
      const trafficMatch = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);

      const word = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");
      const trafficLabel = trafficMatch?.[1]?.trim() ?? "";

      if (word) {
        words.push({
          word,
          traffic: parseTraffic(trafficLabel || "0"),
          trafficLabel: trafficLabel || "trending",
        });
      }
    }

    setCache(cacheKey, words, CACHE_TTL_LONG);
    return words;
  } catch (err) {
    console.error("Daily trends fetch failed:", err);
    return [];
  }
}

// ─── Mastodon Trending Tags ──────────────────────────────────────────────────

export async function fetchMastodonTrending(): Promise<HotWord[]> {
  const cacheKey = "mastodon-trending";
  const hit = cached<HotWord[]>(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch("https://mastodon.social/api/v1/trends/tags", {
      headers: { "User-Agent": "TrendLens/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Mastodon HTTP ${res.status}`);

    const tags: {
      name: string;
      history: { day: string; uses: string; accounts: string }[];
    }[] = await res.json();

    const words: HotWord[] = tags.slice(0, 10).map((tag) => {
      const recentUses = tag.history
        .slice(0, 2)
        .reduce((sum, h) => sum + parseInt(h.uses, 10), 0);
      return {
        word: tag.name,
        traffic: recentUses,
        trafficLabel: `${recentUses} posts`,
        source: "mastodon" as const,
      };
    });

    setCache(cacheKey, words, CACHE_TTL_LONG);
    return words;
  } catch (err) {
    console.error("Mastodon trending fetch failed:", err);
    return [];
  }
}

// ─── Hot Words with Regional Breakdown ────────────────────────────────────────

export async function fetchHotWordsWithRegions(
  limit = 10,
  geo: string = "US"
): Promise<{ hotWords: HotWord[]; stateMatrix: StateKeywordMatrix }> {
  const cacheKey = `hotwords-with-regions:${geo}`;
  const hit = cached<{ hotWords: HotWord[]; stateMatrix: StateKeywordMatrix }>(cacheKey);
  if (hit) return hit;

  const hotWords = await fetchDailyTrends(geo);
  const topWords = hotWords.slice(0, limit);

  const stateMatrix: StateKeywordMatrix = {};

  for (let i = 0; i < topWords.length; i++) {
    try {
      const regions = await fetchGoogleRegions(topWords[i].word, geo);
      for (const region of regions) {
        if (!stateMatrix[region.geo]) {
          stateMatrix[region.geo] = { name: region.name, keywords: [] };
        }
        stateMatrix[region.geo].keywords.push({
          keyword: topWords[i].word,
          score: region.value,
        });
      }
    } catch {
      // skip failed individual fetches
    }
    if (i < topWords.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Sort each state's keywords by score descending
  for (const geo of Object.keys(stateMatrix)) {
    stateMatrix[geo].keywords.sort((a, b) => b.score - a.score);
  }

  const result = { hotWords, stateMatrix };
  setCache(cacheKey, result, CACHE_TTL_LONG);
  return result;
}

// ─── All Geo Hot Words (World Map) ────────────────────────────────────────────

export async function fetchAllGeoHotWords(): Promise<WorldHotWords> {
  const cacheKey = "all-geo-hotwords";
  const hit = cached<WorldHotWords>(cacheKey);
  if (hit) return hit;

  const countryGeos = SUPPORTED_GEOS.filter((g) => g.code !== "");

  const entries = await Promise.all(
    countryGeos.map(async (g) => {
      const words = await fetchDailyTrends(g.code);
      return [g.code, words] as [string, HotWord[]];
    })
  );

  const result: WorldHotWords = Object.fromEntries(entries);
  setCache(cacheKey, result, CACHE_TTL_LONG);
  return result;
}

// ─── Google News RSS ─────────────────────────────────────────────────────────

export async function fetchGoogleNews(
  keyword: string,
  geo: string = "US"
): Promise<NewsArticle[]> {
  const cacheKey = `gnews:${keyword}:${geo}`;
  const hit = cached<NewsArticle[]>(cacheKey);
  if (hit) return hit;

  try {
    const q = encodeURIComponent(keyword);
    const gl = geo || "US";
    const hl = gl === "GB" ? "en-GB" : gl === "DE" ? "de" : gl === "JP" ? "ja" : gl === "BR" ? "pt-BR" : "en-US";
    const url = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split("-")[0]}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TrendLens/1.0 (trend analysis tool)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);

    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const articles: NewsArticle[] = [];

    for (const item of items) {
      if (articles.length >= 5) break;
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ??
                         item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      const title = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");
      if (!title) continue;

      articles.push({
        title,
        url: linkMatch?.[1]?.trim() ?? "",
        source: decodeHtmlEntities(sourceMatch?.[1]?.trim() ?? "Google News"),
        pubDate: pubDateMatch?.[1]?.trim() ?? "",
      });
    }

    setCache(cacheKey, articles);
    return articles;
  } catch (err) {
    console.error("Google News fetch failed:", err);
    return [];
  }
}

// ─── Composite ────────────────────────────────────────────────────────────────

export async function fetchAllTrends(
  keyword: string,
  range: TimeRange = "7d",
  includeRegions = false,
  geo: string = "US",
  skipGoogle = false
) {
  const fetchRegions: Promise<RegionInterest[]> = includeRegions
    ? fetchGoogleRegions(keyword, geo).catch((): RegionInterest[] => [])
    : Promise.resolve([] as RegionInterest[]);

  const googlePromise: Promise<SourceData> = skipGoogle
    ? Promise.resolve({ source: "google" as const, label: "Google Trends", score: 50, dataPoints: [] })
    : fetchGoogleTrends(keyword, range, geo);

  const [google, reddit, hn, wiki, github, regions, news] = await Promise.all([
    googlePromise,
    fetchRedditTrends(keyword, range),
    fetchHackerNewsTrends(keyword, range),
    fetchWikipediaPageViews(keyword, range),
    fetchGitHubTrends(keyword, range),
    fetchRegions,
    fetchGoogleNews(keyword, geo),
  ]);

  const sources = [google, reddit, hn, wiki, github];

  // Google 30%, Reddit 22%, HN 18%, Wikipedia 15%, GitHub 15%
  const compositeScore = Math.round(
    google.score * 0.3 +
      reddit.score * 0.22 +
      hn.score * 0.18 +
      wiki.score * 0.15 +
      github.score * 0.15
  );

  const allPoints = sources.flatMap((s) => s.dataPoints);
  let momentum: "rising" | "stable" | "declining" = "stable";

  if (allPoints.length >= 3) {
    const sorted = [...allPoints].sort((a, b) => a.date.localeCompare(b.date));
    const half = Math.floor(sorted.length / 2);
    const avgFirst =
      sorted.slice(0, half).reduce((s, p) => s + p.value, 0) / (half || 1);
    const avgSecond =
      sorted.slice(half).reduce((s, p) => s + p.value, 0) /
      (sorted.length - half || 1);

    if (avgSecond > avgFirst * 1.2) momentum = "rising";
    else if (avgSecond < avgFirst * 0.8) momentum = "declining";
  }

  return {
    keyword,
    compositeScore: Math.min(100, compositeScore),
    momentum,
    sources,
    regions,
    newsArticles: news,
    queriedAt: new Date().toISOString(),
    timeRange: range,
  };
}

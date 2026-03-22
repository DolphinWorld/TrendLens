import { NextRequest, NextResponse } from "next/server";
import { fetchAllTrends, fetchDailyTrends, fetchHotWordsWithRegions, fetchMastodonTrending, fetchAllGeoHotWords } from "@/lib/fetchers";
import { getDiscoveryTopics } from "@/lib/trending-topics";
import type { TrendResult, TimeRange } from "@/lib/types";

const VALID_RANGES = new Set<string>(["1h", "6h", "1d", "7d", "30d", "90d", "12m"]);

// Stagger requests to avoid rate limits
async function fetchSequentialWithDelay(
  topics: string[],
  range: TimeRange,
  delayMs = 2000,
  geo = "US",
  skipGoogle = false
): Promise<TrendResult[]> {
  const results: TrendResult[] = [];
  for (const topic of topics) {
    results.push(await fetchAllTrends(topic, range, false, geo, skipGoogle));
    if (results.length < topics.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q");
  const discover = req.nextUrl.searchParams.get("discover");
  const hotwords = req.nextUrl.searchParams.get("hotwords");
  const regions = req.nextUrl.searchParams.get("regions");
  const geoParam = req.nextUrl.searchParams.get("geo") ?? "US";
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "7d";
  const range: TimeRange = VALID_RANGES.has(rangeParam)
    ? (rangeParam as TimeRange)
    : "7d";

  try {
    // Hot words endpoints
    if (hotwords === "true") {
      const allgeos = req.nextUrl.searchParams.get("allgeos");
      if (allgeos === "true") {
        const result = await fetchAllGeoHotWords();
        return NextResponse.json(result);
      }
      if (regions === "true") {
        const result = await fetchHotWordsWithRegions(3, geoParam);
        return NextResponse.json(result);
      }
      const [googleWords, mastodonWords] = await Promise.all([
        fetchDailyTrends(geoParam),
        fetchMastodonTrending(),
      ]);
      const googleSet = new Set(googleWords.map((w) => w.word.toLowerCase()));
      const uniqueMastodon = mastodonWords.filter(
        (w) => !googleSet.has(w.word.toLowerCase())
      );
      return NextResponse.json([...googleWords, ...uniqueMastodon]);
    }

    if (keyword) {
      const result = await fetchAllTrends(keyword, range, true, geoParam);
      return NextResponse.json(result);
    }

    if (discover === "true") {
      let topics: string[];
      try {
        const hotWords = await fetchDailyTrends(geoParam);
        if (hotWords.length >= 5) {
          topics = hotWords.slice(0, 10).map((hw) => hw.word);
        } else {
          topics = getDiscoveryTopics(10);
        }
      } catch {
        topics = getDiscoveryTopics(10);
      }
      // skipGoogle=true: hot words already come from Google Trends RSS,
      // no need to re-query the API. This preserves rate limit budget for regions.
      const results = await fetchSequentialWithDelay(topics, range, 1500, geoParam, true);
      results.sort((a, b) => b.compositeScore - a.compositeScore);
      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: "Provide ?q=keyword, ?discover=true, or ?hotwords=true" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Trend fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}

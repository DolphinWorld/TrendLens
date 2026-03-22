import { NextRequest, NextResponse } from "next/server";
import { fetchAllTrends, fetchDailyTrends, fetchHotWordsWithRegions, fetchMastodonTrending, fetchAllGeoHotWords } from "@/lib/fetchers";
import { getDiscoveryTopics } from "@/lib/trending-topics";
import type { TimeRange, SourceKey } from "@/lib/types";
import { ALL_SOURCES } from "@/lib/types";

const VALID_RANGES = new Set<string>(["1h", "6h", "1d", "7d", "30d", "90d", "12m"]);
const VALID_SOURCES = new Set(ALL_SOURCES.map((s) => s.key));

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

  const sourcesParam = req.nextUrl.searchParams.get("sources");
  const enabledSources: SourceKey[] | undefined = sourcesParam
    ? (sourcesParam.split(",").filter((s) => VALID_SOURCES.has(s as SourceKey)) as SourceKey[])
    : undefined;

  try {
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
      const result = await fetchAllTrends(keyword, range, true, geoParam, false, enabledSources);
      return NextResponse.json(result);
    }

    if (discover === "true") {
      const stream = req.nextUrl.searchParams.get("stream") === "true";

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

      if (stream) {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              // Fire all topics in parallel — each streams its result as soon as it resolves
              const promises = topics.map(async (topic) => {
                try {
                  const result = await fetchAllTrends(topic, range, false, geoParam, true, enabledSources);
                  controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
                } catch {
                  // skip failed topics
                }
              });
              await Promise.all(promises);
            } catch (err) {
              console.error("Stream error:", err);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
          },
        });
      }

      // Non-streaming fallback: fetch all in parallel (still much faster than sequential)
      const results = await Promise.all(
        topics.map((topic) =>
          fetchAllTrends(topic, range, false, geoParam, true, enabledSources).catch(() => null)
        )
      );
      const valid = results.filter(Boolean) as Awaited<ReturnType<typeof fetchAllTrends>>[];
      valid.sort((a, b) => b.compositeScore - a.compositeScore);
      return NextResponse.json(valid);
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

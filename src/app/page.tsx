"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TrendResult, TimeRange, HotWord } from "@/lib/types";
import { SearchBar } from "@/components/search-bar";
import { TrendCard } from "@/components/trend-card";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { HeatMapCloud } from "@/components/heat-map-cloud";
import { GeoSelector } from "@/components/geo-selector";
import { getGeoConfig } from "@/lib/geo-config";

export default function HomePage() {
  const [results, setResults] = useState<TrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("7d");
  const [geo, setGeo] = useState("US");
  const [lastKeyword, setLastKeyword] = useState<string | null>(null);

  // Hot words (progressive loading)
  const [hotWords, setHotWords] = useState<HotWord[]>([]);
  const [hotWordsLoading, setHotWordsLoading] = useState(true);

  const geoRef = useRef(geo);
  geoRef.current = geo;

  const loadDiscovery = useCallback(async (r: TimeRange, g: string = geoRef.current) => {
    setDiscoveryLoading(true);
    try {
      const res = await fetch(`/api/trends?discover=true&range=${r}&geo=${g}`);
      const data = await res.json();
      if (Array.isArray(data)) setResults(data);
    } catch {
      // user can search manually
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);

  // Phase 1: Load hot words (fast, 1 API call)
  useEffect(() => {
    setHotWordsLoading(true);
    fetch(`/api/trends?hotwords=true&geo=${geo}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHotWords(data);
      })
      .catch(() => {})
      .finally(() => setHotWordsLoading(false));
  }, [geo]);

  useEffect(() => {
    loadDiscovery(range, geo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(keyword: string) {
    setLoading(true);
    setSearched(true);
    setLastKeyword(keyword);
    try {
      const res = await fetch(
        `/api/trends?q=${encodeURIComponent(keyword)}&range=${range}&geo=${geo}`
      );
      const data = await res.json();
      if (data.keyword) setResults([data]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSearched(false);
    setLastKeyword(null);
    setResults([]);
    loadDiscovery(range, geo);
  }

  function handleRangeChange(newRange: TimeRange) {
    setRange(newRange);
    if (searched && lastKeyword) {
      setLoading(true);
      fetch(
        `/api/trends?q=${encodeURIComponent(lastKeyword)}&range=${newRange}&geo=${geo}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.keyword) setResults([data]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setResults([]);
      loadDiscovery(newRange, geo);
    }
  }

  function handleGeoChange(newGeo: string) {
    setGeo(newGeo);
    setHotWords([]);
    if (searched && lastKeyword) {
      setLoading(true);
      fetch(
        `/api/trends?q=${encodeURIComponent(lastKeyword)}&range=${range}&geo=${newGeo}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.keyword) setResults([data]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setResults([]);
      loadDiscovery(range, newGeo);
    }
  }

  const geoConfig = getGeoConfig(geo);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TrendLens</h1>
        </div>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Spot rising trends before they go mainstream. Free trend intelligence
          powered by public data &amp; AI.
        </p>
      </header>

      {/* Search */}
      <SearchBar
        onSearch={handleSearch}
        loading={loading}
        externalValue={lastKeyword ?? undefined}
      />

      {/* Controls: Geo + Time Range */}
      <div className="flex justify-center mt-4 gap-3 flex-wrap">
        <GeoSelector value={geo} onChange={handleGeoChange} />
        <TimeRangeSelector value={range} onChange={handleRangeChange} />
      </div>

      {/* Hot Words Heat Map */}
      <div className="mt-6">
        <HeatMapCloud
          words={hotWords}
          onWordClick={handleSearch}
          loading={hotWordsLoading}
          geoLabel={geoConfig.name}
        />
      </div>

      {/* Results */}
      <div className="mt-6">
        {searched && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-muted">
              Search Results
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-accent hover:underline"
            >
              Back to discovery
            </button>
          </div>
        )}

        {!searched && !discoveryLoading && results.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-muted">
              Top Trends Right Now
            </h2>
            <button
              onClick={() => loadDiscovery(range, geo)}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Refresh
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {(loading || discoveryLoading) && results.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-5 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-5 w-28 bg-surface-alt rounded" />
                    <div className="h-4 w-16 bg-surface-alt rounded mt-2" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-surface-alt" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full bg-surface-alt rounded" />
                  <div className="h-3 w-3/4 bg-surface-alt rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((trend, i) => (
              <div
                key={trend.keyword}
                className={`animate-fade-in animate-fade-in-delay-${Math.min(i, 4)}`}
              >
                <TrendCard trend={trend} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">
              No trend data found. Try a different keyword.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-text-muted">
        <p>
          Data from Google Trends, Reddit, Hacker News, Wikipedia, GitHub, and
          Mastodon. AI insights by Claude.
        </p>
        <p className="mt-1">Built for indie makers who move fast.</p>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TrendResult, StateKeywordMatrix, WorldHotWords, HotWord } from "@/lib/types";
import { US_STATE_COORDS } from "@/lib/geo-coords";
import { US_REGIONS } from "@/lib/us-regions";
import { getGeoConfig, SUPPORTED_GEOS } from "@/lib/geo-config";
import { scoreColor } from "@/lib/score-color";

interface MapInnerProps {
  trends: TrendResult[];
  stateMatrix?: StateKeywordMatrix | null;
  geo?: string;
  worldHotWords?: WorldHotWords | null;
}

interface StateData {
  geo: string;
  name: string;
  topKeyword: string;
  topValue: number;
  keywords: { keyword: string; value: number }[];
}

interface RegionData {
  id: string;
  name: string;
  center: [number, number];
  avgValue: number;
  topKeywords: { keyword: string; value: number }[];
  stateCount: number;
}

interface WorldMarker {
  geo: string;
  name: string;
  center: [number, number];
  topWord: string;
  traffic: number;
  totalTraffic: number;
  words: HotWord[];
}

function buildStateData(trends: TrendResult[]): StateData[] {
  const stateMap = new Map<
    string,
    { name: string; keywords: { keyword: string; value: number }[] }
  >();

  for (const trend of trends) {
    for (const region of trend.regions ?? []) {
      if (!stateMap.has(region.geo)) {
        stateMap.set(region.geo, { name: region.name, keywords: [] });
      }
      stateMap.get(region.geo)!.keywords.push({
        keyword: trend.keyword,
        value: region.value,
      });
    }
  }

  return Array.from(stateMap.entries()).map(([geo, data]) => {
    const sorted = [...data.keywords].sort((a, b) => b.value - a.value);
    return {
      geo,
      name: data.name,
      topKeyword: sorted[0].keyword,
      topValue: sorted[0].value,
      keywords: sorted.slice(0, 5),
    };
  });
}

function buildStateDataFromMatrix(matrix: StateKeywordMatrix): StateData[] {
  return Object.entries(matrix).map(([geo, data]) => ({
    geo,
    name: data.name,
    topKeyword: data.keywords[0]?.keyword ?? "",
    topValue: data.keywords[0]?.score ?? 0,
    keywords: data.keywords.slice(0, 5).map((k) => ({ keyword: k.keyword, value: k.score })),
  }));
}

function buildRegionData(stateData: StateData[]): RegionData[] {
  return US_REGIONS.map((region) => {
    const memberStates = stateData.filter((s) => region.states.includes(s.geo));
    if (memberStates.length === 0) return null;

    const values = memberStates.map((s) => s.topValue);
    const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    const kwMap = new Map<string, number>();
    for (const state of memberStates) {
      for (const kw of state.keywords) {
        kwMap.set(kw.keyword, Math.max(kwMap.get(kw.keyword) ?? 0, kw.value));
      }
    }
    const topKeywords = Array.from(kwMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([keyword, value]) => ({ keyword, value }));

    return {
      id: region.id,
      name: region.name,
      center: region.center,
      avgValue,
      topKeywords,
      stateCount: memberStates.length,
    };
  }).filter(Boolean) as RegionData[];
}

interface CountryData {
  name: string;
  center: [number, number];
  avgValue: number;
  topKeywords: { keyword: string; value: number }[];
  stateCount: number;
}

function buildCountryData(stateData: StateData[], geoCode: string = "US"): CountryData | null {
  if (stateData.length === 0) return null;

  const config = getGeoConfig(geoCode);
  const values = stateData.map((s) => s.topValue);
  const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const kwMap = new Map<string, number>();
  for (const state of stateData) {
    for (const kw of state.keywords) {
      kwMap.set(kw.keyword, Math.max(kwMap.get(kw.keyword) ?? 0, kw.value));
    }
  }
  const topKeywords = Array.from(kwMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword, value]) => ({ keyword, value }));

  return {
    name: config.name,
    center: config.center,
    avgValue,
    topKeywords,
    stateCount: stateData.length,
  };
}

function buildWorldMarkers(worldHotWords: WorldHotWords): WorldMarker[] {
  return Object.entries(worldHotWords)
    .filter(([, words]) => words.length > 0)
    .map(([geo, words]) => {
      const config = SUPPORTED_GEOS.find((g) => g.code === geo);
      if (!config) return null;
      const totalTraffic = words.reduce((sum, w) => sum + w.traffic, 0);
      return {
        geo,
        name: config.name,
        center: config.center,
        topWord: words[0].word,
        traffic: words[0].traffic,
        totalTraffic,
        words: words.slice(0, 5),
      };
    })
    .filter(Boolean) as WorldMarker[];
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (!prev || prev.lat !== center[0] || prev.lng !== center[1] || prev.zoom !== zoom) {
      map.setView(center, zoom);
      prevRef.current = { lat: center[0], lng: center[1], zoom };
    }
  }, [map, center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function MapInner({ trends, stateMatrix, geo = "US", worldHotWords }: MapInnerProps) {
  const geoConfig = getGeoConfig(geo);
  const isUS = geo === "US";
  const [zoom, setZoom] = useState(geoConfig.defaultZoom);

  const isWorldMode = !!worldHotWords && Object.keys(worldHotWords).length > 0;

  useEffect(() => {
    if (isWorldMode) setZoom(2);
  }, [isWorldMode]);
  const worldMarkers = isWorldMode ? buildWorldMarkers(worldHotWords) : [];

  // Rank-based scoring for world markers (global ranking)
  const rankedWorldMarkers = (() => {
    if (worldMarkers.length === 0) return [];
    const sorted = [...worldMarkers].sort((a, b) => b.totalTraffic - a.totalTraffic);
    return sorted.map((marker, i) => ({
      ...marker,
      rankScore: Math.round(((sorted.length - i) / sorted.length) * 100),
    }));
  })();

  const stateDataFromTrends = buildStateData(trends);
  const stateDataFromMatrix = stateMatrix ? buildStateDataFromMatrix(stateMatrix) : [];
  const stateData = stateDataFromTrends.length > 0 ? stateDataFromTrends : stateDataFromMatrix;
  const regionData = isUS ? buildRegionData(stateData) : [];
  const countryData = buildCountryData(stateData, geo);

  const showCountry = !isUS || zoom <= 2;
  const showRegions = isUS && zoom > 2 && zoom <= 4;

  if (!isWorldMode && stateData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        No regional data available
      </div>
    );
  }

  const mapCenter: [number, number] = isWorldMode ? [20, 0] : geoConfig.center;
  const mapZoom = isWorldMode ? 2 : geoConfig.defaultZoom;
  const maxLogTraffic = isWorldMode ? Math.max(...rankedWorldMarkers.map((m) => Math.log(m.totalTraffic + 1)), 1) : 1;

  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <ZoomTracker onZoomChange={setZoom} />
      <MapUpdater center={mapCenter} zoom={mapZoom} />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {isWorldMode
        ? rankedWorldMarkers.map((marker) => {
            const logRatio = Math.log(marker.totalTraffic + 1) / maxLogTraffic;
            const radius = 18 + logRatio * 22;
            const color = scoreColor(marker.rankScore);

            return (
              <CircleMarker
                key={marker.geo}
                center={marker.center}
                radius={radius}
                fillColor={color}
                fillOpacity={0.5}
                stroke={true}
                color={color}
                weight={3}
                opacity={0.7}
              >
                <Tooltip permanent direction="top" className="map-label" offset={[0, -8]}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {marker.topWord}
                  </span>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
                      {marker.name}
                    </div>
                    {marker.words.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "1px 0",
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>{w.word}</span>
                        <span style={{ fontWeight: 600, opacity: 0.6, fontSize: 11 }}>
                          {w.trafficLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        : showCountry && countryData
        ? (() => {
            const radius = 35 + (countryData.avgValue / 100) * 20;
            const color = scoreColor(countryData.avgValue);
            return (
              <CircleMarker
                key="country-us"
                center={countryData.center}
                radius={radius}
                fillColor={color}
                fillOpacity={0.5}
                stroke={true}
                color={color}
                weight={3}
                opacity={0.7}
              >
                <Tooltip permanent direction="center" className="map-label" offset={[0, 0]}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {countryData.topKeywords[0]?.keyword ?? "US"}
                  </span>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      {countryData.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                      {countryData.stateCount} regions
                    </div>
                    {countryData.topKeywords.map((k, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>
                          {k.keyword}
                        </span>
                        <span style={{ fontWeight: 600, color: scoreColor(k.value) }}>
                          {k.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })()
        : showRegions
        ? regionData.map((region) => {
            const radius = 20 + (region.avgValue / 100) * 25;
            const color = scoreColor(region.avgValue);
            return (
              <CircleMarker
                key={region.id}
                center={region.center}
                radius={radius}
                fillColor={color}
                fillOpacity={0.5}
                stroke={true}
                color={color}
                weight={3}
                opacity={0.7}
              >
                <Tooltip permanent direction="center" className="map-label" offset={[0, 0]}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {region.topKeywords[0]?.keyword ?? ""}
                  </span>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      {region.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                      {region.stateCount} states
                    </div>
                    {region.topKeywords.map((k, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>
                          {k.keyword}
                        </span>
                        <span style={{ fontWeight: 600, color: scoreColor(k.value) }}>
                          {k.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        : stateData.map((state) => {
            const coords = US_STATE_COORDS[state.geo];
            if (!coords) return null;
            const radius = 8 + (state.topValue / 100) * 14;
            const color = scoreColor(state.topValue);
            return (
              <CircleMarker
                key={state.geo}
                center={coords}
                radius={radius}
                fillColor={color}
                fillOpacity={0.6}
                stroke={true}
                color={color}
                weight={2}
                opacity={0.8}
              >
                <Tooltip permanent direction="center" className="map-label" offset={[0, 0]}>
                  <span style={{ fontSize: 9, fontWeight: 600 }}>
                    {state.topKeyword}
                  </span>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 130 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {state.name}
                    </div>
                    {state.keywords.map((k, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>
                          {k.keyword}
                        </span>
                        <span style={{ fontWeight: 600, color: scoreColor(k.value) }}>
                          {k.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
    </MapContainer>
  );
}

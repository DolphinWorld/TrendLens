export interface GeoConfig {
  code: string;
  name: string;
  center: [number, number];
  defaultZoom: number;
  hasRegions: boolean;
  rssGeo: string;
}

export const SUPPORTED_GEOS: GeoConfig[] = [
  { code: "", name: "Global", center: [20, 0], defaultZoom: 2, hasRegions: false, rssGeo: "" },
  { code: "US", name: "United States", center: [39.8, -98.5], defaultZoom: 4, hasRegions: true, rssGeo: "US" },
  { code: "GB", name: "United Kingdom", center: [54.0, -2.0], defaultZoom: 6, hasRegions: false, rssGeo: "GB" },
  { code: "CA", name: "Canada", center: [56.0, -106.0], defaultZoom: 4, hasRegions: false, rssGeo: "CA" },
  { code: "AU", name: "Australia", center: [-25.3, 133.8], defaultZoom: 4, hasRegions: false, rssGeo: "AU" },
  { code: "DE", name: "Germany", center: [51.2, 10.5], defaultZoom: 6, hasRegions: false, rssGeo: "DE" },
  { code: "FR", name: "France", center: [46.6, 2.3], defaultZoom: 6, hasRegions: false, rssGeo: "FR" },
  { code: "ES", name: "Spain", center: [40.5, -3.7], defaultZoom: 6, hasRegions: false, rssGeo: "ES" },
  { code: "IT", name: "Italy", center: [41.9, 12.6], defaultZoom: 6, hasRegions: false, rssGeo: "IT" },
  { code: "JP", name: "Japan", center: [36.2, 138.3], defaultZoom: 6, hasRegions: false, rssGeo: "JP" },
  { code: "IN", name: "India", center: [20.6, 79.0], defaultZoom: 5, hasRegions: false, rssGeo: "IN" },
  { code: "BR", name: "Brazil", center: [-14.2, -51.9], defaultZoom: 4, hasRegions: false, rssGeo: "BR" },
];

export function getGeoConfig(code: string): GeoConfig {
  return SUPPORTED_GEOS.find((g) => g.code === code) ?? SUPPORTED_GEOS[0];
}

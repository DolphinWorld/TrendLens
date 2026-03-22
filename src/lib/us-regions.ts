export interface USRegion {
  id: string;
  name: string;
  center: [number, number];
  states: string[];
}

export const US_REGIONS: USRegion[] = [
  {
    id: "pacific",
    name: "Pacific",
    center: [42.5, -122.0],
    states: ["US-WA", "US-OR", "US-CA", "US-AK", "US-HI"],
  },
  {
    id: "mountain",
    name: "Mountain",
    center: [42.0, -110.0],
    states: ["US-MT", "US-ID", "US-WY", "US-NV", "US-UT", "US-CO", "US-AZ", "US-NM"],
  },
  {
    id: "midwest",
    name: "Midwest",
    center: [42.5, -93.0],
    states: ["US-ND", "US-SD", "US-NE", "US-KS", "US-MN", "US-IA", "US-MO", "US-WI", "US-IL", "US-IN", "US-MI", "US-OH"],
  },
  {
    id: "south",
    name: "South",
    center: [33.0, -92.0],
    states: ["US-TX", "US-OK", "US-AR", "US-LA", "US-MS", "US-AL", "US-TN", "US-KY"],
  },
  {
    id: "southeast",
    name: "Southeast",
    center: [33.5, -80.0],
    states: ["US-FL", "US-GA", "US-SC", "US-NC", "US-VA", "US-WV", "US-DC", "US-MD", "US-DE"],
  },
  {
    id: "northeast",
    name: "Northeast",
    center: [42.5, -73.5],
    states: ["US-PA", "US-NJ", "US-NY", "US-CT", "US-RI", "US-MA", "US-VT", "US-NH", "US-ME"],
  },
];

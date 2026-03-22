// Curated seed topics for the dashboard discovery feed.
// These rotate on each load to keep the dashboard fresh.

const TRENDING_SEEDS = [
  // Tech
  "AI agents", "local LLM", "Rust programming", "WebAssembly",
  "edge computing", "vector database", "MCP protocol", "vibe coding",
  // Health & Wellness
  "GLP-1 drugs", "cold plunge", "zone 2 cardio", "gut microbiome",
  // Consumer & E-commerce
  "Stanley cup tumbler", "Kindle Colorsoft", "smart ring",
  "portable power station", "3D printer",
  // Finance & Business
  "fractional real estate", "creator economy", "solo founder",
  "micro SaaS", "revenue based financing",
  // Culture
  "pickleball", "retro gaming", "film photography", "vinyl records",
  "sourdough", "mushroom coffee",
];

export function getDiscoveryTopics(count = 6): string[] {
  const shuffled = [...TRENDING_SEEDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "health", label: "Health" },
  { id: "business", label: "Business" },
  { id: "consumer", label: "Consumer" },
  { id: "culture", label: "Culture" },
] as const;

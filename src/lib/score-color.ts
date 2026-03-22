export function scoreColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));

  let h: number, sat: number, l: number;

  if (s <= 40) {
    // Gray → Yellow: keep hue at 45 (yellow), increase saturation
    const t = s / 40;
    h = 45;
    sat = 8 + (85 - 8) * t;      // 8% (gray) → 85% (vivid yellow)
    l = 68 + (55 - 68) * t;      // 68% (light gray) → 55% (yellow)
  } else {
    // Yellow → Green: shift hue from 45 to 145
    const t = (s - 40) / 60;
    h = 45 + (145 - 45) * t;     // 45 → 145
    sat = 85 + (70 - 85) * t;    // 85% → 70%
    l = 55 + (42 - 55) * t;      // 55% → 42%
  }

  return `hsl(${Math.round(h)}, ${Math.round(sat)}%, ${Math.round(l)}%)`;
}

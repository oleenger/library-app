// Small presentation helpers shared by server and client components.
// Kept out of any "use client" module so server components can call them directly.

// A muted-jewel scale that walks the colour wheel in chronological order
// (gold → amber → terracotta → olive → rose → plum → teal → indigo → green).
// Adjacent eras are deliberately given different hues so neighbours never blur
// together — in particular Romantic (rose) and Victorian (plum) must read as
// two distinct colours, not two muddy reds. Colour is never the sole signal:
// a period label is always shown beside the swatch.
const PERIOD_COLOR: Record<string, string> = {
  "Classical / Antiquity": "#a9822c",
  Medieval: "#946231",
  "Renaissance / Early Modern": "#b25e33",
  "Enlightenment / Neoclassical": "#77792f",
  Romantic: "#bc4b52",
  "Victorian / 19th century": "#8a4a79",
  "Modernist / early 20th century": "#2e7b84",
  "Postwar / late 20th century": "#47569e",
  Contemporary: "#2f8a5b",
};

export function periodColor(period: string | null): string {
  return (period && PERIOD_COLOR[period]) || "#7a7166";
}

export function formatYear(year: number | null): string {
  if (year === null) return "—";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

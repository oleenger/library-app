// Small presentation helpers shared by server and client components.
// Kept out of any "use client" module so server components can call them directly.

// Subtle, distinct tint per period so lists read as a shelf without relying on
// colour alone (proposal §12: colour must not be the only indicator — a period
// label is always shown alongside the dot).
const PERIOD_TINT: Record<string, string> = {
  "Classical / Antiquity": "bg-[#a8894e]",
  Medieval: "bg-[#8a6d46]",
  "Renaissance / Early Modern": "bg-[#9c6b3f]",
  "Enlightenment / Neoclassical": "bg-[#7c7a3f]",
  Romantic: "bg-[#a35b54]",
  "Victorian / 19th century": "bg-[#7d4b52]",
  "Modernist / early 20th century": "bg-[#3f6b6e]",
  "Postwar / late 20th century": "bg-[#5b4e78]",
  Contemporary: "bg-[#3f7a5c]",
};

// The same palette as raw hex, for generated book "covers" (inline gradients).
const PERIOD_COLOR: Record<string, string> = {
  "Classical / Antiquity": "#a8894e",
  Medieval: "#8a6d46",
  "Renaissance / Early Modern": "#9c6b3f",
  "Enlightenment / Neoclassical": "#7c7a3f",
  Romantic: "#a35b54",
  "Victorian / 19th century": "#7d4b52",
  "Modernist / early 20th century": "#3f6b6e",
  "Postwar / late 20th century": "#5b4e78",
  Contemporary: "#3f7a5c",
};

export function periodDot(period: string | null): string {
  return (period && PERIOD_TINT[period]) || "bg-ink-faint";
}

export function periodColor(period: string | null): string {
  return (period && PERIOD_COLOR[period]) || "#6b746f";
}

export function formatYear(year: number | null): string {
  if (year === null) return "—";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

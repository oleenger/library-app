// Small presentation helpers shared by server and client components.
// Kept out of any "use client" module so server components can call them directly.

// Subtle, distinct tint per period so lists read as a shelf without relying on
// colour alone (proposal §12: colour must not be the only indicator — a period
// label is always shown alongside the dot).
const PERIOD_TINT: Record<string, string> = {
  "Classical / Antiquity": "bg-[#c9b98f]",
  Medieval: "bg-[#b7a98c]",
  "Renaissance / Early Modern": "bg-[#c2a878]",
  "Enlightenment / Neoclassical": "bg-[#bcb488]",
  Romantic: "bg-[#c7a58f]",
  "Victorian / 19th century": "bg-[#b98f95]",
  "Modernist / early 20th century": "bg-[#93a7a7]",
  "Postwar / late 20th century": "bg-[#a598b0]",
  Contemporary: "bg-[#8fae9c]",
};

export function periodDot(period: string | null): string {
  return (period && PERIOD_TINT[period]) || "bg-ink-faint";
}

export function formatYear(year: number | null): string {
  if (year === null) return "—";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

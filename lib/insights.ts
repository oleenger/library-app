// Derived, aggregate views over the catalogue: the numbers and groupings the
// front page surfaces (headline stats, a period timeline, author frequencies,
// a featured pick). All pure so they run on the server for first paint and can
// be recomputed on the client as filters change.

import type { Work } from "./types";

export interface LibraryStats {
  works: number;
  authors: number;
  movements: number;
  periods: number;
  /** Earliest / latest first-published year present (nulls ignored). */
  earliestYear: number | null;
  latestYear: number | null;
}

/** Headline counts for the stats strip. */
export function getStats(works: Work[]): LibraryStats {
  const authors = new Set<string>();
  const movements = new Set<string>();
  const periods = new Set<string>();
  let earliest: number | null = null;
  let latest: number | null = null;

  for (const w of works) {
    if (w.author) authors.add(w.author);
    if (w.classification.period) periods.add(w.classification.period);
    if (w.classification.primaryMovement) {
      movements.add(w.classification.primaryMovement);
    }
    for (const m of w.classification.secondaryMovements) movements.add(m);

    const y = w.originalYear;
    if (y !== null) {
      earliest = earliest === null ? y : Math.min(earliest, y);
      latest = latest === null ? y : Math.max(latest, y);
    }
  }

  return {
    works: works.length,
    authors: authors.size,
    movements: movements.size,
    periods: periods.size,
    earliestYear: earliest,
    latestYear: latest,
  };
}

/**
 * Pick a work to feature. Deterministic given `seed` so the server and client
 * agree on first render (no hydration mismatch); omit `seed` for a random pick.
 */
export function pickFeatured(works: Work[], seed?: number): Work | null {
  if (works.length === 0) return null;
  const r = seed === undefined ? Math.random() : (seed % works.length) / works.length;
  return works[Math.floor(r * works.length) % works.length];
}

// Derived, aggregate views over the catalogue: the numbers and groupings the
// front page surfaces. All pure so they can run on the server for first paint.

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

/** Headline counts for the collection overview. */
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

// Derived, aggregate views over the catalogue: the numbers and groupings the
// front page surfaces. All pure so they can run on the server for first paint.

import type { Work } from "./types";
import { PERIODS } from "./taxonomy";

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

export interface PeriodReadStat {
  period: string;
  read: number;
  total: number;
}

export interface ReadingStats {
  /** Works in the collection that are marked read. */
  read: number;
  /** Total works in the collection. */
  total: number;
  /** Read as a share of the collection, 0..100 (rounded). */
  percent: number;
  /** Read works that carry a rating. */
  rated: number;
  /** Mean of available ratings, or null when nothing is rated. */
  averageRating: number | null;
  /** Read works whose Date Read falls in the current calendar year. */
  readThisYear: number;
  /** The most-read author and their read count, or null when nothing is read. */
  topAuthor: { author: string; count: number } | null;
  /** Per-period read vs total, chronological, periods with any works only. */
  byPeriod: PeriodReadStat[];
}

export interface YearReadStat {
  /** Calendar year the works were read (from Date Read). */
  year: number;
  count: number;
}

export interface MovementReadStat {
  movement: string;
  count: number;
}

/** A single read work, flattened for the reads listing. */
export interface ReadBook {
  id: string;
  title: string;
  author: string;
  dateRead: string | null;
  rating: number | null;
  period: string | null;
  primaryMovement: string | null;
  source: string | null;
}

export interface ReadsPageData {
  /** Read works, newest Date Read first; undated works sort last. */
  books: ReadBook[];
  /** Reads per calendar year, most recent year first. Undated excluded. */
  byYear: YearReadStat[];
  /** Per-period read vs total, chronological, periods with any works only. */
  byPeriod: PeriodReadStat[];
  /** Read counts per primary movement, most-read first. */
  byMovement: MovementReadStat[];
  /** Total read works. */
  read: number;
}

/** Everything the dedicated "Read books" page renders, in one pass. */
export function getReadsPageData(works: Work[]): ReadsPageData {
  const periodTotals = new Map<string, number>();
  const periodReads = new Map<string, number>();
  const yearReads = new Map<number, number>();
  const movementReads = new Map<string, number>();
  const books: ReadBook[] = [];

  for (const w of works) {
    const period = w.classification.period;
    if (period) periodTotals.set(period, (periodTotals.get(period) ?? 0) + 1);
    if (!w.reading) continue;

    if (period) periodReads.set(period, (periodReads.get(period) ?? 0) + 1);

    const movement = w.classification.primaryMovement;
    if (movement) movementReads.set(movement, (movementReads.get(movement) ?? 0) + 1);

    if (w.reading.dateRead) {
      const year = Number(w.reading.dateRead.slice(0, 4));
      if (Number.isFinite(year)) yearReads.set(year, (yearReads.get(year) ?? 0) + 1);
    }

    books.push({
      id: w.id,
      title: w.title,
      author: w.author,
      dateRead: w.reading.dateRead,
      rating: w.reading.rating,
      period,
      primaryMovement: movement,
      source: w.reading.source,
    });
  }

  // Newest first; undated (null) always after dated.
  books.sort((a, b) => {
    if (a.dateRead === b.dateRead) return a.title.localeCompare(b.title);
    if (!a.dateRead) return 1;
    if (!b.dateRead) return -1;
    return b.dateRead.localeCompare(a.dateRead);
  });

  const byYear: YearReadStat[] = [...yearReads.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  const byPeriod: PeriodReadStat[] = PERIODS.filter((p) => periodTotals.has(p)).map(
    (p) => ({
      period: p,
      read: periodReads.get(p) ?? 0,
      total: periodTotals.get(p) ?? 0,
    }),
  );

  const byMovement: MovementReadStat[] = [...movementReads.entries()]
    .map(([movement, count]) => ({ movement, count }))
    .sort((a, b) => b.count - a.count || a.movement.localeCompare(b.movement));

  return { books, byYear, byPeriod, byMovement, read: books.length };
}

/** Reading-history aggregates for the front-page statistics panel. */
export function getReadingStats(works: Work[]): ReadingStats {
  const total = works.length;
  const thisYear = new Date().getFullYear();

  let read = 0;
  let rated = 0;
  let ratingSum = 0;
  let readThisYear = 0;

  const readByAuthor = new Map<string, number>();
  const periodTotals = new Map<string, number>();
  const periodReads = new Map<string, number>();

  for (const w of works) {
    const period = w.classification.period;
    if (period) periodTotals.set(period, (periodTotals.get(period) ?? 0) + 1);

    if (!w.reading) continue;
    read++;
    if (period) periodReads.set(period, (periodReads.get(period) ?? 0) + 1);

    if (w.reading.rating != null) {
      rated++;
      ratingSum += w.reading.rating;
    }
    if (w.reading.dateRead?.startsWith(String(thisYear))) readThisYear++;
    if (w.author) readByAuthor.set(w.author, (readByAuthor.get(w.author) ?? 0) + 1);
  }

  let topAuthor: ReadingStats["topAuthor"] = null;
  for (const [author, count] of readByAuthor) {
    if (!topAuthor || count > topAuthor.count) topAuthor = { author, count };
  }

  const byPeriod: PeriodReadStat[] = PERIODS.filter((p) => periodTotals.has(p)).map(
    (p) => ({
      period: p,
      read: periodReads.get(p) ?? 0,
      total: periodTotals.get(p) ?? 0,
    }),
  );

  return {
    read,
    total,
    percent: total > 0 ? Math.round((read / total) * 100) : 0,
    rated,
    averageRating: rated > 0 ? ratingSum / rated : null,
    readThisYear,
    topAuthor,
    byPeriod,
  };
}

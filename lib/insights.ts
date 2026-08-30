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

/**
 * A Goodreads "read" entry that could not be matched to any library work — i.e.
 * a book the user has read but does not (yet) own/catalogue. Rendered in the
 * reads list without a link and subtly flagged as outside the library.
 */
export interface ForeignRead {
  title: string;
  author: string;
  dateRead: string | null;
  rating: number | null;
}

/** A row in the rendered reads list: either a library work or a foreign read. */
export interface ReadListItem {
  /** Stable React key. */
  key: string;
  /** Work id when the book is in the library; null for foreign reads. */
  id: string | null;
  title: string;
  author: string;
  dateRead: string | null;
  rating: number | null;
  period: string | null;
  primaryMovement: string | null;
  /** False for Goodreads reads with no matching library work. */
  inLibrary: boolean;
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

/**
 * Combine the library's read works with foreign Goodreads reads (books read but
 * not in the library) into one date-desc list for the reads page. Library reads
 * sort before foreign reads on the same date/title so owned copies lead.
 */
export function mergeReadList(
  books: ReadBook[],
  foreign: ForeignRead[],
): ReadListItem[] {
  const items: ReadListItem[] = books.map((b) => ({
    key: `lib:${b.id}`,
    id: b.id,
    title: b.title,
    author: b.author,
    dateRead: b.dateRead,
    rating: b.rating,
    period: b.period,
    primaryMovement: b.primaryMovement,
    inLibrary: true,
  }));

  foreign.forEach((f, i) => {
    items.push({
      key: `ext:${i}:${f.author}\u0000${f.title}`,
      id: null,
      title: f.title,
      author: f.author,
      dateRead: f.dateRead,
      rating: f.rating,
      period: null,
      primaryMovement: null,
      inLibrary: false,
    });
  });

  items.sort((a, b) => {
    if (a.dateRead !== b.dateRead) {
      if (!a.dateRead) return 1;
      if (!b.dateRead) return -1;
      return b.dateRead.localeCompare(a.dateRead);
    }
    if (a.inLibrary !== b.inLibrary) return a.inLibrary ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return items;
}

/**
 * Fold foreign reads into the per-year read counts so the "By year" breakdown
 * reflects the whole reading list, not just owned books. (Period/movement
 * breakdowns can't include foreign reads — they carry no classification.)
 */
export function mergeByYear(
  byYear: YearReadStat[],
  foreign: ForeignRead[],
): YearReadStat[] {
  const counts = new Map<number, number>();
  for (const y of byYear) counts.set(y.year, y.count);
  for (const f of foreign) {
    if (!f.dateRead) continue;
    const year = Number(f.dateRead.slice(0, 4));
    if (Number.isFinite(year)) counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
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

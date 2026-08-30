// Persist the Goodreads "read" shelf in Supabase so it survives beyond a single
// upload. This is what makes reconciliation possible: when books are added to the
// library after an export was imported, the stored shelf is replayed against the
// new catalogue (see matchReadsAgainstLibrary) without asking the user to
// re-upload the same CSV.

import { admin } from "../supabase/admin";
import { unstable_cache } from "next/cache";
import { CATALOGUE_TAG } from "../cache-tags";
import type { GoodreadsRead } from "./goodreads";
import { readKey } from "./normalize";
import type { ForeignRead } from "../insights";

interface Row {
  title: string;
  author: string;
  year: number | null;
  date_read: string | null;
  rating: number | null;
}

/** Upsert the parsed export shelf; the latest upload wins per (title, author). */
export async function saveGoodreadsReads(reads: GoodreadsRead[]): Promise<void> {
  if (reads.length === 0) return;
  // De-dup within the batch on (title, author) so the upsert never sees two rows
  // with the same conflict key (Postgres rejects that in a single statement).
  const byKey = new Map<string, Row>();
  for (const r of reads) {
    byKey.set(`${r.title}\u0000${r.author}`, {
      title: r.title,
      author: r.author,
      year: r.year,
      date_read: r.dateRead,
      rating: r.rating,
    });
  }
  const { error } = await admin()
    .from("goodreads_reads")
    .upsert([...byKey.values()], { onConflict: "title,author" });
  if (error) throw new Error(`goodreads_reads write failed: ${error.message}`);
}

/** The persisted shelf, as GoodreadsRead rows ready to feed the matcher. */
export async function loadGoodreadsReads(): Promise<GoodreadsRead[]> {
  const { data, error } = await admin()
    .from("goodreads_reads")
    .select("title, author, year, date_read, rating")
    .limit(100_000);
  if (error) throw new Error(`goodreads_reads read failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    title: r.title,
    author: r.author,
    year: r.year,
    dateRead: r.date_read,
    rating: r.rating,
  }));
}

/** How many rows are on the persisted shelf (for UI hints). */
export async function countGoodreadsReads(): Promise<number> {
  const { count, error } = await admin()
    .from("goodreads_reads")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`goodreads_reads count failed: ${error.message}`);
  return count ?? 0;
}

/**
 * The persisted Goodreads "read" shelf entries that do NOT match any library
 * work — books read but not in the collection. Uses the same deterministic
 * title+author normalisation as the Tier-1 matcher, so anything the importer
 * would have paired to a work is excluded here (no duplicate rows on the reads
 * page). Translated titles paired only by the LLM tier are the one edge case
 * this cannot detect without a call, and are deliberately left out of scope.
 */
export const loadForeignGoodreadsReads = unstable_cache(
  async (): Promise<ForeignRead[]> => {
    const db = admin();
    const [shelfRes, worksRes] = await Promise.all([
      db.from("goodreads_reads").select("title, author, date_read, rating").limit(100_000),
      db.from("works").select("title, author").limit(100_000),
    ]);
    if (shelfRes.error) {
      throw new Error(`goodreads_reads read failed: ${shelfRes.error.message}`);
    }
    if (worksRes.error) {
      throw new Error(`library load failed: ${worksRes.error.message}`);
    }

    const libraryKeys = new Set<string>();
    for (const w of worksRes.data ?? []) {
      const title = w.title?.trim();
      const author = w.author?.trim();
      if (title && author) libraryKeys.add(readKey(title, author));
    }

    const foreign: ForeignRead[] = [];
    for (const r of shelfRes.data ?? []) {
      if (!r.title || !r.author) continue;
      if (libraryKeys.has(readKey(r.title, r.author))) continue;
      foreign.push({
        title: r.title,
        author: r.author,
        dateRead: r.date_read,
        rating: r.rating,
      });
    }
    return foreign;
  },
  ["foreign-goodreads-reads"],
  { tags: [CATALOGUE_TAG], revalidate: false },
);


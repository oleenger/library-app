// Read/write reading history in the Supabase `read_status` table, keyed by the
// catalogue work id each row was matched to. Kept separate from the catalogue
// tables so reader data never mixes into the bibliographic record.

import { admin } from "../supabase/admin";

/** A read work, keyed by the catalogue work id it was matched to. */
export interface ReadRecord {
  workId: string;
  title: string;
  author: string;
  dateRead: string | null;
  rating: number | null;
  /** How it was matched: "exact" (deterministic) or "llm" (model fallback). */
  source: "exact" | "llm";
}

interface Row {
  work_id: string;
  title: string | null;
  author: string | null;
  date_read: string | null;
  rating: number | null;
  source: string | null;
}

function toRecord(r: Row): ReadRecord {
  return {
    workId: r.work_id,
    title: r.title ?? "",
    author: r.author ?? "",
    dateRead: r.date_read?.trim() || null,
    rating: r.rating != null && r.rating > 0 ? r.rating : null,
    source: r.source === "llm" ? "llm" : "exact",
  };
}

export async function readReadStatus(): Promise<ReadRecord[]> {
  const { data, error } = await admin()
    .from("read_status")
    .select("work_id, title, author, date_read, rating, source")
    .order("author")
    .order("title")
    .limit(100_000);
  if (error) throw new Error(`read_status read failed: ${error.message}`);
  return (data ?? []).map((r) => toRecord(r as Row));
}

/**
 * Upsert fresh Goodreads matches into read_status (new record wins on work_id
 * conflict, so a re-upload carries the latest date/rating), then return the full
 * merged set. Rows a human set by hand (source = 'manual') are never overwritten:
 * the reconcile/import pass skips any work_id already marked manual, so a
 * hand-entered read (or a deliberate manual status) survives every re-match.
 */
export async function mergeAndWriteReadStatus(fresh: ReadRecord[]): Promise<ReadRecord[]> {
  if (fresh.length > 0) {
    const manual = await manualWorkIds();
    const rows = fresh
      .filter((r) => !manual.has(r.workId))
      .map((r) => ({
        work_id: r.workId,
        title: r.title,
        author: r.author,
        date_read: r.dateRead,
        rating: r.rating,
        source: r.source,
      }));
    if (rows.length > 0) {
      const { error } = await admin()
        .from("read_status")
        .upsert(rows, { onConflict: "work_id" });
      if (error) throw new Error(`read_status write failed: ${error.message}`);
    }
  }
  return readReadStatus();
}

/** work_ids whose read status was set by hand and must not be auto-overwritten. */
async function manualWorkIds(): Promise<Set<string>> {
  const { data, error } = await admin()
    .from("read_status")
    .select("work_id")
    .eq("source", "manual")
    .limit(100_000);
  if (error) throw new Error(`manual read lookup failed: ${error.message}`);
  return new Set((data ?? []).map((r) => r.work_id));
}

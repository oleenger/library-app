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
 * Upsert fresh matches into read_status (new record wins on work_id conflict, so
 * a re-upload carries the latest date/rating), then return the full merged set.
 */
export async function mergeAndWriteReadStatus(fresh: ReadRecord[]): Promise<ReadRecord[]> {
  if (fresh.length > 0) {
    const rows = fresh.map((r) => ({
      work_id: r.workId,
      title: r.title,
      author: r.author,
      date_read: r.dateRead,
      rating: r.rating,
      source: r.source,
    }));
    const { error } = await admin()
      .from("read_status")
      .upsert(rows, { onConflict: "work_id" });
    if (error) throw new Error(`read_status write failed: ${error.message}`);
  }
  return readReadStatus();
}

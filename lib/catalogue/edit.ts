// Write path for editing an existing work and its read status by hand. Kept
// separate from the intake importer so the edit UI has a small, purpose-built
// surface. All taxonomy values are validated here (defence in depth on top of
// the form's dropdowns) before they reach the database.

import { admin } from "../supabase/admin";
import { deriveAuthorSort } from "../author-sort";
import { isMovement, isPeriod } from "../taxonomy";

export interface WorkEdit {
  title: string;
  author: string;
  /** Optional override; when blank it is re-derived from `author`. */
  authorSort?: string | null;
  firstPublished?: number | null;
  originalLanguage?: string | null;
  period?: string | null;
  primaryMovement?: string | null;
  secondaryMovements?: string[];
  notes?: string | null;
}

/** A hand-set read status; null means "not read" (row removed). */
export interface ReadEdit {
  read: boolean;
  dateRead?: string | null;
  rating?: number | null;
}

function clean(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** Update the mutable fields of a work. Throws on off-taxonomy values. */
export async function updateWork(id: string, edit: WorkEdit): Promise<void> {
  const title = edit.title?.trim();
  const author = edit.author?.trim();
  if (!title || !author) throw new Error("title and author are required");

  const period = clean(edit.period);
  if (period && !isPeriod(period)) throw new Error(`unknown period: ${period}`);

  const primary = clean(edit.primaryMovement);
  if (primary && !isMovement(primary)) {
    throw new Error(`unknown primary movement: ${primary}`);
  }

  const secondary = (edit.secondaryMovements ?? [])
    .map((m) => m.trim())
    .filter(Boolean);
  for (const m of secondary) {
    if (!isMovement(m)) throw new Error(`unknown secondary movement: ${m}`);
  }

  const authorSort = clean(edit.authorSort) ?? deriveAuthorSort(author);

  const { error } = await admin()
    .from("works")
    .update({
      title,
      author,
      author_sort: authorSort,
      first_published: edit.firstPublished ?? null,
      original_language: clean(edit.originalLanguage),
      period,
      primary_movement: primary,
      secondary_movements: secondary.length > 0 ? secondary.join("|") : null,
      notes: clean(edit.notes),
    })
    .eq("id", id);
  if (error) throw new Error(`work update failed: ${error.message}`);
}

/**
 * Permanently delete a work. The `work_editions` links and any `read_status`
 * row are removed automatically by the `on delete cascade` foreign keys; this
 * then sweeps up any editions left with no remaining links so the catalogue
 * keeps no orphaned edition rows.
 */
export async function deleteWork(id: string): Promise<void> {
  const db = admin();

  // Editions this work points at, so we can prune the now-orphaned ones after
  // the cascade removes the link rows.
  const { data: links, error: linkErr } = await db
    .from("work_editions")
    .select("edition_id")
    .eq("work_id", id);
  if (linkErr) throw new Error(`work delete lookup failed: ${linkErr.message}`);
  const editionIds = (links ?? []).map((l) => l.edition_id);

  const { error } = await db.from("works").delete().eq("id", id);
  if (error) throw new Error(`work delete failed: ${error.message}`);

  for (const editionId of editionIds) {
    const { count, error: cErr } = await db
      .from("work_editions")
      .select("edition_id", { count: "exact", head: true })
      .eq("edition_id", editionId);
    if (cErr) throw new Error(`edition sweep failed: ${cErr.message}`);
    if ((count ?? 0) === 0) {
      const { error: dErr } = await db
        .from("editions")
        .delete()
        .eq("id", editionId);
      if (dErr) throw new Error(`orphan edition delete failed: ${dErr.message}`);
    }
  }
}

/**
 * Set or clear a work's read status by hand. A set write is stamped
 * source = 'manual' so the Goodreads reconcile pass will never overwrite it;
 * clearing removes the row entirely.
 */
export async function setReadStatus(
  workId: string,
  edit: ReadEdit,
  meta: { title: string; author: string },
): Promise<void> {
  const db = admin();
  if (!edit.read) {
    const { error } = await db.from("read_status").delete().eq("work_id", workId);
    if (error) throw new Error(`read status clear failed: ${error.message}`);
    return;
  }
  const rating =
    edit.rating != null && edit.rating >= 1 && edit.rating <= 5 ? edit.rating : null;
  const { error } = await db.from("read_status").upsert(
    {
      work_id: workId,
      title: meta.title,
      author: meta.author,
      date_read: clean(edit.dateRead),
      rating,
      source: "manual",
    },
    { onConflict: "work_id" },
  );
  if (error) throw new Error(`read status write failed: ${error.message}`);
}

/**
 * Bulk mark works read/unread by hand. Marking read inserts a manual row only
 * where none exists (ignoreDuplicates), so a book already read via Goodreads
 * keeps its recorded date/rating; newly marked rows are source='manual' and are
 * protected from the reconcile pass. Marking unread removes the rows outright.
 * Returns the number of rows written or deleted.
 */
export async function bulkSetReadStatus(
  workIds: string[],
  read: boolean,
): Promise<number> {
  const ids = [...new Set(workIds)].filter(Boolean);
  if (ids.length === 0) return 0;
  const db = admin();

  if (!read) {
    const { error, count } = await db
      .from("read_status")
      .delete({ count: "exact" })
      .in("work_id", ids);
    if (error) throw new Error(`bulk read clear failed: ${error.message}`);
    return count ?? 0;
  }

  // Need title/author for the manual rows; pull them from the catalogue.
  const { data: works, error: wErr } = await db
    .from("works")
    .select("id, title, author")
    .in("id", ids);
  if (wErr) throw new Error(`bulk read lookup failed: ${wErr.message}`);

  const rows = (works ?? []).map((w) => ({
    work_id: w.id,
    title: w.title,
    author: w.author,
    date_read: null,
    rating: null,
    source: "manual",
  }));
  if (rows.length === 0) return 0;

  const { error } = await db
    .from("read_status")
    .upsert(rows, { onConflict: "work_id", ignoreDuplicates: true });
  if (error) throw new Error(`bulk read write failed: ${error.message}`);
  return rows.length;
}

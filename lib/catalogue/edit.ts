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

/**
 * Update the mutable fields of a work. Throws on off-taxonomy values.
 *
 * If the new (title, author) collides with a *different* existing work — the
 * common case being renaming an electronic copy to match its physical twin so
 * the two consolidate — the edited work is merged into that existing work
 * instead of tripping the `UNIQUE (title, author)` constraint: its editions are
 * re-pointed at the survivor and the now-empty work is deleted. The returned
 * `id` is the surviving work (unchanged for a plain edit, the pre-existing twin
 * for a merge) so the caller can retarget the read status and redirect.
 */
export async function updateWork(
  id: string,
  edit: WorkEdit,
): Promise<{ id: string; merged: boolean }> {
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
  const db = admin();

  // A different work already carrying the target identity means this edit is a
  // consolidation: fold this work's editions into it rather than fail the
  // unique key. Matched case-insensitively so "Ulysses" and "ulysses" merge.
  const { data: twin, error: twinErr } = await db
    .from("works")
    .select("id")
    .ilike("title", title)
    .ilike("author", author)
    .neq("id", id)
    .maybeSingle();
  if (twinErr) throw new Error(`work merge lookup failed: ${twinErr.message}`);

  if (twin) {
    await mergeWorkInto(id, twin.id);
    return { id: twin.id, merged: true };
  }

  const { error } = await db
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
  return { id, merged: false };
}

/**
 * Fold `fromId` into `toId`: re-point every edition link onto the survivor
 * (dropping links it already holds so the (work_id, edition_id) primary key is
 * never violated), then delete the emptied work. No edition is orphaned because
 * each of `fromId`'s editions ends up linked to `toId`. The survivor keeps its
 * own read status; `fromId`'s read_status row is swept by the delete cascade.
 */
async function mergeWorkInto(fromId: string, toId: string): Promise<void> {
  const db = admin();

  const { data: fromLinks, error: fromErr } = await db
    .from("work_editions")
    .select("edition_id")
    .eq("work_id", fromId);
  if (fromErr) throw new Error(`merge link lookup failed: ${fromErr.message}`);

  const { data: toLinks, error: toErr } = await db
    .from("work_editions")
    .select("edition_id")
    .eq("work_id", toId);
  if (toErr) throw new Error(`merge link lookup failed: ${toErr.message}`);
  const held = new Set((toLinks ?? []).map((l) => l.edition_id));

  for (const { edition_id } of fromLinks ?? []) {
    if (held.has(edition_id)) continue; // survivor already owns this edition
    const { error: mvErr } = await db
      .from("work_editions")
      .update({ work_id: toId })
      .eq("work_id", fromId)
      .eq("edition_id", edition_id);
    if (mvErr) throw new Error(`merge link move failed: ${mvErr.message}`);
    held.add(edition_id);
  }

  // Any links left on fromId are duplicates the survivor already had; the work
  // delete cascade removes them and the fromId read_status row.
  const { error: delErr } = await db.from("works").delete().eq("id", fromId);
  if (delErr) throw new Error(`merge delete failed: ${delErr.message}`);
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
 * Remove a single edition from a work. Deletes only the `work_editions` link
 * for `(workId, editionId)`; the edition row itself is dropped only if no other
 * work still points at it (the same orphan-sweep `deleteWork` uses), so a shared
 * omnibus edition survives while it belongs to another work. The work and its
 * read status are untouched. Returns whether the edition row was also deleted.
 */
export async function deleteEditionFromWork(
  workId: string,
  editionId: string,
): Promise<{ editionRemoved: boolean }> {
  const db = admin();

  // The link must exist for this work — otherwise the caller has the wrong ids.
  const { data: link, error: findErr } = await db
    .from("work_editions")
    .select("edition_id")
    .eq("work_id", workId)
    .eq("edition_id", editionId)
    .maybeSingle();
  if (findErr) throw new Error(`edition link lookup failed: ${findErr.message}`);
  if (!link) throw new Error("edition is not linked to this work");

  const { error: unlinkErr } = await db
    .from("work_editions")
    .delete()
    .eq("work_id", workId)
    .eq("edition_id", editionId);
  if (unlinkErr) throw new Error(`edition unlink failed: ${unlinkErr.message}`);

  // Prune the edition only if nothing else references it now.
  const { count, error: cErr } = await db
    .from("work_editions")
    .select("edition_id", { count: "exact", head: true })
    .eq("edition_id", editionId);
  if (cErr) throw new Error(`edition sweep failed: ${cErr.message}`);

  if ((count ?? 0) === 0) {
    const { error: dErr } = await db.from("editions").delete().eq("id", editionId);
    if (dErr) throw new Error(`orphan edition delete failed: ${dErr.message}`);
    return { editionRemoved: true };
  }
  return { editionRemoved: false };
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

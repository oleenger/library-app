// Persist grouped catalogue records to Supabase. Kept separate from the pure
// importer so the serverless bundle only ever imports the Supabase client here.
//
// Upserts use ON CONFLICT DO NOTHING semantics (ignoreDuplicates), which — since
// work/edition ids are deterministic — makes every write idempotent: committing
// the same book twice is a no-op, and re-seeding never duplicates rows.

import { admin } from "../supabase/admin";
import { editionSignature, type GroupResult } from "./importer";

export interface WriteSummary {
  works: number;
  editions: number;
  links: number;
  rejected: string[];
}

/** The set of work ids already present, for duplicate reporting before a write. */
export async function existingWorkIds(): Promise<Set<string>> {
  const { data, error } = await admin().from("works").select("id").limit(100_000);
  if (error) throw new Error(`work id lookup failed: ${error.message}`);
  return new Set((data ?? []).map((r) => r.id));
}

/**
 * Content signatures of every (work, edition) link already owned. Dedup at
 * commit time matches candidates against these by attribute — not by id — so a
 * copy already in the library is recognised even if it was persisted under an
 * earlier edition-id scheme, and a genuinely new edition of an owned work is
 * NOT mistaken for a duplicate.
 */
export async function existingEditionSignatures(): Promise<Set<string>> {
  const db = admin();
  const [edRes, linkRes] = await Promise.all([
    db.from("editions").select("id, name, publisher, language").limit(100_000),
    db.from("work_editions").select("work_id, edition_id").limit(100_000),
  ]);
  if (edRes.error) throw new Error(`edition lookup failed: ${edRes.error.message}`);
  if (linkRes.error) throw new Error(`edition link lookup failed: ${linkRes.error.message}`);

  const byId = new Map<string, { name: string; publisher: string | null; language: string | null }>();
  for (const e of edRes.data ?? []) {
    byId.set(e.id, { name: e.name, publisher: e.publisher, language: e.language });
  }

  const sigs = new Set<string>();
  for (const l of linkRes.data ?? []) {
    const e = byId.get(l.edition_id);
    if (e) sigs.add(editionSignature(l.work_id, e.name, e.publisher, e.language));
  }
  return sigs;
}

/**
 * Insert grouped works, then editions, then the join rows (FK order matters).
 * Idempotent via ignoreDuplicates. Returns the counts written this call.
 */
export async function upsertGrouped(g: GroupResult): Promise<WriteSummary> {
  const db = admin();

  if (g.works.length > 0) {
    const { error } = await db
      .from("works")
      .upsert(g.works, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`works upsert failed: ${error.message}`);
  }

  if (g.editions.length > 0) {
    const { error } = await db
      .from("editions")
      .upsert(g.editions, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`editions upsert failed: ${error.message}`);
  }

  if (g.links.length > 0) {
    const { error } = await db
      .from("work_editions")
      .upsert(g.links, { onConflict: "work_id,edition_id", ignoreDuplicates: true });
    if (error) throw new Error(`work_editions upsert failed: ${error.message}`);
  }

  return {
    works: g.works.length,
    editions: g.editions.length,
    links: g.links.length,
    rejected: g.rejected,
  };
}

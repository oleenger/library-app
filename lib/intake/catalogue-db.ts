// Persist grouped catalogue records to Supabase. Kept separate from the pure
// importer so the serverless bundle only ever imports the Supabase client here.
//
// Upserts use ON CONFLICT DO NOTHING semantics (ignoreDuplicates), which — since
// work/edition ids are deterministic — makes every write idempotent: committing
// the same book twice is a no-op, and re-seeding never duplicates rows.

import { admin } from "../supabase/admin";
import type { GroupResult } from "./importer";

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

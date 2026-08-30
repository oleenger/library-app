"use server";

import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG, RECOMMENDATIONS_TAG } from "@/lib/cache-tags";

/**
 * Pull-to-refresh entry point. Drops the cached catalogue snapshot (and the
 * recommendation cache) so the next render re-reads Supabase once. Cheap and
 * idempotent — if nothing changed upstream the fresh read simply matches what
 * was cached.
 */
export async function refreshCatalogue(): Promise<void> {
  revalidateTag(CATALOGUE_TAG);
  revalidateTag(RECOMMENDATIONS_TAG);
}

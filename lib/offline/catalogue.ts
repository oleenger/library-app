import type { Work } from "@/lib/types";
import { db } from "./db";

// Read/write helpers around the offline catalogue snapshot. All are no-ops or
// safe fallbacks when IndexedDB is unavailable (SSR, private mode) so callers
// never need to guard.

/** Persist the catalogue locally, replacing any previous snapshot. */
export async function saveCatalogue(works: Work[]): Promise<void> {
  if (!db) return;
  try {
    await db.catalogue.put({ id: "catalogue", works, syncedAt: Date.now() });
  } catch {
    // Storage full / disabled — offline mirror is best-effort.
  }
}

/** Load the locally mirrored catalogue, or null if none is stored yet. */
export async function loadCatalogue(): Promise<{
  works: Work[];
  syncedAt: number;
} | null> {
  if (!db) return null;
  try {
    const snap = await db.catalogue.get("catalogue");
    return snap ? { works: snap.works, syncedAt: snap.syncedAt } : null;
  } catch {
    return null;
  }
}

/** Fetch the catalogue from the server and store it. Returns the works. */
export async function fetchAndStoreCatalogue(): Promise<Work[] | null> {
  try {
    const res = await fetch("/api/catalogue", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { works: Work[] };
    if (!Array.isArray(data.works)) return null;
    await saveCatalogue(data.works);
    return data.works;
  } catch {
    // Offline or server error — the caller falls back to the local snapshot.
    return null;
  }
}

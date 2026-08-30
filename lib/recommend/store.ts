// Persisted cache of the last generated recommendation sets, stored in the
// Supabase `recommendations` table (one row per kind). Two independent kinds
// live here:
//
//   taste — books to read next, inferred from reading history.
//   canon — major/canonical works missing from the library, scored by importance.
//
// Persisting them means a cold start never re-triggers an LLM call: a cached set
// is served until its source fingerprint (reading history for taste, library
// coverage for canon) actually changes.

import { admin } from "../supabase/admin";
import { unstable_cache } from "next/cache";
import { RECOMMENDATIONS_TAG } from "../cache-tags";
import type { CanonFocus, Recommendation } from "./schema";

export type RecKind = "taste" | "canon";

export interface StoredSet<T> {
  /** Fingerprint of the source these were generated from. */
  fingerprint: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Model id that produced them. */
  model: string;
  /** Size of the input the model was given (read works / owned works). */
  basedOn: number;
  items: T[];
}

export interface RecommendationCache {
  taste?: StoredSet<Recommendation>;
  canon?: StoredSet<CanonFocus>;
}

interface Row {
  kind: RecKind;
  fingerprint: string;
  generated_at: string;
  model: string;
  based_on: number;
  items: unknown;
}

function toStored<T>(row: Row): StoredSet<T> {
  return {
    fingerprint: row.fingerprint,
    generatedAt: row.generated_at,
    model: row.model,
    basedOn: row.based_on,
    items: (row.items ?? []) as T[],
  };
}

export const readCache = unstable_cache(
  async (): Promise<RecommendationCache> => {
    const { data, error } = await admin()
      .from("recommendations")
      .select("kind, fingerprint, generated_at, model, based_on, items");
    if (error) throw new Error(`recommendation cache read failed: ${error.message}`);

    const cache: RecommendationCache = {};
    for (const row of (data ?? []) as Row[]) {
      if (row.kind === "taste") cache.taste = toStored<Recommendation>(row);
      else if (row.kind === "canon") cache.canon = toStored<CanonFocus>(row);
    }
    return cache;
  },
  ["recommendation-cache"],
  { tags: [RECOMMENDATIONS_TAG], revalidate: false },
);

/** Persist one kind's set without disturbing the other. */
export async function writeSet(kind: "taste", set: StoredSet<Recommendation>): Promise<void>;
export async function writeSet(kind: "canon", set: StoredSet<CanonFocus>): Promise<void>;
export async function writeSet(
  kind: RecKind,
  set: StoredSet<Recommendation | CanonFocus>,
): Promise<void> {
  const { error } = await admin()
    .from("recommendations")
    .upsert(
      {
        kind,
        fingerprint: set.fingerprint,
        generated_at: set.generatedAt,
        model: set.model,
        based_on: set.basedOn,
        items: set.items as unknown,
      },
      { onConflict: "kind" },
    );
  if (error) throw new Error(`recommendation cache write failed: ${error.message}`);
}

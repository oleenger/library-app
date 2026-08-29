// Read/write data/recommendations.json — the persisted cache of the last
// generated recommendation sets. Two independent kinds live in one file:
//
//   taste — books to read next, inferred from reading history.
//   canon — major/canonical works missing from the library, scored by importance.
//
// Keeping them on disk (mirroring read_status.csv) means a server restart never
// re-triggers an LLM call: a cached set is served until its source fingerprint
// (reading history for taste, library coverage for canon) actually changes.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CanonFocus, Recommendation } from "./schema";

const STORE_PATH = path.join(process.cwd(), "data", "recommendations.json");

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

export function readCache(): RecommendationCache {
  if (!existsSync(STORE_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    if (!raw || typeof raw !== "object") return {};
    return raw as RecommendationCache;
  } catch {
    return {};
  }
}

function writeCache(cache: RecommendationCache): void {
  writeFileSync(STORE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

/** Persist one kind's set without disturbing the other. */
export function writeSet(kind: "taste", set: StoredSet<Recommendation>): void;
export function writeSet(kind: "canon", set: StoredSet<CanonFocus>): void;
export function writeSet(kind: RecKind, set: StoredSet<Recommendation | CanonFocus>): void {
  const cache = readCache();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cache as any)[kind] = set;
  writeCache(cache);
}

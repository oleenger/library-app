// Read/write data/recommendations.json — the persisted cache of the last
// generated recommendation set. Keeping it on disk (mirroring read_status.csv)
// means a server restart never re-triggers an LLM call: the cached set is served
// until the reading-history fingerprint actually changes.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Recommendation } from "./schema";

const STORE_PATH = path.join(process.cwd(), "data", "recommendations.json");

export interface RecommendationCache {
  /** Fingerprint of the reading history these were generated from. */
  fingerprint: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Model id that produced them. */
  model: string;
  /** Number of read works the model was given. */
  basedOn: number;
  items: Recommendation[];
}

export function readRecommendations(): RecommendationCache | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    if (!raw || typeof raw.fingerprint !== "string" || !Array.isArray(raw.items)) {
      return null;
    }
    return raw as RecommendationCache;
  } catch {
    return null;
  }
}

export function writeRecommendations(cache: RecommendationCache): void {
  writeFileSync(STORE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

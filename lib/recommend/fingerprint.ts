// The fingerprint is what makes repeated requests free: recommendations are a
// pure function of the reading history, so we content-address them. Two requests
// with the same history produce the same fingerprint and therefore reuse the
// cached result instead of calling the model again. Ratings and read-dates are
// included so that re-rating a book (which should change recommendations) also
// changes the fingerprint, while cosmetic catalogue edits do not.

import { createHash } from "node:crypto";
import type { Work } from "../types";

/** A read work reduced to the fields that legitimately affect recommendations. */
function readSignature(w: Work): string {
  const r = w.reading!;
  return [w.id, r.rating ?? "", r.dateRead ?? ""].join("\u0001");
}

/**
 * Stable SHA-256 over the set of read works (order-independent). Empty history
 * yields a constant so callers can special-case "nothing to recommend from".
 */
export function readingFingerprint(works: Work[]): string {
  const lines = works
    .filter((w) => w.reading)
    .map(readSignature)
    .sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

/**
 * Stable SHA-256 over the owned library and its classification. Canon-gap
 * analysis depends on what you own and how it is classified (period + movements),
 * not on read status, so adding/removing/reclassifying a work invalidates it
 * while re-rating a book does not.
 */
export function libraryFingerprint(works: Work[]): string {
  const lines = works
    .map((w) => {
      const c = w.classification;
      return [
        w.id,
        c.period ?? "",
        c.primaryMovement ?? "",
        [...c.secondaryMovements].sort().join(","),
      ].join("\u0001");
    })
    .sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

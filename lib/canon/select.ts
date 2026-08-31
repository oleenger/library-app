// Live selection layer over the static curated canon (lib/canon/paths.ts).
//
// The canon data itself is fixed and ownership-free. This module joins it to the
// reader's actual holdings at request time and returns a fully serializable
// shape (plain objects/arrays/booleans — no Sets, no class instances) so it can
// cross the RSC → client boundary as props.
//
// It returns EVERY curated path (the client shows a movement picker), but sorts
// the movements the reader owns most in to the front so the default and the top
// of the menu land on something motivating. Curated order is preserved among the
// movements the reader holds nothing in.
//
// Ownership is matched two ways: exact title+author, and — to survive translated
// titles (e.g. "Fedre og sønner" = "Fathers and Sons") — author-surname + the
// work's first-publication year.

import type { Work } from "../types";
import { isCrossPeriod, isMovement, movementPeriod, type Movement, type Period } from "../taxonomy";
import { shortPeriod } from "../display";
import { lineageNode } from "../lineage";
import {
  buildOwnedIndex,
  isCanonWorkOwned,
  type OwnedIndex,
} from "../recommend/match";
import { CANON_PATHS, type CanonPath } from "./paths";

/** One work on a rendered path, with live ownership resolved. */
export interface CanonWorkView {
  title: string;
  author: string;
  year: number;
  importance: number;
  note: string;
  /** Why the work matters in its own right (by-importance view). */
  why?: string;
  /** True when this exact work is on the reader's shelves. */
  owned: boolean;
}

/** A curated path joined to the reader's holdings, ready to render. */
export interface CanonPathView {
  movement: Movement;
  /** Home period, or null for cross-period modes. */
  period: Period | null;
  /** Era label mirroring the lineage view, e.g. "Modernism · 1901–1945". */
  eraLabel: string;
  blurb: string;
  /** Works in curated pedagogical reading order. */
  works: CanonWorkView[];
  /** Count of works the reader already owns. */
  ownedCount: number;
  /** Total works on the path. */
  total: number;
  /** How many shelved works sit in this movement (drives sort + menu grouping). */
  holdings: number;
}

/** Tally how many shelved works sit in each movement (primary + secondary). */
function movementHoldings(works: Work[]): Map<Movement, number> {
  const counts = new Map<Movement, number>();
  for (const w of works) {
    const labels = [w.classification.primaryMovement, ...w.classification.secondaryMovements];
    const seen = new Set<Movement>();
    for (const label of labels) {
      if (label && isMovement(label) && !seen.has(label)) {
        seen.add(label); // count a movement once per work
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** The era label shared with the lineage view: "<period|Cross-period form> · <years>". */
function eraLabelFor(movement: Movement, period: Period | null): string {
  return [
    isCrossPeriod(movement) ? "Cross-period form" : shortPeriod(period),
    lineageNode(movement).years,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Resolve one curated path against the ownership index. */
function toView(path: CanonPath, owned: OwnedIndex, holdings: number): CanonPathView {
  const works: CanonWorkView[] = path.works.map((w) => ({
    title: w.title,
    author: w.author,
    year: w.year,
    importance: w.importance,
    note: w.note,
    why: w.why,
    owned: isCanonWorkOwned(owned, w.title, w.author, w.year),
  }));
  const period = movementPeriod(path.movement);
  return {
    movement: path.movement,
    period,
    eraLabel: eraLabelFor(path.movement, period),
    blurb: path.blurb,
    works,
    ownedCount: works.reduce((n, w) => n + (w.owned ? 1 : 0), 0),
    total: works.length,
    holdings,
  };
}

/**
 * Resolve EVERY curated reading path against a library, sorted with the reader's
 * most-held movements first (curated order kept among unheld movements). Each
 * path carries live ownership per work and a holdings count for the menu.
 */
export function selectCanonPaths(works: Work[]): CanonPathView[] {
  const owned = buildOwnedIndex(works);
  const holdings = movementHoldings(works);

  return CANON_PATHS.map((p) =>
    toView(p, owned, holdings.get(p.movement) ?? 0),
  ).sort((a, b) => {
    // Held movements first, by holdings desc; unheld keep curated order (stable).
    if (a.holdings > 0 && b.holdings > 0) return b.holdings - a.holdings;
    if (a.holdings > 0) return -1;
    if (b.holdings > 0) return 1;
    return 0;
  });
}

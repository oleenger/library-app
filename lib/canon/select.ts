// Live assembly layer for the per-movement canon detail (the single detail
// surface — every "lineage"/movement link and every metro-map node lands here).
//
// It joins three static, version-controlled sources to the reader's live
// holdings at request time and returns a fully serializable shape (plain
// objects/arrays/booleans) so it can cross the RSC → client boundary as props:
//
//   * essentials     — the broad ranked canon per movement (data/all-books.tsv)
//   * reading path    — a curated pedagogical order per movement (data/reading-paths.tsv)
//   * influence edges — the lineage relations (data/movement-influences.tsv)
//   * description     — the prose note + era (lib/lineage.ts)
//
// Ownership is matched two ways: exact title+author, and — to survive translated
// titles ("Fedre og sønner" = "Fathers and Sons") — author-surname + year.

import type { Work } from "../types";
import { MOVEMENTS, isCrossPeriod, movementPeriod, type Movement, type Period } from "../taxonomy";
import { shortPeriod, formatYear } from "../display";
import { slugify } from "../slug";
import { lineageNode } from "../lineage";
import {
  essentialsFor,
  readingPathFor,
  movementYears,
  influenceRelations,
} from "./data";
import { findOwnedWork } from "../recommend/match";

/** A related movement rendered as a tappable chip on the canon detail. */
export interface MovementChipView {
  movement: Movement;
  slug: string;
  period: Period | null;
  count: number;
}

/** A canon work joined to holdings: owned (links to its book page) or a gap. */
export interface CanonWorkView {
  title: string;
  author: string;
  displayYear: string;
  owned: boolean;
  ownedId: string | null;
}

/** One reading-path step: a canon work plus its position and reading-order note. */
export interface ReadingStepView extends CanonWorkView {
  position: number;
  note: string;
}

/** The complete detail for one movement. */
export interface MovementDetailView {
  movement: Movement;
  period: Period | null;
  eraLabel: string;
  /** Prose description of the movement. */
  note: string;
  /** The broad ranked essentials, each marked owned or a gap. */
  essentials: CanonWorkView[];
  essentialsOwned: number;
  essentialsTotal: number;
  hasEssentials: boolean;
  /** The curated reading path, in order. */
  readingPath: ReadingStepView[];
  pathOwned: number;
  pathTotal: number;
  hasPath: boolean;
  /** How many shelved works sit in this movement (drives sort + menu grouping). */
  holdings: number;
  reactedAgainst: MovementChipView[];
  ledTo: MovementChipView[];
  alongside: MovementChipView[];
}

/** Tally how many shelved works sit in each movement (primary + secondary). */
function movementHoldings(works: Work[]): Map<Movement, number> {
  const counts = new Map<Movement, number>();
  for (const w of works) {
    const labels = [w.classification.primaryMovement, ...w.classification.secondaryMovements];
    const seen = new Set<string>();
    for (const label of labels) {
      if (label && !seen.has(label)) {
        seen.add(label); // count a movement once per work
        counts.set(label as Movement, (counts.get(label as Movement) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** The era label: "<period|Cross-period form> · <years>", years from essentials. */
function eraLabelFor(movement: Movement, period: Period | null): string {
  const span = movementYears(movement);
  const years = span
    ? span.min === span.max
      ? formatYear(span.min)
      : `${formatYear(span.min)}–${formatYear(span.max)}`
    : lineageNode(movement).years;
  return [isCrossPeriod(movement) ? "Cross-period form" : shortPeriod(period), years]
    .filter(Boolean)
    .join(" · ");
}

/** Turn related movements into display chips with live holding counts. */
function toChips(movements: Movement[], counts: Map<Movement, number>): MovementChipView[] {
  return movements.map((m) => ({
    movement: m,
    slug: slugify(m),
    period: movementPeriod(m),
    count: counts.get(m) ?? 0,
  }));
}

/** Assemble one movement's detail against the reader's library. */
function toDetail(movement: Movement, works: Work[], counts: Map<Movement, number>): MovementDetailView {
  const period = movementPeriod(movement);

  const essentials: CanonWorkView[] = essentialsFor(movement).map((e) => {
    const owned = findOwnedWork(works, e.title, e.author, e.sortYear);
    return {
      title: e.title,
      author: e.author,
      displayYear: e.displayYear,
      owned: owned != null,
      ownedId: owned?.id ?? null,
    };
  });

  const readingPath: ReadingStepView[] = readingPathFor(movement).map((s) => {
    const owned = findOwnedWork(works, s.title, s.author, s.sortYear);
    return {
      position: s.position,
      title: s.title,
      author: s.author,
      displayYear: s.displayYear,
      note: s.note,
      owned: owned != null,
      ownedId: owned?.id ?? null,
    };
  });

  const rel = influenceRelations(movement);

  return {
    movement,
    period,
    eraLabel: eraLabelFor(movement, period),
    note: lineageNode(movement).note ?? "",
    essentials,
    essentialsOwned: essentials.filter((w) => w.owned).length,
    essentialsTotal: essentials.length,
    hasEssentials: essentials.length > 0,
    readingPath,
    pathOwned: readingPath.filter((w) => w.owned).length,
    pathTotal: readingPath.length,
    hasPath: readingPath.length > 0,
    holdings: counts.get(movement) ?? 0,
    reactedAgainst: toChips(rel.reactedAgainst, counts),
    ledTo: toChips(rel.ledTo, counts),
    alongside: toChips(rel.alongside, counts),
  };
}

/**
 * Resolve a detail view for EVERY movement in the taxonomy against a library,
 * sorted with the reader's most-held movements first (taxonomy order kept among
 * unheld movements). This is the single per-movement detail surface.
 */
export function movementDetails(works: Work[]): MovementDetailView[] {
  const counts = movementHoldings(works);
  return MOVEMENTS.map((m) => toDetail(m, works, counts)).sort((a, b) => {
    if (a.holdings > 0 && b.holdings > 0) return b.holdings - a.holdings;
    if (a.holdings > 0) return -1;
    if (b.holdings > 0) return 1;
    return 0; // stable → taxonomy order among unheld
  });
}

// Domain types for the PoC.
//
// Stage 0 only browses a flat catalogue, but the delivery plan requires that we
// keep the *grain* of the real data model: a "work" (the thing being classified
// and browsed) must stay separable from a "reading event" (an act of reading it).
// So even though the PoC persists neither editions/copies nor reading events, the
// types below describe those concepts distinctly, so Stage 1 can grow into them
// without a rewrite.

/** A literary work: the unit that carries classification and is browsed. */
export interface Work {
  /** Stable id derived from the source row (title + author). */
  id: string;
  title: string;
  author: string;
  /** Year first published. Negative = BCE. Null when we don't have it. */
  originalYear: number | null;
  /** Original language when known. */
  language: string | null;
  /** Free-text note from the import (e.g. "Owned in multiple editions"). */
  notes: string | null;
  /** The owned edition(s) of this work. A work may be owned in several editions. */
  editionIds: string[];
  classification: Classification;
  /** Reading history for this work, or null if it has not been marked read. */
  reading: WorkReading | null;
}

/** A work's read status, sourced from data/read_status.csv via the import. */
export interface WorkReading {
  /** ISO yyyy-mm-dd, or null when the export carried no date. */
  dateRead: string | null;
  /** 1..5, or null when unrated. */
  rating: number | null;
  /** How the work was matched to the export: "exact" or "llm". */
  source: string | null;
}

/**
 * A published edition owned by the user. A single edition may hold more than one
 * work (e.g. an omnibus like *The African Trilogy*). The proposal keeps Work and
 * Edition distinct because classification lives on the work, not the edition (§5.2).
 */
export interface Edition {
  id: string;
  /** Edition/collection name, or the work's title for a single-work edition. */
  name: string;
  publisher: string | null;
  /** Language of the owned edition (may differ from the work's original language). */
  language: string | null;
  /** Works contained in this edition. */
  workIds: string[];
}

/** Where a work sits on the two classification axes (proposal §7). */
export interface Classification {
  /** Era, e.g. "Modernism". Nullable by design. */
  period: string | null;
  /** School/style, e.g. "Stream of consciousness". Nullable by design. */
  primaryMovement: string | null;
  /** Additional movements a work also belongs to. */
  secondaryMovements: string[];
}

/**
 * An act of reading a work — deliberately its own concept (not yet loaded in the
 * PoC). Present so the separation of "owned/known work" from "reading history"
 * is visible in the model from the start.
 */
export interface ReadingEvent {
  workId: string;
  dateRead: string | null;
  rating: number | null;
  notes: string | null;
}

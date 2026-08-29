// Faceted, *cascading* filtering shared by server and client.
//
// The browse experience is a set of facets (period, movement, author) plus a
// free-text query. Selecting a value in one facet must narrow the *options* of
// the others: each facet only offers values that still return works, given the
// filters already applied elsewhere. This module is the single source of truth
// for both "which works match" and "which options remain".

import type { Work } from "./types";
import { PERIODS } from "./taxonomy";

/** The four browse dimensions. Empty string means "no constraint" for that axis. */
export interface Filters {
  query: string;
  period: string;
  movement: string;
  author: string;
}

export const EMPTY_FILTERS: Filters = {
  query: "",
  period: "",
  movement: "",
  author: "",
};

/** The facet axes that carry discrete, countable values. */
export type FacetKey = "period" | "movement" | "author";

/** A single selectable option within a facet, with its live match count. */
export interface FacetOption {
  value: string;
  count: number;
}

export function hasActiveFilters(f: Filters): boolean {
  return Boolean(f.query || f.period || f.movement || f.author);
}

function workHasMovement(work: Work, movement: string): boolean {
  const c = work.classification;
  return c.primaryMovement === movement || c.secondaryMovements.includes(movement);
}

/**
 * Does a work satisfy the filters — optionally *ignoring* one axis? Skipping an
 * axis is what makes facets cascade: an option list for `period` is counted over
 * works that pass every filter *except* the period one, so choosing a movement
 * reshapes the period list (and its counts) but a period's own options never
 * vanish just because one is selected.
 */
function matches(work: Work, f: Filters, skip: keyof Filters | null): boolean {
  if (skip !== "query" && f.query) {
    const q = f.query.trim().toLowerCase();
    if (q && !`${work.title} ${work.author}`.toLowerCase().includes(q)) return false;
  }
  if (skip !== "period" && f.period && work.classification.period !== f.period) {
    return false;
  }
  if (skip !== "movement" && f.movement && !workHasMovement(work, f.movement)) {
    return false;
  }
  if (skip !== "author" && f.author && work.author !== f.author) {
    return false;
  }
  return true;
}

/** Works matching every active filter. */
export function applyFilters(works: Work[], f: Filters): Work[] {
  return works.filter((w) => matches(w, f, null));
}

/** Values a work contributes to a given facet (movements can be several). */
function valuesFor(work: Work, key: FacetKey): string[] {
  if (key === "author") return work.author ? [work.author] : [];
  if (key === "period") {
    return work.classification.period ? [work.classification.period] : [];
  }
  const c = work.classification;
  return [
    ...(c.primaryMovement ? [c.primaryMovement] : []),
    ...c.secondaryMovements,
  ];
}

/**
 * Available options for one facet, counted over works filtered by *all other*
 * facets (cascading). Zero-count values are omitted — only reachable options are
 * offered — except the currently selected value, which is always kept so the
 * user can see and clear it.
 *
 * Ordering: periods follow the chronological taxonomy; everything else is by
 * descending count, then alphabetically. `limit` caps the list (e.g. top authors)
 * while always retaining the active selection.
 */
export function facetOptions(
  works: Work[],
  f: Filters,
  key: FacetKey,
  limit?: number,
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const w of works) {
    if (!matches(w, f, key)) continue;
    for (const v of valuesFor(w, key)) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }

  const selected = f[key];
  if (selected && !counts.has(selected)) counts.set(selected, 0);

  let options = [...counts.entries()].map(([value, count]) => ({ value, count }));

  if (key === "period") {
    const order = new Map(PERIODS.map((p, i) => [p as string, i]));
    options.sort(
      (a, b) => (order.get(a.value) ?? 99) - (order.get(b.value) ?? 99),
    );
  } else {
    options.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }

  if (limit && options.length > limit) {
    const kept = options.slice(0, limit);
    if (selected && !kept.some((o) => o.value === selected)) {
      const sel = options.find((o) => o.value === selected);
      if (sel) kept.push(sel);
    }
    options = kept;
  }

  return options;
}

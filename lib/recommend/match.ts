// Shared title/author matching for recommendations. Used to (a) keep the taste
// call from recommending a book back to its owner, and (b) decide, for Reading
// Paths, whether a canon work is a waypoint the reader already holds or a gap.
//
// The canonical key is deliberately lenient — lowercased, accent- and
// punctuation-stripped, leading article dropped — so "The Bell Jar" and
// "Bell Jar, The" (and the model's inevitable spelling drift) all collide.

import type { Work } from "../types";

/**
 * Normalise a single title/author string into a comparison key: lowercased,
 * accent- and punctuation-stripped, leading article dropped.
 */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Combined title+author identity key for a work. */
export function workKey(title: string, author: string): string {
  return `${normalizeKey(title)}|${normalizeKey(author)}`;
}

/**
 * Every identity key a work answers to for an exact ownership match: its own
 * title+author, plus its manual canonical alias when set (so a translation held
 * under a different title still resolves to the canon entry the owner linked it
 * to). See lib/catalogue/edit.ts#setCanonicalAlias.
 */
export function workKeys(w: Work): string[] {
  const keys = [workKey(w.title, w.author)];
  if (w.canonicalTitle && w.canonicalAuthor) {
    keys.push(workKey(w.canonicalTitle, w.canonicalAuthor));
  }
  return keys;
}

/** Build the set of owned title+author keys (incl. canonical aliases) for a join. */
export function ownedKeySet(works: Work[]): Set<string> {
  return new Set(works.flatMap((w) => workKeys(w)));
}

/**
 * The author's surname key: the last token of the normalised author string.
 * Used for a title-independent match so a work owned under a translated title
 * ("Fedre og sønner") still resolves to its English canon entry ("Fathers and
 * Sons") — the shared axis being author + first-publication year.
 */
export function surnameKey(author: string): string {
  const parts = normalizeKey(author).split(" ").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

/**
 * Do two surname keys plausibly denote the same author, allowing for
 * transliteration drift across languages (e.g. Norwegian "Turgenjev" vs English
 * "Turgenev", "Dostojevskij" vs "Dostoevsky")? True when they are equal, one is
 * a prefix of the other, or they share a 5-character stem. Requires ≥4 chars to
 * avoid short-name collisions. Paired with an equal publication year at the call
 * site, this is tight enough to keep false positives rare.
 */
export function surnamesMatch(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return a === b;
  if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
  return a.slice(0, 5) === b.slice(0, 5);
}

/**
 * A resolved view of a library's holdings for ownership joins: exact title+author
 * keys, plus surnames grouped by first-publication year for the translation- and
 * transliteration-tolerant fallback.
 */
export interface OwnedIndex {
  byTitle: Set<string>;
  surnamesByYear: Map<number, string[]>;
}

/** Build the ownership index once for a set of works. */
export function buildOwnedIndex(works: Work[]): OwnedIndex {
  const byTitle = new Set<string>();
  const surnamesByYear = new Map<number, string[]>();
  for (const w of works) {
    for (const k of workKeys(w)) byTitle.add(k);
    if (w.originalYear != null) {
      const list = surnamesByYear.get(w.originalYear);
      const s = surnameKey(w.author);
      if (list) list.push(s);
      else surnamesByYear.set(w.originalYear, [s]);
    }
  }
  return { byTitle, surnamesByYear };
}

/**
 * Is a canonical work (English title, canonical author, publication year) owned?
 * Matches on an exact title+author key first, then falls back to a same-year
 * *drifting*-surname match so translated editions with transliterated author
 * spellings still count. The fallback deliberately excludes a byte-identical
 * surname: same author + same year + a title that failed the exact match means a
 * *different work by that author* (e.g. King Lear vs an owned Macbeth, both 1606
 * Shakespeare), not a translation — so it must not be claimed as owned.
 */
export function isCanonWorkOwned(
  idx: OwnedIndex,
  title: string,
  author: string,
  year: number,
): boolean {
  if (idx.byTitle.has(workKey(title, author))) return true;
  const candidates = idx.surnamesByYear.get(year);
  if (!candidates) return false;
  const target = surnameKey(author);
  return candidates.some((s) => s !== target && surnamesMatch(target, s));
}

/**
 * Like {@link isCanonWorkOwned}, but returns the reader's owning work (so an
 * owned canon entry can link to its book page) rather than a boolean. Exact
 * title+author first, then a same-year *drifting*-surname fallback for
 * translated / transliterated editions. A byte-identical surname is excluded
 * from the fallback (see {@link isCanonWorkOwned}): same author + same year + a
 * differing title is a distinct work, not a translation. `year` may be null
 * (undated / circa-only canon rows), in which case only the exact match applies.
 */
export function findOwnedWork(
  works: Work[],
  title: string,
  author: string,
  year: number | null,
): Work | undefined {
  const key = workKey(title, author);
  const exact = works.find((w) => workKeys(w).includes(key));
  if (exact) return exact;
  if (year == null) return undefined;
  const target = surnameKey(author);
  return works.find((w) => {
    if (w.originalYear !== year) return false;
    const s = surnameKey(w.author);
    return s !== target && surnamesMatch(target, s);
  });
}

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Edition, Work } from "./types";
import { PERIODS } from "./taxonomy";
import { CATALOGUE_TAG } from "./cache-tags";
import { admin } from "./supabase/admin";

// Row shapes returned by the Supabase catalogue tables.
interface WorkRow {
  id: string;
  title: string;
  author: string;
  author_sort: string | null;
  first_published: number | null;
  original_language: string | null;
  period: string | null;
  primary_movement: string | null;
  secondary_movements: string | null;
  notes: string | null;
  canonical_title: string | null;
  canonical_author: string | null;
}
interface EditionRow {
  id: string;
  name: string;
  publisher: string | null;
  language: string | null;
  format: string | null;
}
interface LinkRow {
  work_id: string;
  edition_id: string;
}
interface ReadRow {
  work_id: string;
  date_read: string | null;
  rating: number | null;
  source: string | null;
}

interface Catalogue {
  works: Work[];
  editions: Map<string, Edition>;
}

// PostgREST caps a single response at 1000 rows by default; the library is far
// smaller, but ask for a generous window so growth never silently truncates.
const MAX_ROWS = 10_000;

/**
 * Query and assemble the whole catalogue from Supabase. This is the raw read;
 * callers go through `loadCatalogue`, which layers caching on top.
 */
const queryCatalogue = async (): Promise<Catalogue> => {
  const db = admin();

  const [worksRes, editionsRes, linksRes, readsRes] = await Promise.all([
    db
      .from("works")
      .select("*")
      .order("author_sort", { nullsFirst: false })
      .order("title")
      .limit(MAX_ROWS),
    db.from("editions").select("*").limit(MAX_ROWS),
    db.from("work_editions").select("work_id, edition_id").limit(MAX_ROWS),
    db
      .from("read_status")
      .select("work_id, date_read, rating, source")
      .limit(MAX_ROWS),
  ]);

  for (const res of [worksRes, editionsRes, linksRes, readsRes]) {
    if (res.error) throw new Error(`catalogue load failed: ${res.error.message}`);
  }

  const workRows = (worksRes.data ?? []) as WorkRow[];
  const editionRows = (editionsRes.data ?? []) as EditionRow[];
  const linkRows = (linksRes.data ?? []) as LinkRow[];
  const readRows = (readsRes.data ?? []) as ReadRow[];

  const readByWork = new Map<string, ReadRow>();
  for (const r of readRows) readByWork.set(r.work_id, r);

  const editions = new Map<string, Edition>();
  for (const e of editionRows) {
    editions.set(e.id, {
      id: e.id,
      name: e.name,
      publisher: e.publisher,
      language: e.language,
      format: e.format ?? "print",
      workIds: [],
    });
  }

  const editionIdsByWork = new Map<string, string[]>();
  for (const l of linkRows) {
    const list = editionIdsByWork.get(l.work_id) ?? [];
    list.push(l.edition_id);
    editionIdsByWork.set(l.work_id, list);
    editions.get(l.edition_id)?.workIds.push(l.work_id);
  }

  const works: Work[] = workRows.map((r) => {
    const editionIds = editionIdsByWork.get(r.id) ?? [];
    const formats = [
      ...new Set(
        editionIds
          .map((eid) => editions.get(eid)?.format ?? "print")
          .filter(Boolean),
      ),
    ];
    return {
      id: r.id,
      title: r.title,
      author: r.author,
      authorSort: r.author_sort,
      originalYear: r.first_published,
      language: r.original_language,
      notes: r.notes,
      canonicalTitle: r.canonical_title ?? null,
      canonicalAuthor: r.canonical_author ?? null,
      editionIds,
      formats,
      classification: {
        period: r.period,
        primaryMovement: r.primary_movement,
        secondaryMovements: r.secondary_movements
          ? r.secondary_movements.split("|").map((m) => m.trim()).filter(Boolean)
          : [],
      },
      reading: readByWork.has(r.id)
        ? {
            dateRead: readByWork.get(r.id)!.date_read,
            rating: readByWork.get(r.id)!.rating,
            source: readByWork.get(r.id)!.source,
          }
        : null,
    };
  });

  return { works, editions };
};

// Persistent Data Cache layer. The serialisable snapshot (a Map can't be
// cached, so editions ride along as an array) is stored under the `catalogue`
// tag with no time-based expiry: it is only recomputed after a mutation route
// or a pull-to-refresh calls `revalidateTag(CATALOGUE_TAG)`. This is what stops
// every page render from hitting Supabase.
const loadCatalogueSnapshot = unstable_cache(
  async (): Promise<{ works: Work[]; editions: Edition[] }> => {
    const { works, editions } = await queryCatalogue();
    return { works, editions: [...editions.values()] };
  },
  ["catalogue-snapshot"],
  { tags: [CATALOGUE_TAG], revalidate: false },
);

// Per-render assembly: rebuild the editions Map once per request from the
// cached snapshot. React `cache()` dedupes repeat calls within one render.
const loadCatalogue = cache(async (): Promise<Catalogue> => {
  const { works, editions } = await loadCatalogueSnapshot();
  return {
    works,
    editions: new Map(editions.map((e) => [e.id, e] as const)),
  };
});

/** All works, deduplicated and sorted by author surname then title. */
export async function getWorks(): Promise<Work[]> {
  return (await loadCatalogue()).works;
}

/** Look up a single work by its id. */
export async function getWork(id: string): Promise<Work | undefined> {
  return (await loadCatalogue()).works.find((w) => w.id === id);
}

/** All editions in the catalogue. */
export async function getEditions(): Promise<Edition[]> {
  return [...(await loadCatalogue()).editions.values()];
}

/** Look up a single edition by its id. */
export async function getEdition(id: string): Promise<Edition | undefined> {
  return (await loadCatalogue()).editions.get(id);
}

/** Periods present in the catalogue, in taxonomy (chronological) order. */
export function getPeriods(works: Work[]): string[] {
  const present = new Set(
    works.map((w) => w.classification.period).filter((p): p is string => Boolean(p)),
  );
  return PERIODS.filter((p) => present.has(p));
}

/** Distinct movement values (primary + secondary) present in the catalogue. */
export function getMovements(works: Work[]): string[] {
  const set = new Set<string>();
  for (const w of works) {
    if (w.classification.primaryMovement) set.add(w.classification.primaryMovement);
    for (const m of w.classification.secondaryMovements) set.add(m);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

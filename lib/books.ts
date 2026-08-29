import type { Edition, Work } from "./types";
import { PERIODS } from "./taxonomy";
import { getDb } from "./db";

// Row shapes returned by the SQLite catalogue (built by scripts/import.ts).
interface WorkRow {
  id: string;
  title: string;
  author: string;
  first_published: number | null;
  original_language: string | null;
  period: string | null;
  primary_movement: string | null;
  secondary_movements: string | null;
  notes: string | null;
}
interface EditionRow {
  id: string;
  name: string;
  publisher: string | null;
  language: string | null;
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

let cache: Catalogue | null = null;

function build(): Catalogue {
  const db = getDb();
  const workRows = db
    .prepare("SELECT * FROM works ORDER BY author, title")
    .all() as unknown as WorkRow[];
  const editionRows = db
    .prepare("SELECT * FROM editions")
    .all() as unknown as EditionRow[];
  const linkRows = db
    .prepare("SELECT work_id, edition_id FROM work_editions ORDER BY edition_id")
    .all() as unknown as LinkRow[];
  const readRows = db
    .prepare("SELECT work_id, date_read, rating, source FROM read_status")
    .all() as unknown as ReadRow[];

  const readByWork = new Map<string, ReadRow>();
  for (const r of readRows) readByWork.set(r.work_id, r);

  const editions = new Map<string, Edition>();
  for (const e of editionRows) {
    editions.set(e.id, {
      id: e.id,
      name: e.name,
      publisher: e.publisher,
      language: e.language,
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

  const works: Work[] = workRows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    originalYear: r.first_published,
    language: r.original_language,
    notes: r.notes,
    editionIds: editionIdsByWork.get(r.id) ?? [],
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
  }));

  return { works, editions };
}

function catalogue(): Catalogue {
  if (!cache) cache = build();
  return cache;
}

/** Drop the in-process catalogue cache after the DB is rebuilt (intake commit). */
export function resetCatalogue(): void {
  cache = null;
}

/** All works, deduplicated and sorted by author then title. */
export function getWorks(): Work[] {
  return catalogue().works;
}

/** Look up a single work by its id. */
export function getWork(id: string): Work | undefined {
  return catalogue().works.find((w) => w.id === id);
}

/** All editions in the catalogue. */
export function getEditions(): Edition[] {
  return [...catalogue().editions.values()];
}

/** Look up a single edition by its id. */
export function getEdition(id: string): Edition | undefined {
  return catalogue().editions.get(id);
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

// Reusable importer core: parsing, taxonomy validation, and work/edition
// grouping. This module is intentionally PURE — it does no database I/O and no
// filesystem writes beyond the local-only CSV helpers at the bottom (used by the
// `add-books` dev script). Persisting grouped records to Supabase lives in
// ./catalogue-db so the serverless bundle never pulls in node:sqlite or fs.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { isMovement, isPeriod } from "../taxonomy.ts";

export interface BookRow {
  title: string;
  author: string;
  first_published?: string;
  original_language?: string;
  edition_language?: string;
  publisher?: string;
  edition?: string;
  period?: string;
  primary_movement?: string;
  secondary_movements?: string;
  notes?: string;
  /** Physical copy vs electronic. Blank/absent defaults to "print". */
  format?: string;
}

// Column order of data/library_master.csv — the single canonical header.
export const MASTER_COLUMNS: (keyof BookRow)[] = [
  "title",
  "author",
  "first_published",
  "original_language",
  "edition_language",
  "publisher",
  "edition",
  "period",
  "primary_movement",
  "secondary_movements",
  "notes",
  "format",
];

/** Normalise a format cell; blank/unknown falls back to "print". */
export function normalizeFormat(value: string | undefined): string {
  const t = value?.trim().toLowerCase();
  if (!t) return "print";
  if (t === "kindle" || t === "ebook" || t === "electronic" || t === "e-book") {
    return "ebook";
  }
  return t === "print" ? "print" : t;
}

// --- deterministic identity ------------------------------------------------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The canonical work id: title + author only, matching the identity used when
 * inserting works. Because it is deterministic, the same title+author always
 * yields the same id — so an ON CONFLICT (id) DO NOTHING upsert also enforces
 * the UNIQUE (title, author) de-duplication rule.
 */
export function workIdFor(title: string, author: string): string {
  return `${slugify(author.trim())}--${slugify(title.trim())}`;
}

function nullable(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseYear(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// --- edition identity ------------------------------------------------------

/**
 * Deterministic edition id. A named edition (omnibus / box set) is shared across
 * works, so its id is work-independent. A blank edition is a standalone copy,
 * identified by its own work + printing attributes (publisher + language) — so
 * two distinct printings of the same work get distinct ids, while re-committing
 * the same copy yields a stable id. Replaces the old sequence counter, which
 * produced colliding `ed--work--1` ids when adding a copy to an existing work.
 */
export function editionIdFor(
  workId: string,
  editionName: string | null,
  publisher: string | null,
  language: string | null,
  format: string,
): string {
  return editionName
    ? `ed--${slugify(editionName)}--${slugify(publisher ?? "")}--${slugify(format)}`
    : `ed--${workId}--${slugify(publisher ?? "")}--${slugify(language ?? "")}--${slugify(format)}`;
}

/**
 * Content signature of a (work, edition) link. Used to detect an already-owned
 * copy by its attributes rather than its id, so rows persisted under any earlier
 * id scheme still match and intake stays idempotent without a data migration.
 */
export function editionSignature(
  workId: string,
  name: string,
  publisher: string | null,
  language: string | null,
  format: string,
): string {
  return [workId, slugify(name), slugify(publisher ?? ""), slugify(language ?? ""), slugify(format)].join("\u0000");
}

/** Work id, edition id, and dedup signature for the edition a candidate describes. */
export function editionIdentity(
  row: BookRow,
): { workId: string; editionId: string; signature: string } {
  const workId = workIdFor(row.title.trim(), row.author.trim());
  const editionName = nullable(row.edition);
  const publisher = nullable(row.publisher);
  const language = nullable(row.edition_language);
  const format = normalizeFormat(row.format);
  const name = editionName ?? row.title.trim();
  return {
    workId,
    editionId: editionIdFor(workId, editionName, publisher, language, format),
    signature: editionSignature(workId, name, publisher, language, format),
  };
}

// --- grouping --------------------------------------------------------------

export interface WorkRecord {
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
export interface EditionRecord {
  id: string;
  name: string;
  publisher: string | null;
  language: string | null;
  format: string;
}
export interface LinkRecord {
  work_id: string;
  edition_id: string;
}

export interface GroupResult {
  works: WorkRecord[];
  editions: EditionRecord[];
  links: LinkRecord[];
  /** Human-readable lines for rows rejected as off-taxonomy. */
  rejected: string[];
}

/** Parse the master CSV text into raw BookRows. Throws on malformed CSV. */
export function parseMasterCsv(csv: string): BookRow[] {
  const { data, errors } = Papa.parse<BookRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse library_master.csv: ${errors[0].message} (row ${errors[0].row})`,
    );
  }
  return data;
}

/**
 * Validate taxonomy and group rows into de-duplicated work / edition / link
 * records. Pure: no I/O. Rows outside the controlled taxonomy are collected in
 * `rejected` rather than emitted.
 */
export function groupRows(rows: BookRow[]): GroupResult {
  const works = new Map<string, WorkRecord>();
  const editions = new Map<string, EditionRecord>();
  const links = new Map<string, LinkRecord>();
  const rejected: string[] = [];

  for (const row of rows) {
    if (!row.title?.trim() || !row.author?.trim()) continue;

    const title = row.title.trim();
    const author = row.author.trim();

    // Work identity = title + author only. first_published may be missing or
    // approximate, so it is an attribute, never part of the match key.
    const workId = workIdFor(title, author);

    // A shared edition (omnibus / box set) is grouped by its human-readable
    // `edition` label + publisher — NOT by author, so a multi-author box set is
    // ONE edition. A blank `edition` is a standalone copy: its id is derived from
    // publisher + language so two distinct printings stay distinct.
    const editionName = nullable(row.edition);
    const publisher = nullable(row.publisher);
    const format = normalizeFormat(row.format);
    const editionId = editionIdFor(
      workId,
      editionName,
      publisher,
      nullable(row.edition_language),
      format,
    );

    const period = nullable(row.period);
    const primary = nullable(row.primary_movement);
    const secondary = (row.secondary_movements ?? "")
      .split("|")
      .map((m) => m.trim())
      .filter(Boolean);

    const bad: string[] = [];
    if (period && !isPeriod(period)) bad.push(`period "${period}"`);
    if (primary && !isMovement(primary)) bad.push(`primary movement "${primary}"`);
    for (const m of secondary) if (!isMovement(m)) bad.push(`secondary movement "${m}"`);
    if (bad.length > 0) {
      rejected.push(`  ✗ "${title}" by ${author}: ${bad.join(", ")}`);
      continue;
    }

    if (!works.has(workId)) {
      works.set(workId, {
        id: workId,
        title,
        author,
        first_published: parseYear(row.first_published),
        original_language: nullable(row.original_language),
        period,
        primary_movement: primary,
        secondary_movements: secondary.join("|") || null,
        notes: nullable(row.notes),
      });
    }

    if (!editions.has(editionId)) {
      editions.set(editionId, {
        id: editionId,
        name: editionName ?? title,
        publisher,
        language: nullable(row.edition_language),
        format,
      });
    }

    links.set(`${workId}\u0000${editionId}`, { work_id: workId, edition_id: editionId });
  }

  return {
    works: [...works.values()],
    editions: [...editions.values()],
    links: [...links.values()],
    rejected,
  };
}

// --- read status -----------------------------------------------------------

// Read-status CSV columns — the canonical header of data/read_status.csv.
export const READ_STATUS_COLUMNS = [
  "work_id",
  "title",
  "author",
  "date_read",
  "rating",
  "source",
] as const;

export interface ReadStatusRow {
  work_id: string;
  title: string;
  author: string;
  date_read: string;
  rating: string;
  source: string;
}

// --- local CSV helpers (dev scripts only; never run on Vercel) --------------

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "data", "library_master.csv");

// Normalise line endings and drop trailing blank lines.
const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "");

export interface AppendResult {
  added: number;
  skipped: number;
}

// Append rows to the master CSV, skipping exact-duplicate lines so re-running the
// same batch is safe. Accepts already-serialised CSV lines (excluding header).
export function appendCsvLinesToMaster(lines: string[]): AppendResult {
  const master = norm(readFileSync(CSV_PATH, "utf8"));
  const existing = new Set(
    master.split("\n").slice(1).map((l) => l.trim()).filter(Boolean),
  );
  const incoming = lines.map((l) => l.trim()).filter(Boolean);
  const toAdd = incoming.filter((l) => !existing.has(l));

  if (toAdd.length > 0) {
    writeFileSync(CSV_PATH, `${master}\n${toAdd.join("\n")}\n`, "utf8");
  }
  return { added: toAdd.length, skipped: incoming.length - toAdd.length };
}

// Serialise BookRow objects into master-CSV data lines (no header, no trailing
// newline) using the canonical column order and RFC-4180 quoting.
export function rowsToCsvLines(rows: BookRow[]): string[] {
  const matrix = rows.map((r) => MASTER_COLUMNS.map((c) => r[c] ?? ""));
  const body = Papa.unparse(matrix, { newline: "\n" });
  return body ? body.split("\n") : [];
}

// Append BookRow objects to the master CSV (convenience over the two helpers).
export function appendRowsToMaster(rows: BookRow[]): AppendResult {
  return appendCsvLinesToMaster(rowsToCsvLines(rows));
}

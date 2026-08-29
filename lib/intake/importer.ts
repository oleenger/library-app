// Reusable importer core, shared by the `import`/`add-books` scripts and the
// intake commit API route. Keeps CSV-as-source-of-truth: books are appended to
// data/library_master.csv, then the DB is rebuilt from that master.
//
// Porting to Postgres later: swap `node:sqlite` for a pg client and change the
// `INSERT OR IGNORE` statements to `INSERT ... ON CONFLICT DO NOTHING`. The
// parsing, taxonomy validation, and work/edition grouping below are unchanged.

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
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
}

export interface ImportSummary {
  worksInserted: number;
  editionsInserted: number;
  duplicateRows: number;
  rejected: string[];
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
];

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "data", "library_master.csv");
const READ_STATUS_PATH = path.join(ROOT, "data", "read_status.csv");
const DB_PATH = path.join(ROOT, "data", "library.db");
const SCHEMA_PATH = path.join(ROOT, "db", "schema.sql");

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The canonical work id: title + author only, matching the identity used when
 * inserting works. Exported so the reading matcher can produce ids that line up
 * with the catalogue (a matched Goodreads row must reference a real work row).
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

// Rebuild data/library.db from the master CSV. Validates taxonomy, groups
// works/editions, and returns a summary. Never mutates process state.
export function runImport(): ImportSummary {
  const csv = readFileSync(CSV_PATH, "utf8");
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

  // Fresh database each run.
  rmSync(DB_PATH, { force: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(SCHEMA_PATH, "utf8"));

  const insertWork = db.prepare(
    `INSERT OR IGNORE INTO works
       (id, title, author, first_published, original_language, period, primary_movement, secondary_movements, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertEdition = db.prepare(
    `INSERT OR IGNORE INTO editions (id, name, publisher, language) VALUES (?, ?, ?, ?)`,
  );
  const linkWorkEdition = db.prepare(
    `INSERT OR IGNORE INTO work_editions (work_id, edition_id) VALUES (?, ?)`,
  );

  let editionSeq = 0;
  let worksInserted = 0;
  let duplicateRows = 0;
  let editionsInserted = 0;
  const rejected: string[] = [];

  db.prepare("BEGIN").run();

  for (const row of data) {
    if (!row.title?.trim() || !row.author?.trim()) continue;

    const title = row.title.trim();
    const author = row.author.trim();
    const firstPublished = parseYear(row.first_published);

    // Work identity = title + author only. first_published is not guaranteed (may be
    // missing or approximate), so it is stored as an attribute but never part of the
    // match key — otherwise one work would split across editions with differing years.
    const workId = `${slugify(author)}--${slugify(title)}`;

    // A shared edition (omnibus / box set) is grouped by its human-readable `edition`
    // label + publisher — NOT by author, so a multi-author box set is ONE edition.
    // A blank `edition` is a standalone volume: its own edition, one per row.
    const editionName = nullable(row.edition);
    const publisher = nullable(row.publisher);
    const editionId = editionName
      ? `ed--${slugify(editionName)}--${slugify(publisher ?? "")}`
      : `ed--${workId}--${++editionSeq}`;

    const period = nullable(row.period);
    const primary = nullable(row.primary_movement);
    const secondary = (row.secondary_movements ?? "")
      .split("|")
      .map((m) => m.trim())
      .filter(Boolean);

    // Reject anything outside the controlled taxonomy rather than inserting it.
    const bad: string[] = [];
    if (period && !isPeriod(period)) bad.push(`period "${period}"`);
    if (primary && !isMovement(primary)) bad.push(`primary movement "${primary}"`);
    for (const m of secondary) if (!isMovement(m)) bad.push(`secondary movement "${m}"`);
    if (bad.length > 0) {
      rejected.push(`  ✗ "${title}" by ${author}: ${bad.join(", ")}`);
      continue;
    }

    const res = insertWork.run(
      workId,
      title,
      author,
      firstPublished,
      nullable(row.original_language),
      period,
      primary,
      secondary.join("|") || null,
      nullable(row.notes),
    );
    // changes === 0 means the UNIQUE(title, author) constraint collapsed a duplicate:
    // the same work owned in another edition.
    if (Number(res.changes) > 0) worksInserted++;
    else duplicateRows++;

    const edRes = insertEdition.run(
      editionId,
      editionName ?? title,
      publisher,
      nullable(row.edition_language),
    );
    if (Number(edRes.changes) > 0) editionsInserted++;

    linkWorkEdition.run(workId, editionId);
  }

  db.prepare("COMMIT").run();

  loadReadStatus(db);

  db.close();

  return { worksInserted, editionsInserted, duplicateRows, rejected };
}

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

// Load data/read_status.csv into the read_status table. Rows whose work_id is not
// present in `works` are skipped (a work may have been removed from the master).
// Missing file is not an error: read tracking is optional.
function loadReadStatus(db: DatabaseSync): void {
  if (!existsSync(READ_STATUS_PATH)) return;
  const { data } = Papa.parse<ReadStatusRow>(readFileSync(READ_STATUS_PATH, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const known = new Set(
    (db.prepare("SELECT id FROM works").all() as unknown as { id: string }[]).map(
      (r) => r.id,
    ),
  );
  const insert = db.prepare(
    `INSERT OR IGNORE INTO read_status (work_id, date_read, rating, source)
     VALUES (?, ?, ?, ?)`,
  );

  db.prepare("BEGIN").run();
  for (const row of data) {
    const workId = row.work_id?.trim();
    if (!workId || !known.has(workId)) continue;
    const rating = Number(row.rating);
    insert.run(
      workId,
      nullable(row.date_read),
      Number.isFinite(rating) && rating > 0 ? rating : null,
      nullable(row.source),
    );
  }
  db.prepare("COMMIT").run();
}

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

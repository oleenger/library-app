// Standalone catalogue load script (proposal §5.1): mechanical, taxonomy-validated
// insert of data/books.csv into a fresh SQLite database (data/library.db).
//
// Run with:  npm run import   (Node runs this .ts directly via type-stripping)
//
// Porting to Postgres later: swap `node:sqlite` for a pg client and change the
// `INSERT OR IGNORE` statements to `INSERT ... ON CONFLICT DO NOTHING`. The
// parsing, taxonomy validation, and work/edition grouping below are unchanged.

import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import Papa from "papaparse";
import { isMovement, isPeriod } from "../lib/taxonomy.ts";

interface BookRow {
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

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "data", "library_master.csv");
const DB_PATH = path.join(ROOT, "data", "library.db");
const SCHEMA_PATH = path.join(ROOT, "db", "schema.sql");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

const run = db.prepare("BEGIN");
run.run();

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
db.close();

console.log("Library import complete:");
console.log(`  works inserted:        ${worksInserted}`);
console.log(`  editions inserted:     ${editionsInserted}`);
console.log(`  duplicate rows merged: ${duplicateRows} (same work, another edition)`);
console.log(`  rejected (off-taxonomy): ${rejected.length}`);
if (rejected.length > 0) {
  console.log(rejected.join("\n"));
  process.exitCode = 1;
}

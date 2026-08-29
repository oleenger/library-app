// Add new books from a delta CSV into the master library, then rebuild the DB.
//
//   npm run add-books -- <path-to-new-books.csv>
//
// The delta must have the SAME header as data/library_master.csv. Its data rows are
// appended to the master (exact-duplicate rows are skipped, so re-running the same
// delta is safe), then the DB is rebuilt via scripts/import.ts — which is where
// taxonomy validation and work/edition de-duplication happen, with a load summary.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MASTER = path.join(ROOT, "data", "library_master.csv");

const deltaArg = process.argv[2];
if (!deltaArg) {
  console.error("Usage: npm run add-books -- <path-to-new-books.csv>");
  process.exit(1);
}

// Normalise line endings and drop trailing blank lines.
const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "");
const master = norm(readFileSync(MASTER, "utf8"));
const delta = norm(readFileSync(path.resolve(ROOT, deltaArg), "utf8"));

const masterLines = master.split("\n");
const deltaLines = delta.split("\n");

if (masterLines[0].trim() !== deltaLines[0].trim()) {
  console.error("Header mismatch — the delta CSV must have the same columns as the master.");
  console.error(`  master: ${masterLines[0]}`);
  console.error(`  delta:  ${deltaLines[0]}`);
  process.exit(1);
}

const existing = new Set(masterLines.slice(1).map((l) => l.trim()).filter(Boolean));
const deltaRows = deltaLines.slice(1).map((l) => l.trim()).filter(Boolean);
const toAdd = deltaRows.filter((l) => !existing.has(l));
const skipped = deltaRows.length - toAdd.length;

if (toAdd.length > 0) {
  writeFileSync(MASTER, `${master}\n${toAdd.join("\n")}\n`, "utf8");
}
console.log(
  `add-books: ${toAdd.length} row(s) appended to data/library_master.csv` +
    (skipped ? `, ${skipped} already present (skipped)` : "") +
    ". Rebuilding…\n",
);

// Rebuild the DB from the now-updated master (validates + dedups + prints summary).
execFileSync("node", ["scripts/import.ts"], { stdio: "inherit", cwd: ROOT });

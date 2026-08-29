// Add new books from a delta CSV into the master library, then rebuild the DB.
//
//   npm run add-books -- <path-to-new-books.csv>
//
// The delta must have the SAME header as data/library_master.csv. Its data rows are
// appended to the master (exact-duplicate rows are skipped, so re-running the same
// delta is safe), then the DB is rebuilt — which is where taxonomy validation and
// work/edition de-duplication happen, with a load summary.

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  appendCsvLinesToMaster,
  MASTER_COLUMNS,
  runImport,
} from "../lib/intake/importer.ts";

const ROOT = process.cwd();

const deltaArg = process.argv[2];
if (!deltaArg) {
  console.error("Usage: npm run add-books -- <path-to-new-books.csv>");
  process.exit(1);
}

const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "");
const delta = norm(readFileSync(path.resolve(ROOT, deltaArg), "utf8"));
const deltaLines = delta.split("\n");

const expectedHeader = MASTER_COLUMNS.join(",");
if (deltaLines[0].trim() !== expectedHeader) {
  console.error("Header mismatch — the delta CSV must have the same columns as the master.");
  console.error(`  expected: ${expectedHeader}`);
  console.error(`  delta:    ${deltaLines[0]}`);
  process.exit(1);
}

const { added, skipped } = appendCsvLinesToMaster(deltaLines.slice(1));
console.log(
  `add-books: ${added} row(s) appended to data/library_master.csv` +
    (skipped ? `, ${skipped} already present (skipped)` : "") +
    ". Rebuilding…\n",
);

const summary = runImport();
console.log("Library import complete:");
console.log(`  works inserted:        ${summary.worksInserted}`);
console.log(`  editions inserted:     ${summary.editionsInserted}`);
console.log(`  duplicate rows merged: ${summary.duplicateRows} (same work, another edition)`);
console.log(`  rejected (off-taxonomy): ${summary.rejected.length}`);
if (summary.rejected.length > 0) {
  console.log(summary.rejected.join("\n"));
  process.exitCode = 1;
}

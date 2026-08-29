// Standalone catalogue load script (proposal §5.1): rebuilds data/library.db from
// data/library_master.csv with taxonomy validation and work/edition grouping.
//
// Run with:  npm run import   (Node runs this .ts directly via type-stripping)
//
// The actual logic lives in lib/intake/importer.ts so it can be reused by the
// intake commit API route. This script is a thin CLI wrapper around it.

import { runImport } from "../lib/intake/importer.ts";

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

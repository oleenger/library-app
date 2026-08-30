// One-off import of owned Kindle books as ELECTRONIC editions.
//
// The catalogue's master CSV is no longer authoritative (titles are edited live
// in the app), so this script does NOT touch it. It reads a self-contained,
// already-categorised CSV (data/kindle_fiction_categorized.csv, format=ebook)
// and upserts straight to Supabase.
//
// Idempotent and non-destructive:
//   - works upsert with ON CONFLICT (id) DO NOTHING, so a title already in the
//     library (and any hand-edit you made to it) is left untouched — it merely
//     gains a new electronic edition + link.
//   - editions/links are keyed deterministically (format is part of the id), so
//     re-running adds nothing and a Kindle copy never merges into a print one.
// After the upsert it replays the Goodreads shelf so any newly-owned title you
// have read is marked read immediately (updating the Read pages).
//
// Run with (Node 20.6+ loads the env file itself):
//   node --env-file=.env.local scripts/import-kindle.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { groupRows, parseMasterCsv } from "../lib/intake/importer.ts";
import { existingWorkIds, upsertGrouped } from "../lib/intake/catalogue-db.ts";
import { reconcileReads } from "../lib/reading/reconcile.ts";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data", "kindle_fiction_categorized.csv");

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing Supabase env. Run: node --env-file=.env.local scripts/import-kindle.ts",
    );
    process.exit(1);
  }

  const rows = parseMasterCsv(readFileSync(SOURCE, "utf8"));
  const grouped = groupRows(rows);

  if (grouped.rejected.length > 0) {
    console.error(`Off-taxonomy rows (${grouped.rejected.length}) — fix before importing:`);
    console.error(grouped.rejected.join("\n"));
    process.exit(1);
  }

  // Report which works are new vs already owned (so we can see edits are safe).
  const before = await existingWorkIds();
  const newWorks = grouped.works.filter((w) => !before.has(w.id));
  const existingWorks = grouped.works.length - newWorks.length;

  const summary = await upsertGrouped(grouped);

  console.log("Kindle import (electronic editions):");
  console.log(`  source rows:        ${rows.length}`);
  console.log(`  works in file:      ${grouped.works.length}`);
  console.log(`    new works:        ${newWorks.length}`);
  console.log(`    already owned:    ${existingWorks} (left untouched; gain an ebook edition)`);
  console.log(`  editions:           ${summary.editions}`);
  console.log(`  links:              ${summary.links}`);

  // Retro-match the Goodreads shelf against the now-larger catalogue so read
  // status attaches to any Kindle title you've already read.
  const r = await reconcileReads();
  console.log(`Reconciled reads:     ${r.matches.length} matched, ${r.totalReadWorks} read works total.`);

  console.log("\nImport complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

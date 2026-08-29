// One-time (and re-runnable) seed of Supabase from the local CSV/JSON data files.
// Idempotent: every write uses ON CONFLICT DO NOTHING / upsert, so running it
// again after editing the CSVs only adds what is new.
//
// Run with (Node loads the env file itself — needs Node 20.6+):
//   node --env-file=.env.local scripts/seed-supabase.ts
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import {
  groupRows,
  parseMasterCsv,
  type ReadStatusRow,
} from "../lib/intake/importer.ts";
import { upsertGrouped } from "../lib/intake/catalogue-db.ts";
import { mergeAndWriteReadStatus, type ReadRecord } from "../lib/reading/store.ts";
import { writeSet, type StoredSet } from "../lib/recommend/store.ts";
import type { CanonFocus, Recommendation } from "../lib/recommend/schema.ts";

const ROOT = process.cwd();
const MASTER = path.join(ROOT, "data", "library_master.csv");
const READS = path.join(ROOT, "data", "read_status.csv");
const RECS = path.join(ROOT, "data", "recommendations.json");

async function seedCatalogue(): Promise<void> {
  const rows = parseMasterCsv(readFileSync(MASTER, "utf8"));
  const grouped = groupRows(rows);
  const summary = await upsertGrouped(grouped);
  console.log("Catalogue:");
  console.log(`  works:    ${summary.works}`);
  console.log(`  editions: ${summary.editions}`);
  console.log(`  links:    ${summary.links}`);
  if (summary.rejected.length > 0) {
    console.log(`  rejected (off-taxonomy): ${summary.rejected.length}`);
    console.log(summary.rejected.join("\n"));
    process.exitCode = 1;
  }
}

async function seedReadStatus(): Promise<void> {
  if (!existsSync(READS)) {
    console.log("Read status: no read_status.csv, skipping.");
    return;
  }
  const { data } = Papa.parse<ReadStatusRow>(readFileSync(READS, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const records: ReadRecord[] = [];
  for (const r of data) {
    const workId = r.work_id?.trim();
    if (!workId) continue;
    const rating = Number(r.rating);
    records.push({
      workId,
      title: r.title ?? "",
      author: r.author ?? "",
      dateRead: r.date_read?.trim() || null,
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      source: r.source === "llm" ? "llm" : "exact",
    });
  }
  // read_status.work_id is a FK to works.id — rows whose work is absent will be
  // rejected by the DB, so only seed after the catalogue is in place.
  const merged = await mergeAndWriteReadStatus(records);
  console.log(`Read status: ${merged.length} rows.`);
}

async function seedRecommendations(): Promise<void> {
  if (!existsSync(RECS)) {
    console.log("Recommendations: no recommendations.json, skipping.");
    return;
  }
  const raw = JSON.parse(readFileSync(RECS, "utf8")) as {
    taste?: StoredSet<Recommendation>;
    canon?: StoredSet<CanonFocus>;
  };
  if (raw.taste) await writeSet("taste", raw.taste);
  if (raw.canon) await writeSet("canon", raw.canon);
  console.log(
    `Recommendations: ${[raw.taste && "taste", raw.canon && "canon"]
      .filter(Boolean)
      .join(", ") || "none"}.`,
  );
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing Supabase env. Run: node --env-file=.env.local scripts/seed-supabase.ts",
    );
    process.exit(1);
  }
  await seedCatalogue();
  await seedReadStatus();
  await seedRecommendations();
  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

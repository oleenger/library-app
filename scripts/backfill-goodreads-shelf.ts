import { readFileSync } from "node:fs";
import path from "node:path";
import { parseGoodreadsReads } from "../lib/reading/goodreads.ts";
import { saveGoodreadsReads, countGoodreadsReads } from "../lib/reading/goodreads-store.ts";
import { reconcileReads } from "../lib/reading/reconcile.ts";

async function main() {
  const csv = readFileSync(path.join(process.cwd(), "data", "goodreads.csv"), "utf8");
  const reads = parseGoodreadsReads(csv);
  console.log(`parsed read shelf: ${reads.length}`);
  await saveGoodreadsReads(reads);
  console.log(`goodreads_reads rows now: ${await countGoodreadsReads()}`);

  const r = await reconcileReads();
  console.log("reconcile:", {
    shelfSize: r.shelfSize,
    matched: r.matches.length,
    exact: r.tier1,
    llm: r.tier2,
    totalReadWorks: r.totalReadWorks,
    llmError: r.llmError,
  });
}

main().catch((e) => {
  console.error("BACKFILL FAILED:", e.message);
  process.exit(1);
});

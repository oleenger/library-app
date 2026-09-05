// Applies supabase/migrations/0005_strict_canon_taxonomy.sql to the live DB via
// the service-role client (the project has no psql / supabase CLI runner). Mirrors
// the SQL exactly: fold sub-movements into their canon parent, null out genres,
// then rebuild the '|'-delimited secondary lists (remap, drop, de-dupe, drop any
// entry equal to the primary). Idempotent — a second run finds nothing to change.
//
// Run: node --env-file=.env.local --import tsx scripts/apply-0005-strict-canon.ts

import { admin } from "../lib/supabase/admin.ts";

const TO_MODERNISM = ["Stream of consciousness", "Lost Generation"];
const TO_POSTMODERNISM = ["Metafiction", "Nouveau Roman"];
const TO_NULL = [
  "Contemporary literary fiction",
  "Crime fiction",
  "Autofiction",
  "Satire",
  "Dystopian fiction",
  "Science fiction",
  "Epic poetry",
  "Enlightenment",
];
const REMAP: Record<string, string> = {
  "Stream of consciousness": "Modernism",
  "Lost Generation": "Modernism",
  Metafiction: "Postmodernism",
  "Nouveau Roman": "Postmodernism",
};
const DROP = new Set(TO_NULL);
const ALL_REMOVED = [...TO_MODERNISM, ...TO_POSTMODERNISM, ...TO_NULL];

async function main() {
  const db = admin();

  // 1 & 2. Primary movement.
  const p1 = await db.from("works").update({ primary_movement: "Modernism" })
    .in("primary_movement", TO_MODERNISM).select("id");
  if (p1.error) throw p1.error;
  const p2 = await db.from("works").update({ primary_movement: "Postmodernism" })
    .in("primary_movement", TO_POSTMODERNISM).select("id");
  if (p2.error) throw p2.error;
  const p3 = await db.from("works").update({ primary_movement: null })
    .in("primary_movement", TO_NULL).select("id");
  if (p3.error) throw p3.error;
  console.log(`primary -> Modernism:     ${p1.data?.length ?? 0}`);
  console.log(`primary -> Postmodernism: ${p2.data?.length ?? 0}`);
  console.log(`primary -> NULL:          ${p3.data?.length ?? 0}`);

  // 3. Secondary movements — rebuilt in JS after the primary changes above.
  const rows = await db.from("works")
    .select("id, primary_movement, secondary_movements").limit(10000);
  if (rows.error) throw rows.error;

  let touched = 0;
  for (const w of rows.data ?? []) {
    const raw = w.secondary_movements;
    if (!raw || !ALL_REMOVED.some((m) => raw.includes(m))) continue;

    const seen = new Set<string>();
    const kept: string[] = [];
    for (const part of raw.split("|").map((s) => s.trim()).filter(Boolean)) {
      if (DROP.has(part)) continue;
      const mapped = REMAP[part] ?? part;
      if (mapped === (w.primary_movement ?? "")) continue; // don't duplicate primary
      if (seen.has(mapped)) continue;
      seen.add(mapped);
      kept.push(mapped);
    }
    kept.sort((a, b) => a.localeCompare(b));
    const next = kept.length > 0 ? kept.join("|") : null;
    if (next === raw) continue;

    const upd = await db.from("works")
      .update({ secondary_movements: next }).eq("id", w.id);
    if (upd.error) throw upd.error;
    touched++;
  }
  console.log(`secondary rebuilt:        ${touched}`);
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

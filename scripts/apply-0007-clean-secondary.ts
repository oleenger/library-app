// Final strict-canon sweep: strip any secondary_movements value that is not a
// taxonomy movement (Regionalism / local colour, Tragedy, Minimalism, …) from
// every work. Valid values are kept, de-duplicated, and any value equal to the
// work's primary is dropped; an emptied list becomes NULL. Primary movements are
// left untouched (they were already made strict-canon by 0005/0006).
//
// General pass over all works, so it also mops up any stray invalid secondary
// not caught earlier. Idempotent.
//
// Run: node --env-file=.env.local --import tsx scripts/apply-0007-clean-secondary.ts

import { admin } from "../lib/supabase/admin.ts";
import { isMovement } from "../lib/taxonomy.ts";

interface Row {
  id: string;
  primary_movement: string | null;
  secondary_movements: string | null;
}

function clean(raw: string | null, primary: string | null): string | null {
  if (!raw) return null;
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const part of raw.split("|").map((s) => s.trim()).filter(Boolean)) {
    if (!isMovement(part)) continue;
    if (part === primary) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    kept.push(part);
  }
  kept.sort((a, b) => a.localeCompare(b));
  return kept.length > 0 ? kept.join("|") : null;
}

async function main() {
  const db = admin();
  const res = await db
    .from("works")
    .select("id, primary_movement, secondary_movements")
    .not("secondary_movements", "is", null)
    .limit(10000);
  if (res.error) throw res.error;

  let touched = 0;
  for (const w of (res.data ?? []) as Row[]) {
    const next = clean(w.secondary_movements, w.primary_movement);
    if (next === w.secondary_movements) continue;
    const upd = await db.from("works")
      .update({ secondary_movements: next }).eq("id", w.id);
    if (upd.error) throw upd.error;
    console.log(`  ${w.id}: ${JSON.stringify(w.secondary_movements)} -> ${JSON.stringify(next)}`);
    touched++;
  }
  console.log(`\nsecondary cleaned: ${touched}`);
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

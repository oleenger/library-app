// Relabels the 55 owned works whose primary_movement predates the strict-canon
// taxonomy (Neo-Romanticism, National Romanticism, Oulipo, Minimalism,
// Elizabethan / Jacobean drama, Medieval romance) onto taxonomy-valid movements,
// per the research-backed mapping the owner approved:
//
//   Shakespeare tragedies, The Tale of Genji  -> null (canon "None / Pre-movement")
//   Kjell Askildsen (minimalist)              -> null (no canon parent)
//   Henrik Ibsen early plays                  -> Romanticism (national romanticism)
//   Georges Perec / Oulipo                    -> Postmodernism
//   Hans E. Kinck  -> Naturalism if tagged so, else Realism
//   Knut Hamsun    -> era-split: Modernism for the 1890s psychological/verse work
//                     (or an existing Modernism secondary); Realism for the later
//                     Nordland / social-realist novels.
//
// Secondary lists are also cleaned: any value not in the taxonomy is dropped
// (Regionalism / local colour, Tragedy, Minimalism), as is any value equal to the
// new primary. Empty -> null. Idempotent: a second run finds the 6 source labels
// gone and does nothing.
//
// Run: node --env-file=.env.local --import tsx scripts/apply-0006-relabel.ts

import { admin } from "../lib/supabase/admin.ts";
import { MOVEMENTS, isMovement } from "../lib/taxonomy.ts";

const SOURCE_LABELS = [
  "Neo-Romanticism",
  "National Romanticism",
  "Oulipo",
  "Minimalism",
  "Elizabethan / Jacobean drama",
  "Medieval romance",
];

const HAMSUN_VERSE = new Set(["Munken Vendt", "Det vilde kor"]);
const VALID = new Set<string>(MOVEMENTS);

interface Row {
  id: string;
  title: string;
  author: string;
  period: string | null;
  primary_movement: string | null;
  secondary_movements: string | null;
}

/** The approved primary movement for one orphan work (null = deliberately none). */
function targetPrimary(r: Row): string | null {
  const sec = (r.secondary_movements ?? "").split("|").map((s) => s.trim());
  switch (r.author) {
    case "William Shakespeare":
      return null; // canon: None / Pre-movement
    case "Murasaki Shikibu":
      return null; // canon: None / Pre-movement
    case "Kjell Askildsen":
      return null; // minimalism has no canon parent
    case "Henrik Ibsen":
      return "Romanticism"; // early national-romantic plays
    case "Georges Perec":
      return "Postmodernism";
    case "Hans E. Kinck":
      return sec.includes("Naturalism") ? "Naturalism" : "Realism";
    case "Knut Hamsun":
      if (sec.includes("Modernism")) return "Modernism";
      if (r.period === "Victorian / 19th century") return "Modernism"; // 1890s breakthrough
      if (HAMSUN_VERSE.has(r.title)) return "Modernism";
      return "Realism"; // later Nordland / social realism
    default:
      throw new Error(`no mapping rule for author "${r.author}" (${r.title})`);
  }
}

/** Cleaned secondary string (valid taxonomy values, minus the new primary), or null. */
function cleanSecondary(raw: string | null, primary: string | null): string | null {
  if (!raw) return null;
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const part of raw.split("|").map((s) => s.trim()).filter(Boolean)) {
    if (!isMovement(part)) continue; // drops Regionalism / local colour, Tragedy, Minimalism, …
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
    .select("id, title, author, period, primary_movement, secondary_movements")
    .in("primary_movement", SOURCE_LABELS)
    .limit(10000);
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as Row[];
  console.log(`found ${rows.length} works to relabel\n`);

  const tally: Record<string, number> = {};
  for (const r of rows) {
    const primary = targetPrimary(r);
    const secondary = cleanSecondary(r.secondary_movements, primary);
    const key = primary ?? "(null)";
    tally[key] = (tally[key] ?? 0) + 1;

    const upd = await db
      .from("works")
      .update({ primary_movement: primary, secondary_movements: secondary })
      .eq("id", r.id);
    if (upd.error) throw upd.error;
    console.log(
      `  ${r.author} — ${r.title}\n      ${r.primary_movement} -> ${primary ?? "null"}` +
        (secondary ? ` | 2nd: ${secondary}` : ""),
    );
  }

  console.log("\n-- totals --");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

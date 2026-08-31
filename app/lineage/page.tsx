import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { MOVEMENTS, MOVEMENT_PERIODS, PERIODS, type Period } from "@/lib/taxonomy";
import { LineageMap, type LineageBand } from "@/components/lineage-map";
import type { Work } from "@/lib/types";

// Live catalogue: counts reflect the current library without a rebuild.
export const dynamic = "force-dynamic";

export const metadata = { title: "Movement lineage — Personal Library" };

/** Live holding count per movement across the library (primary + secondary). */
function countByMovement(works: Work[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of works) {
    const labels = [
      w.classification.primaryMovement,
      ...w.classification.secondaryMovements,
    ];
    for (const m of labels) {
      if (m) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  return counts;
}

export default async function LineageMapPage() {
  const works = await getWorks();
  const counts = countByMovement(works);

  // Group every movement under its home period; cross-period modes (period null)
  // collect into a trailing "Cross-period forms" band. Bands run chronologically,
  // chips within a band by holding count (owned first), then alphabetically.
  const byPeriod = new Map<Period, LineageBand["chips"]>();
  const crossPeriod: LineageBand["chips"] = [];
  for (const movement of MOVEMENTS) {
    const period = MOVEMENT_PERIODS[movement];
    const chip = {
      movement,
      slug: slugify(movement),
      period,
      count: counts.get(movement) ?? 0,
    };
    if (period === null) {
      crossPeriod.push(chip);
    } else {
      const list = byPeriod.get(period) ?? [];
      list.push(chip);
      byPeriod.set(period, list);
    }
  }

  const sortChips = (chips: LineageBand["chips"]) =>
    [...chips].sort((a, b) => b.count - a.count || a.movement.localeCompare(b.movement));

  const bands: LineageBand[] = PERIODS.filter((p) => byPeriod.has(p)).map((period) => ({
    period,
    chips: sortChips(byPeriod.get(period) ?? []),
  }));
  if (crossPeriod.length > 0) {
    bands.push({ period: null, chips: sortChips(crossPeriod) });
  }

  const owned = MOVEMENTS.filter((m) => (counts.get(m) ?? 0) > 0).length;

  return <LineageMap bands={bands} total={MOVEMENTS.length} owned={owned} />;
}

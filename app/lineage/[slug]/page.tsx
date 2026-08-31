import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { MOVEMENTS, movementPeriod, isCrossPeriod, type Movement } from "@/lib/taxonomy";
import { lineageNode } from "@/lib/lineage";
import { canonPath } from "@/lib/canon/paths";
import { buildOwnedIndex, isCanonWorkOwned } from "@/lib/recommend/match";
import { shortPeriod } from "@/lib/display";
import { LineageView, type LineageChip, type LineageExample } from "@/components/lineage-view";
import type { Work } from "@/lib/types";

// Live catalogue: render on demand so holding counts reflect the current library
// without a rebuild.
export const dynamic = "force-dynamic";

/** The canonical movement whose label slugifies to `slug`, if any. */
function resolveMovement(slug: string): Movement | undefined {
  return MOVEMENTS.find((m) => slugify(m) === slug);
}

/** All movement labels a work carries (primary + secondary). */
function workMovements(work: Work): string[] {
  const c = work.classification;
  return [
    ...(c.primaryMovement ? [c.primaryMovement] : []),
    ...c.secondaryMovements,
  ];
}

/** Live holding count per movement across the whole library (primary + secondary). */
function countByMovement(works: Work[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of works) {
    for (const m of workMovements(w)) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return counts;
}

/** Turn a list of related movements into display chips with live counts. */
function toChips(
  movements: Movement[] | undefined,
  counts: Map<string, number>,
): LineageChip[] {
  return (movements ?? []).map((m) => ({
    movement: m,
    slug: slugify(m),
    period: movementPeriod(m),
    count: counts.get(m) ?? 0,
  }));
}

async function lineageData(slug: string) {
  const movement = resolveMovement(slug);
  if (!movement) return null;

  const works = await getWorks();
  const counts = countByMovement(works);
  const node = lineageNode(movement);
  const period = movementPeriod(movement);

  const holdings = works.filter((w) => workMovements(w).includes(movement));
  const examples: LineageExample[] = holdings.map((w) => ({
    id: w.id,
    title: w.title,
    author: w.author,
    year: w.originalYear,
  }));

  const eraLabel = [
    isCrossPeriod(movement) ? "Cross-period form" : shortPeriod(period),
    node.years,
  ]
    .filter(Boolean)
    .join(" · ");

  // Canon coverage: how many of the movement's curated canon the reader owns,
  // matched translation-tolerantly against live holdings.
  const canon = canonPath(movement);
  let canonOwned = 0;
  let canonTotal = 0;
  if (canon) {
    const owned = buildOwnedIndex(works);
    canonTotal = canon.works.length;
    canonOwned = canon.works.filter((w) =>
      isCanonWorkOwned(owned, w.title, w.author, w.year),
    ).length;
  }

  return {
    movement,
    period,
    eraLabel,
    note: node.note,
    count: holdings.length,
    examples,
    hasCanon: canon != null,
    canonOwned,
    canonTotal,
    reactedAgainst: toChips(node.reactedAgainst, counts),
    ledTo: toChips(node.ledTo, counts),
    alongside: toChips(node.alongside, counts),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const movement = resolveMovement(slug);
  return {
    title: movement ? `${movement} lineage — Personal Library` : "Not found",
  };
}

export default async function LineagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await lineageData(slug);
  if (!data) notFound();

  return <LineageView {...data} />;
}

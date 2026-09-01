import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { MOVEMENTS, movementPeriod, isCrossPeriod, type Movement } from "@/lib/taxonomy";
import { lineageNode } from "@/lib/lineage";
import { canonPath } from "@/lib/canon/paths";
import { essentialsFor, movementYears, influenceRelations } from "@/lib/canon/data";
import { findOwnedWork } from "@/lib/recommend/match";
import { shortPeriod, formatYear } from "@/lib/display";
import { LineageView, type LineageChip, type LineageExample, type CanonEntry } from "@/components/lineage-view";
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

  // Era range comes from the essentials' own year span (authoritative), with the
  // curated LINEAGE `years` string as a fallback for movements the reference
  // data does not yet cover.
  const span = movementYears(movement);
  const yearsLabel = span
    ? span.min === span.max
      ? formatYear(span.min)
      : `${formatYear(span.min)}–${formatYear(span.max)}`
    : node.years;
  const eraLabel = [
    isCrossPeriod(movement) ? "Cross-period form" : shortPeriod(period),
    yearsLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  // Essentials: the movement's authoritative works (from the reference TSV),
  // joined live against the reader's shelf so each is marked owned (a waypoint)
  // or a gap. The essentials — not the reader's incidental holdings — are the
  // point of this view.
  const essentials = essentialsFor(movement);
  const canonWorks: CanonEntry[] = essentials.map((e) => {
    const owned = findOwnedWork(works, e.title, e.author, e.sortYear);
    return {
      title: e.title,
      author: e.author,
      displayYear: e.displayYear,
      owned: owned != null,
      ownedId: owned?.id ?? null,
    };
  });
  const canonOwned = canonWorks.filter((w) => w.owned).length;

  // A curated, ordered reading path (paths.ts) is a separate, transitional
  // source that still powers /recommendations — surface its blurb and the
  // "read in order" link only where one exists.
  const guided = canonPath(movement);
  const relations = influenceRelations(movement);

  return {
    movement,
    period,
    eraLabel,
    note: node.note,
    count: holdings.length,
    examples,
    hasCanon: canonWorks.length > 0,
    hasGuidedPath: guided != null,
    canonBlurb: guided?.blurb,
    canonWorks,
    canonOwned,
    canonTotal: canonWorks.length,
    reactedAgainst: toChips(relations.reactedAgainst, counts),
    ledTo: toChips(relations.ledTo, counts),
    alongside: toChips(relations.alongside, counts),
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

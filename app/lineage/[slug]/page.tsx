import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { MOVEMENTS, movementPeriod, isCrossPeriod, type Movement } from "@/lib/taxonomy";
import { lineageNode } from "@/lib/lineage";
import { canonPath } from "@/lib/canon/paths";
import { workKey, surnameKey, surnamesMatch } from "@/lib/recommend/match";
import { shortPeriod } from "@/lib/display";
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

/**
 * Find the reader's own copy of a canonical work, if held: exact title+author
 * first, then a same-year loose-surname fallback so a translated edition still
 * resolves. Returns the owning work so an owned essential can link to its page.
 */
function findOwnedWork(
  works: Work[],
  title: string,
  author: string,
  year: number,
): Work | undefined {
  const key = workKey(title, author);
  const exact = works.find((w) => workKey(w.title, w.author) === key);
  if (exact) return exact;
  const target = surnameKey(author);
  return works.find(
    (w) =>
      w.originalYear === year && surnamesMatch(target, surnameKey(w.author)),
  );
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

  // Canon: the movement's essential works, joined live against the reader's
  // shelf so each is marked owned (a waypoint) or a gap. The essentials — not
  // the reader's incidental holdings — are the point of this view.
  const canon = canonPath(movement);
  let canonWorks: CanonEntry[] = [];
  let canonOwned = 0;
  if (canon) {
    canonWorks = [...canon.works]
      .sort((a, b) => a.year - b.year)
      .map((w) => {
        const owned = findOwnedWork(works, w.title, w.author, w.year);
        return {
          title: w.title,
          author: w.author,
          year: w.year,
          importance: w.importance,
          owned: owned != null,
          ownedId: owned?.id ?? null,
        };
      });
    canonOwned = canonWorks.filter((w) => w.owned).length;
  }

  return {
    movement,
    period,
    eraLabel,
    note: node.note,
    count: holdings.length,
    examples,
    hasCanon: canon != null,
    canonBlurb: canon?.blurb,
    canonWorks,
    canonOwned,
    canonTotal: canonWorks.length,
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

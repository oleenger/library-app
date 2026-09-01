import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { isMovement } from "@/lib/taxonomy";
import { CollectionView } from "@/components/collection-view";

// Live catalogue: render on demand so newly added books appear without a rebuild.
export const dynamic = "force-dynamic";

/** The display name and works for whichever movement slugifies to `slug`. */
async function movementWorks(slug: string) {
  const works = await getWorks();
  let name: string | undefined;
  const matches = works.filter((w) => {
    const movements = [
      w.classification.primaryMovement,
      ...w.classification.secondaryMovements,
    ].filter((m): m is string => Boolean(m));
    const hit = movements.find((m) => slugify(m) === slug);
    if (hit) {
      name ??= hit;
      return true;
    }
    return false;
  });
  return { name, works: matches };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { name } = await movementWorks(slug);
  return { title: name ? `${name} — Personal Library` : "Not found" };
}

export default async function MovementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { name, works } = await movementWorks(slug);
  if (!name || works.length === 0) notFound();

  return (
    <CollectionView
      eyebrow="Movement"
      title={name}
      works={works}
      lineageMovement={isMovement(name) ? name : undefined}
    />
  );
}

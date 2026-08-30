import { notFound } from "next/navigation";
import { getWorks, getEditions } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { CollectionView } from "@/components/collection-view";

// Live catalogue: render on demand so newly added books appear without a rebuild.
export const dynamic = "force-dynamic";

/**
 * The display name and works for whichever publisher slugifies to `slug`.
 * Publisher lives on the owned edition, so we join works → editions and match
 * any work owned in an edition from this publisher, ordered by year then title.
 */
async function publisherWorks(slug: string) {
  const [works, editions] = await Promise.all([getWorks(), getEditions()]);
  const editionsById = new Map(editions.map((e) => [e.id, e]));

  let name: string | undefined;
  const matches = works.filter((w) => {
    const publishers = w.editionIds
      .map((id) => editionsById.get(id)?.publisher)
      .filter((p): p is string => Boolean(p));
    const hit = publishers.find((p) => slugify(p) === slug);
    if (hit) {
      name ??= hit;
      return true;
    }
    return false;
  });

  matches.sort(
    (a, b) =>
      (a.originalYear ?? Infinity) - (b.originalYear ?? Infinity) ||
      a.title.localeCompare(b.title),
  );

  return { name, works: matches };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { name } = await publisherWorks(slug);
  return { title: name ? `${name} — Personal Library` : "Not found" };
}

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { name, works } = await publisherWorks(slug);
  if (!name || works.length === 0) notFound();

  return <CollectionView eyebrow="Publisher" title={name} works={works} />;
}

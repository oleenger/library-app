import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { slugify } from "@/lib/slug";
import { CollectionView } from "@/components/collection-view";

// Live catalogue: render on demand so newly added books appear without a rebuild.
export const dynamic = "force-dynamic";

/** Works by the author whose name slugifies to `slug`, oldest first. */
async function authorWorks(slug: string) {
  const works = await getWorks();
  const matches = works.filter((w) => slugify(w.author) === slug);
  matches.sort(
    (a, b) =>
      (a.originalYear ?? Infinity) - (b.originalYear ?? Infinity) ||
      a.title.localeCompare(b.title),
  );
  return matches;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const works = await authorWorks(slug);
  const name = works[0]?.author;
  return { title: name ? `${name} — Personal Library` : "Not found" };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const works = await authorWorks(slug);
  if (works.length === 0) notFound();

  return (
    <CollectionView
      eyebrow="Author"
      title={works[0].author}
      works={works}
    />
  );
}

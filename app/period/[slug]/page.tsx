import { notFound } from "next/navigation";
import { getWorks } from "@/lib/books";
import { periodColor } from "@/lib/display";
import { slugify } from "@/lib/slug";
import { CollectionView } from "@/components/collection-view";

// Live catalogue: render on demand so newly added books appear without a rebuild.
export const dynamic = "force-dynamic";

/** Works whose period slugifies to `slug`, ordered by author surname then title. */
async function periodWorks(slug: string) {
  const works = await getWorks();
  return works.filter(
    (w) => w.classification.period && slugify(w.classification.period) === slug,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const works = await periodWorks(slug);
  const period = works[0]?.classification.period;
  return { title: period ? `${period} — Personal Library` : "Not found" };
}

export default async function PeriodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const works = await periodWorks(slug);
  if (works.length === 0) notFound();

  const period = works[0].classification.period!;
  return (
    <CollectionView
      eyebrow="Period"
      title={period}
      accent={periodColor(period)}
      works={works}
    />
  );
}

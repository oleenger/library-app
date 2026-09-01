import { notFound, permanentRedirect } from "next/navigation";
import { MOVEMENTS, type Movement } from "@/lib/taxonomy";
import { slugify } from "@/lib/slug";

// The per-movement detail moved onto the Canon page (/recommendations). This
// legacy route now permanently forwards old /lineage/[slug] links (bookmarks,
// book pages, collection views) to the movement's canon detail.
export default async function LineageSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const movement = MOVEMENTS.find((m: Movement) => slugify(m) === slug);
  if (!movement) notFound();
  permanentRedirect(`/recommendations?movement=${encodeURIComponent(movement)}`);
}

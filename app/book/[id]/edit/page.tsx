import Link from "next/link";
import { notFound } from "next/navigation";
import { getWork } from "@/lib/books";
import { BookEditForm } from "@/components/book-edit-form";

// The catalogue is live in Supabase; render on demand so edits are reflected
// immediately without a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await getWork(id);
  return { title: work ? `Edit ${work.title} — Personal Library` : "Not found" };
}

export default async function BookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
      <nav className="flex h-14 items-center justify-between border-b border-paper-edge sm:h-16">
        <Link href={`/book/${work.id}`} className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">Back to book</span>
        </Link>
        <span className="text-xs text-ink-faint">Edit work</span>
      </nav>

      <header className="enter-up py-8 sm:py-10">
        <h1 className="font-serif text-3xl leading-tight tracking-[-0.02em] sm:text-4xl">
          Edit book
        </h1>
        <p className="mt-2 text-sm text-ink-soft">{work.title}</p>
      </header>

      <BookEditForm work={work} />
    </main>
  );
}

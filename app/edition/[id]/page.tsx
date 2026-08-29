import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getEditions, getWork } from "@/lib/books";
import { formatYear } from "@/lib/display";

export function generateStaticParams() {
  return getEditions().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = getEdition(id);
  return { title: edition ? `${edition.name} — Personal Library` : "Not found" };
}

export default async function EditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = getEdition(id);
  if (!edition) notFound();

  const works = edition.workIds
    .map((wid) => getWork(wid))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="font-sans text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        ← The Library
      </Link>

      <header className="mt-6 border-b border-paper-edge pb-6">
        <span className="font-sans text-xs uppercase tracking-[0.15em] text-ink-faint">
          Edition
        </span>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          {edition.name}
        </h1>
        <p className="mt-2 font-sans text-base text-ink-soft">
          {edition.publisher ?? "Publisher unknown"}
          {edition.language && ` · ${edition.language}`}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="font-sans text-xs uppercase tracking-[0.15em] text-ink-faint">
          {works.length === 1 ? "Work in this edition" : "Works in this edition"}
        </h2>
        <ul className="mt-3 divide-y divide-paper-edge border-y border-paper-edge">
          {works.map((w) => (
            <li key={w.id}>
              <Link
                href={`/book/${w.id}`}
                className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:bg-paper-raised"
              >
                <span className="min-w-0">
                  <span className="font-serif text-base text-ink hover:underline hover:underline-offset-2">
                    {w.title}
                  </span>
                  <span className="block font-sans text-sm text-ink-soft">
                    {w.author}
                  </span>
                </span>
                <span className="shrink-0 font-sans text-sm tabular-nums text-ink-faint">
                  {formatYear(w.originalYear)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

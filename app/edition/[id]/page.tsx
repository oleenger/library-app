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
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <nav className="flex h-16 items-center justify-between border-b border-paper-edge sm:h-20">
        <Link href="/" className="group flex items-center gap-3 text-sm">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-paper-edge bg-paper-raised shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <span className="text-xs text-ink-faint">
          Edition record
        </span>
      </nav>

      <header className="enter-up border-b border-paper-edge py-10 sm:py-14">
        <span className="text-xs font-semibold text-accent">
          Owned edition
        </span>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">
          {edition.name}
        </h1>
        <p className="mt-4 text-base text-ink-soft">
          {edition.publisher ?? "Publisher unknown"}
          {edition.language && ` · ${edition.language}`}
        </p>
      </header>

      <section className="enter-up-late py-10 sm:py-12">
        <div className="flex items-end justify-between border-b border-paper-edge pb-4">
          <h2 className="text-xs font-semibold text-ink-soft">
          {works.length === 1 ? "Work in this edition" : "Works in this edition"}
          </h2>
          <span className="font-serif text-3xl tabular-nums">{works.length}</span>
        </div>
        <ul className="divide-y divide-paper-edge">
          {works.map((w, index) => (
            <li key={w.id}>
              <Link
                href={`/book/${w.id}`}
                className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-5 transition-colors hover:bg-paper-raised sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-6 sm:py-7"
              >
                <span className="text-[0.62rem] tabular-nums text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="font-serif text-xl leading-tight text-ink decoration-accent group-hover:underline group-hover:underline-offset-4 sm:text-2xl">
                    {w.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {w.author}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-faint">
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getWork } from "@/lib/books";
import { formatYear } from "@/lib/display";
import { slugify } from "@/lib/slug";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await getEdition(id);
  return { title: edition ? `${edition.name} — Personal Library` : "Not found" };
}

export default async function EditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await getEdition(id);
  if (!edition) notFound();

  const works = (
    await Promise.all(edition.workIds.map((wid) => getWork(wid)))
  ).filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

      <main className="enter-up mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <header className="mb-4 px-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Owned edition
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            {edition.name}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {edition.publisher ? (
              <Link
                href={`/publisher/${slugify(edition.publisher)}`}
                className="font-medium text-ink-soft underline decoration-paper-edge underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {edition.publisher}
              </Link>
            ) : (
              "Publisher unknown"
            )}
            {edition.language && ` · ${edition.language}`}
            {` · ${edition.format === "ebook" ? "Electronic edition" : "Print edition"}`}
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
          <ol className="divide-y divide-paper-edge">
            {works.map((w, index) => (
              <li key={w.id}>
                <Link
                  href={`/book/${w.id}`}
                  className="group flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken/60 active:bg-paper-sunken sm:px-5"
                >
                  <span className="w-6 shrink-0 pt-0.5 text-[0.7rem] tabular-nums text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink transition-colors group-hover:text-accent">
                      {w.title}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">{w.author}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-ink-faint">
                    {formatYear(w.originalYear)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </main>
      </div>
    </PullToRefresh>
  );
}

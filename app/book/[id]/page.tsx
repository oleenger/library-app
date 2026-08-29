import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getWork } from "@/lib/books";
import { formatYear, periodColor } from "@/lib/display";

// Rendered on demand: the catalogue is live in Supabase, so a newly added book
// is reachable immediately without a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await getWork(id);
  return { title: work ? `${work.title} — Personal Library` : "Not found" };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-paper-edge py-4 sm:grid-cols-[12rem_1fr] sm:gap-6 sm:py-5">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-ink">{value}</dd>
    </div>
  );
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) notFound();

  const { classification: c } = work;
  const secondary =
    c.secondaryMovements.length > 0 ? c.secondaryMovements.join(", ") : "—";

  const editions = (
    await Promise.all(work.editionIds.map((eid) => getEdition(eid)))
  ).filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <nav className="flex h-14 items-center justify-between border-b border-paper-edge sm:h-16">
        <Link href="/" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <span className="text-xs text-ink-faint">Work record</span>
      </nav>

      <header className="enter-up border-b border-paper-edge py-10 sm:py-14">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${periodColor(c.period)}1f`, color: periodColor(c.period) }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: periodColor(c.period) }}
            aria-hidden
          />
          {c.period ?? "Unclassified"}
        </span>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
          {work.title}
        </h1>
        <p className="mt-4 text-base text-ink-soft">by {work.author}</p>
        {work.reading && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
            Read
            {work.reading.dateRead && ` · ${work.reading.dateRead}`}
            {work.reading.rating != null && ` · ${"★".repeat(work.reading.rating)}`}
          </p>
        )}
        <p className="mt-6 inline-flex items-baseline gap-2">
          <span className="text-xs text-ink-faint">First published</span>
          <span className="font-serif text-2xl tabular-nums">
            {formatYear(work.originalYear)}
          </span>
        </p>
      </header>

      <section className="enter-up-late grid gap-8 py-10 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12 sm:py-12">
        <div>
          <p className="text-xs font-semibold text-accent">
            Classification
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-ink-soft">
            Bibliographic and collection details.
          </p>
        </div>
        <dl className="rounded-2xl border border-paper-edge bg-white px-5 shadow-card sm:px-6">
        <Field label="Year first published" value={formatYear(work.originalYear)} />
        <Field label="Original language" value={work.language ?? "—"} />
        <Field label="Period" value={c.period ?? "—"} />
        <Field label="Primary movement" value={c.primaryMovement ?? "—"} />
        <Field label="Secondary movements" value={secondary} />
        {work.notes && <Field label="Notes" value={work.notes} />}
        </dl>
      </section>

      {editions.length > 0 && (
        <section className="border-t border-paper-edge py-10 sm:py-12">
          <h2 className="text-xs font-semibold text-accent">
            {editions.length === 1 ? "Edition owned" : `Editions owned (${editions.length})`}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {editions.map((edition) => {
              const companions = edition.workIds.filter(
                (wid) => wid !== work.id,
              ).length;
              const translated =
                edition.language &&
                work.language &&
                edition.language !== work.language;
              const isCollection = edition.workIds.length > 1;
              return (
                <li
                  key={edition.id}
                  className="flex flex-col rounded-md border border-paper-edge bg-paper-raised p-5 sm:p-6"
                >
                  {isCollection && (
                    <p className="font-serif text-xl text-ink">{edition.name}</p>
                  )}
                  <p className={`${isCollection ? "mt-2" : ""} text-sm leading-6 text-ink-soft`}>
                    {edition.publisher ?? "Publisher unknown"}
                    {edition.language && ` · ${edition.language}`}
                    {translated && (
                      <span className="text-ink-faint">
                        {" "}
                        (translated from {work.language})
                      </span>
                    )}
                  </p>
                  {companions > 0 && (
                    <p className="mt-1 text-sm text-ink-soft">
                      Also contains {companions} other{" "}
                      {companions === 1 ? "work" : "works"}
                    </p>
                  )}
                  <Link
                    href={`/edition/${edition.id}`}
                    className="mt-6 inline-flex items-center gap-2 self-start text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink decoration-accent underline-offset-4 hover:underline"
                  >
                    View edition details →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

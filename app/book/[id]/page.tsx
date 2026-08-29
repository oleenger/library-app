import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getWork, getWorks } from "@/lib/books";
import { formatYear, periodDot } from "@/lib/display";

export function generateStaticParams() {
  return getWorks().map((w) => ({ id: w.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = getWork(id);
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
  const work = getWork(id);
  if (!work) notFound();

  const { classification: c } = work;
  const secondary =
    c.secondaryMovements.length > 0 ? c.secondaryMovements.join(", ") : "—";

  const editions = work.editionIds
    .map((eid) => getEdition(eid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-7 lg:px-10">
      <nav className="flex h-20 items-center justify-between border-b border-ink">
        <Link href="/" className="group flex items-center gap-3 text-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-paper-edge bg-paper-raised transition-colors group-hover:border-ink">
            ←
          </span>
          <span className="font-semibold uppercase tracking-[0.12em]">The Library</span>
        </Link>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Work record
        </span>
      </nav>

      <header className="enter-up grid gap-10 border-b border-ink py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-end lg:py-24">
        <div>
          <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            <span className={`h-2 w-2 rounded-full ${periodDot(c.period)}`} aria-hidden />
            {c.period ?? "Unclassified"}
          </div>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,8vw,6.75rem)] leading-[0.92] tracking-[-0.045em]">
            {work.title}
          </h1>
          <p className="mt-6 text-base text-ink-soft sm:text-lg">by {work.author}</p>
        </div>
        <div className="border-l border-paper-edge pl-5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            First published
          </p>
          <p className="mt-3 font-serif text-5xl tabular-nums">
            {formatYear(work.originalYear)}
          </p>
        </div>
      </header>

      <section className="enter-up-late grid gap-10 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-accent">
            Classification
          </p>
          <p className="mt-3 max-w-xs font-serif text-2xl leading-tight">
            Where this work sits in the collection.
          </p>
        </div>
        <dl className="border-t border-ink">
        <Field label="Year first published" value={formatYear(work.originalYear)} />
        <Field label="Original language" value={work.language ?? "—"} />
        <Field label="Period" value={c.period ?? "—"} />
        <Field label="Primary movement" value={c.primaryMovement ?? "—"} />
        <Field label="Secondary movements" value={secondary} />
        {work.notes && <Field label="Notes" value={work.notes} />}
        </dl>
      </section>

      {editions.length > 0 && (
        <section className="border-t border-ink py-10 sm:py-14">
          <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-accent">
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

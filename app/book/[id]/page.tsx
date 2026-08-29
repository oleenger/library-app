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
    <div className="border-b border-paper-edge py-3">
      <dt className="font-sans text-xs uppercase tracking-[0.15em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-sm text-ink">{value}</dd>
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
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="font-sans text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        ← The Library
      </Link>

      <header className="mt-6 border-b border-paper-edge pb-6">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${periodDot(c.period)}`}
            aria-hidden
          />
          <span className="font-sans text-xs uppercase tracking-[0.15em] text-ink-faint">
            {c.period ?? "Unclassified"}
          </span>
        </div>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          {work.title}
        </h1>
        <p className="mt-2 font-sans text-base text-ink-soft">{work.author}</p>
      </header>

      <dl className="mt-4">
        <Field label="Year first published" value={formatYear(work.originalYear)} />
        <Field label="Original language" value={work.language ?? "—"} />
        <Field label="Period" value={c.period ?? "—"} />
        <Field label="Primary movement" value={c.primaryMovement ?? "—"} />
        <Field label="Secondary movements" value={secondary} />
        {work.notes && <Field label="Notes" value={work.notes} />}
      </dl>

      {editions.length > 0 && (
        <section className="mt-8">
          <h2 className="font-sans text-xs uppercase tracking-[0.15em] text-ink-faint">
            {editions.length === 1 ? "Edition owned" : `Editions owned (${editions.length})`}
          </h2>
          <ul className="mt-2 space-y-3">
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
                  className="rounded-md border border-paper-edge bg-paper-raised p-4"
                >
                  {isCollection && (
                    <p className="font-serif text-lg text-ink">{edition.name}</p>
                  )}
                  <p className="font-sans text-sm text-ink-soft">
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
                    <p className="mt-1 font-sans text-sm text-ink-soft">
                      Also contains {companions} other{" "}
                      {companions === 1 ? "work" : "works"}
                    </p>
                  )}
                  <Link
                    href={`/edition/${edition.id}`}
                    className="mt-3 inline-block font-sans text-sm text-ink underline underline-offset-2 hover:text-ink-soft"
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getWork } from "@/lib/books";
import { formatYear, formatReadDate } from "@/lib/display";
import { slugify } from "@/lib/slug";
import { isMovement } from "@/lib/taxonomy";
import { AppHeader } from "@/components/app-header";
import { EditionDeleteButton } from "@/components/edition-delete-button";
import { PullToRefresh } from "@/components/pull-to-refresh";

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
      {children}
    </p>
  );
}

function Cell({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1.5 text-[0.95rem] font-semibold leading-6 text-ink">
        {value}
      </div>
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

  const facetLinkClass =
    "font-medium text-ink-soft underline decoration-paper-edge underline-offset-4 transition-colors hover:text-accent hover:decoration-accent";
  const periodValue = c.period ? (
    <Link href={`/period/${slugify(c.period)}`} className={facetLinkClass}>
      {c.period}
    </Link>
  ) : (
    "—"
  );
  const primaryValue = c.primaryMovement ? (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <Link href={`/movement/${slugify(c.primaryMovement)}`} className={facetLinkClass}>
        {c.primaryMovement}
      </Link>
      {isMovement(c.primaryMovement) && (
        <Link
          href={`/lineage/${slugify(c.primaryMovement)}`}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent/80 transition-colors hover:text-accent"
        >
          Lineage ↗
        </Link>
      )}
    </span>
  ) : (
    "—"
  );
  const secondaryValue =
    c.secondaryMovements.length > 0
      ? c.secondaryMovements.map((m, i) => (
          <span key={m}>
            {i > 0 && ", "}
            <Link href={`/movement/${slugify(m)}`} className={facetLinkClass}>
              {m}
            </Link>
          </span>
        ))
      : "—";

  const editions = (
    await Promise.all(work.editionIds.map((eid) => getEdition(eid)))
  ).filter((e): e is NonNullable<typeof e> => Boolean(e));

  const read = work.reading;

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

      <main className="enter-up mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {/* Title */}
        <header className="pt-3">
          <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">
            {work.title}
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            <Link
              href={`/author/${slugify(work.author)}`}
              className={facetLinkClass}
            >
              {work.author}
            </Link>
          </p>
        </header>

        {/* Read snapshot — only shown once the work has been read. */}
        {read && (
          <div className="mt-6 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-paper-edge bg-paper-raised px-5 py-4 shadow-card">
            <div className="min-w-0">
              <Eyebrow>You read this</Eyebrow>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.5 12 2.5 2.5 4.5-5" />
                </svg>
                {read.dateRead ? `Read ${formatReadDate(read.dateRead)}` : "Read"}
              </p>
            </div>
            {read.rating != null && (
              <p className="shrink-0 text-base tracking-[0.1em] text-accent" aria-label={`${read.rating} out of 5`}>
                {"★".repeat(read.rating)}
                <span className="text-ink-faint/40">{"★".repeat(5 - read.rating)}</span>
              </p>
            )}
          </div>
        )}

        {/* Classification */}
        <section className="mt-10">
          <h2 className="font-serif text-lg tracking-[-0.01em] text-ink">
            Classification
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-paper-edge bg-paper-raised shadow-card">
            <div className="border-b border-paper-edge px-5 py-4">
              <Eyebrow>Period</Eyebrow>
              <div className="mt-1 text-[0.95rem] font-semibold text-ink">
                {periodValue}
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-paper-edge border-b border-paper-edge">
              <Cell label="Primary movement" value={primaryValue} />
              <Cell label="First published" value={formatYear(work.originalYear)} />
            </div>
            <div className="grid grid-cols-2 divide-x divide-paper-edge">
              <Cell label="Original language" value={work.language ?? "—"} />
              <Cell label="Secondary movements" value={secondaryValue} />
            </div>
            {work.notes && (
              <div className="border-t border-paper-edge">
                <Cell label="Notes" value={work.notes} />
              </div>
            )}
          </div>
        </section>

        {/* Editions */}
        {editions.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-lg tracking-[-0.01em] text-ink">
              {editions.length === 1 ? "Edition owned" : `Editions owned (${editions.length})`}
            </h2>
            <ul className="mt-4 space-y-3">
              {editions.map((edition) => {
                const isCollection = edition.workIds.length > 1;
                const title = isCollection
                  ? edition.name
                  : edition.publisher ?? edition.name;
                const subtitle = [
                  isCollection ? edition.publisher : null,
                  edition.language,
                  edition.format === "ebook" ? "Electronic edition" : "Print edition",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={edition.id} className="flex items-stretch gap-2">
                    <Link
                      href={`/edition/${edition.id}`}
                      className="group flex flex-1 items-center gap-4 rounded-2xl border border-paper-edge bg-paper-raised px-4 py-4 shadow-card transition-colors hover:border-ink-faint"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M6 4h11a1 1 0 0 1 1 1v15l-6.5-3L5 20V5a1 1 0 0 1 1-1Z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.95rem] font-bold text-ink">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-soft">
                          {subtitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden>
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </span>
                    </Link>
                    <div className="flex items-center">
                      <EditionDeleteButton
                        workId={work.id}
                        editionId={edition.id}
                        editionLabel={title}
                        shared={isCollection}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Edit action lives at the foot of the record. */}
        <div className="mt-10 flex justify-center">
          <Link
            href={`/book/${work.id}/edit`}
            className="inline-flex items-center gap-2 rounded-[0.7rem] border border-paper-edge bg-paper px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm transition-colors hover:border-ink-faint hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden>
              <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5Z" strokeLinejoin="round" />
              <path d="m12.5 5.5 2 2" strokeLinecap="round" />
            </svg>
            Edit this book
          </Link>
        </div>
      </main>
      </div>
    </PullToRefresh>
  );
}

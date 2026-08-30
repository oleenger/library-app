// Shared body for the author / period / movement / publisher collection pages.
// A server component: pure presentation over a pre-filtered list of works, using
// the same sticky AppHeader and white-card row style as the front-page library so
// a collection reads as "the library, narrowed to one facet".

import Link from "next/link";
import type { Work } from "@/lib/types";
import { formatYear, periodColor, shortPeriod } from "@/lib/display";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";

export interface CollectionViewProps {
  /** Small uppercase label above the title, e.g. "Author" or "Publisher". */
  eyebrow: string;
  /** The facet value being shown, e.g. an author name or period. */
  title: string;
  /** Works belonging to this collection, already ordered for display. */
  works: Work[];
}

export function CollectionView({ eyebrow, title, works }: CollectionViewProps) {
  const readCount = works.filter((w) => w.reading).length;

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

      <main className="enter-up mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <header className="mb-4 px-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-serif text-lg text-ink">{works.length}</span>{" "}
            {works.length === 1 ? "work" : "works"}
            {readCount > 0 && ` · ${readCount} read`}
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
          <ol className="divide-y divide-paper-edge">
            {works.map((work) => (
              <BookRow key={work.id} work={work} />
            ))}
          </ol>
        </div>
      </main>
      </div>
    </PullToRefresh>
  );
}

/** Read status check — outlined circle-check, no label. */
function ReadMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  const color = periodColor(c.period);
  const read = Boolean(work.reading);
  return (
    <li>
      <Link
        href={`/book/${work.id}`}
        className="group flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken/60 active:bg-paper-sunken sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink transition-colors group-hover:text-accent">
            {work.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-soft">{work.author}</p>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-[0.7rem] font-medium">
            <span style={{ color }}>{shortPeriod(c.period)}</span>
            {c.primaryMovement && (
              <>
                <span className="text-ink-faint/60">·</span>
                <span className="truncate text-ink-soft">{c.primaryMovement}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          <span className="text-xs tabular-nums text-ink-faint">
            {formatYear(work.originalYear)}
          </span>
          {read && (
            <span
              title={work.reading?.dateRead ? `Read ${work.reading.dateRead}` : "Read"}
            >
              <ReadMark />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

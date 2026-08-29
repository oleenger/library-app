// Shared body for the author / period / movement collection pages. A server
// component: pure presentation over a pre-filtered list of works, styled to
// match the front-page library rows so a collection reads as "the library,
// narrowed to one facet".

import Link from "next/link";
import type { Work } from "@/lib/types";
import { formatYear, periodColor } from "@/lib/display";

const SHORT_PERIOD: Record<string, string> = {
  "Classical / Antiquity": "Classical",
  "Renaissance / Early Modern": "Renaissance",
  "Enlightenment / Neoclassical": "Enlightenment",
  "Victorian / 19th century": "Victorian",
  "Modernist / early 20th century": "Modernist",
  "Postwar / late 20th century": "Postwar",
};

function shortPeriod(period: string | null): string {
  if (!period) return "Unclassified";
  return SHORT_PERIOD[period] ?? period;
}

export interface CollectionViewProps {
  /** Small uppercase label above the title, e.g. "Author" or "Movement". */
  eyebrow: string;
  /** The facet value being shown, e.g. an author name or period. */
  title: string;
  /** Accent colour for the header chip and row spines. */
  accent: string;
  /** Works belonging to this collection, already ordered for display. */
  works: Work[];
}

export function CollectionView({ eyebrow, title, accent, works }: CollectionViewProps) {
  const readCount = works.filter((w) => w.reading).length;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <nav className="flex h-14 items-center justify-between border-b border-paper-edge sm:h-16">
        <Link href="/" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <span className="text-xs text-ink-faint">Collection</span>
      </nav>

      <header className="enter-up border-b border-paper-edge py-10 sm:py-14">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          {eyebrow}
        </span>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-ink-soft">
          {works.length} {works.length === 1 ? "work" : "works"}
          {readCount > 0 && ` · ${readCount} read`}
        </p>
      </header>

      <section className="enter-up-late py-8 sm:py-10">
        <ul className="divide-y divide-paper-edge overflow-hidden rounded-2xl border border-paper-edge bg-white shadow-card">
          {works.map((work) => {
            const color = periodColor(work.classification.period);
            return (
              <li key={work.id}>
                <Link
                  href={`/book/${work.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-sunken/60 active:bg-paper-sunken sm:px-6"
                >
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-lg leading-tight text-ink transition-colors group-hover:text-accent">
                      {work.title}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{work.author}</p>
                  </div>
                  {work.reading && (
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Read
                    </span>
                  )}
                  <span className="hidden shrink-0 items-center gap-2 rounded-full border border-paper-edge bg-paper px-3 py-1 text-xs font-medium text-ink-soft sm:inline-flex">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    {shortPeriod(work.classification.period)}
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm tabular-nums text-ink-faint">
                    {formatYear(work.originalYear)}
                  </span>
                  <span
                    className="hidden shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:inline"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

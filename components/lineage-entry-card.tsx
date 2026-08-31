// A small "explore the movement lineage" entry, shown on the For-you surface.
// Server component: a link into /lineage/[slug], centred on whichever movement
// the library leans into most, framed as a learning/gap-finding prompt.

import Link from "next/link";

export function LineageEntryCard({
  movement,
  slug,
}: {
  movement: string;
  slug: string;
}) {
  return (
    <Link
      href={`/lineage/${slug}`}
      className="group mb-6 flex items-center gap-4 rounded-2xl border border-paper-edge bg-paper-raised px-5 py-4 shadow-card transition-colors hover:border-ink-faint"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="5.5" cy="18.5" r="2.2" />
          <circle cx="18.5" cy="18.5" r="2.2" />
          <path d="M12 7.2v3.3m0 0-5 5.5m5-5.5 5 5.5" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Explore lineage
        </p>
        <p className="mt-0.5 truncate text-[0.95rem] font-bold text-ink">
          Trace {movement} through literary history
        </p>
      </div>
      <span className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

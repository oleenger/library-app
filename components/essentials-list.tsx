// The movement "essential works" list. Rows link to the reader's own copy when
// owned; gaps render as plain text with a dashed marker. Owned works are further
// marked as read (filled tick) or owned-but-unread (open ring). Every work is
// shown — the list is not collapsed. Fed by lib/canon/data.ts / select.ts.

"use client";

import Link from "next/link";

/** One essential (canon) work, joined against the reader's shelf. */
export interface CanonEntry {
  title: string;
  author: string;
  /** Faithful year string from the source (e.g. "c. 400 BCE", "1818"). */
  displayYear: string;
  /** True when the reader holds this work (exact or translation-tolerant match). */
  owned: boolean;
  /** True when the reader has actually read their copy. */
  read: boolean;
  /** The owning work's id, when resolvable, so an owned essential can link out. */
  ownedId: string | null;
}

/**
 * Read = filled accent tick; owned-but-unread = an open accent ring; a gap = a
 * hollow dashed ring.
 */
function EssentialMarker({ owned, read }: { owned: boolean; read: boolean }) {
  if (read) {
    return (
      <span
        className="grid h-[1.05rem] w-[1.05rem] shrink-0 place-items-center rounded-full bg-accent text-paper-raised"
        title="Read"
        aria-label="Read"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12 5 5 9-11" />
        </svg>
      </span>
    );
  }
  if (owned) {
    return (
      <span
        className="h-[1.05rem] w-[1.05rem] shrink-0 rounded-full border-2 border-accent bg-transparent"
        title="In your library, unread"
        aria-label="In your library, unread"
      />
    );
  }
  return (
    <span
      className="h-[0.9rem] w-[0.9rem] shrink-0 rounded-full border border-dashed border-ink-faint/60"
      title="Gap — not in your library"
      aria-hidden
    />
  );
}

/** One essential work: a book-page link when owned, plain text when a gap. */
function EssentialRow({ work }: { work: CanonEntry }) {
  const body = (
    <>
      <span className="mt-[3px]">
        <EssentialMarker owned={work.owned} read={work.read} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`font-serif text-[0.95rem] transition-colors ${
            work.owned ? "font-bold text-ink group-hover:text-accent" : "text-ink-soft"
          }`}
        >
          {work.title}
        </span>{" "}
        <span className="text-sm text-ink-faint">{work.author}</span>
        {work.owned && !work.read && (
          <span className="ml-2 align-middle text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            unread
          </span>
        )}
      </span>
      <span className="shrink-0 text-sm tabular-nums text-ink-faint">{work.displayYear}</span>
    </>
  );

  const className = "flex items-start gap-3 py-3";
  return work.ownedId ? (
    <Link href={`/book/${work.ownedId}`} className={`group ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The movement's essential works with owned/read coverage — the heart of the view. */
export function EssentialsList({
  works,
  owned,
  total,
  read,
  blurb,
}: {
  works: CanonEntry[];
  owned: number;
  total: number;
  /** How many of the owned works the reader has read. */
  read?: number;
  blurb?: string;
}) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-4xl leading-none tabular-nums text-accent">{pct}%</span>
        <p className="text-sm text-ink-soft">
          of the essentials —{" "}
          <span className="font-medium text-ink tabular-nums">
            {owned} of {total}
          </span>{" "}
          in your library
          {read != null && (
            <>
              , <span className="font-medium text-ink tabular-nums">{read}</span> read
            </>
          )}
        </p>
      </div>

      {blurb && <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">{blurb}</p>}

      <ol className="mt-4 divide-y divide-paper-edge">
        {works.map((w) => (
          <li key={`${w.title}|${w.author}|${w.displayYear}`}>
            <EssentialRow work={w} />
          </li>
        ))}
      </ol>
    </div>
  );
}

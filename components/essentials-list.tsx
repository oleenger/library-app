// The movement "essential works" list — a client component so long canons
// (up to ~50 works) collapse to a readable head with a show-all toggle. Rows
// link to the reader's own copy when owned; gaps render as plain text with a
// dashed marker. Fed by lib/canon/data.ts via the lineage route.

"use client";

import Link from "next/link";
import { useState } from "react";

/** One essential (canon) work, joined against the reader's shelf. */
export interface CanonEntry {
  title: string;
  author: string;
  /** Faithful year string from the source (e.g. "c. 400 BCE", "1818"). */
  displayYear: string;
  /** True when the reader holds this work (exact or translation-tolerant match). */
  owned: boolean;
  /** The owning work's id, when resolvable, so an owned essential can link out. */
  ownedId: string | null;
}

/** Owned = filled accent tick; a gap = a hollow dashed ring. */
function EssentialMarker({ owned }: { owned: boolean }) {
  if (owned) {
    return (
      <span className="grid h-[1.05rem] w-[1.05rem] shrink-0 place-items-center rounded-full bg-accent text-paper-raised">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12 5 5 9-11" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="h-[0.9rem] w-[0.9rem] shrink-0 rounded-full border border-dashed border-ink-faint/60"
      aria-hidden
    />
  );
}

/** One essential work: a book-page link when owned, plain text when a gap. */
function EssentialRow({ work }: { work: CanonEntry }) {
  const body = (
    <>
      <span className="mt-[3px]">
        <EssentialMarker owned={work.owned} />
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

/** The movement's essential works with a coverage stat — the heart of the view. */
export function EssentialsList({
  works,
  owned,
  total,
  blurb,
  initial = 8,
}: {
  works: CanonEntry[];
  owned: number;
  total: number;
  blurb?: string;
  /** How many rows to show before the "show all" toggle. */
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const collapsible = works.length > initial;
  const shown = expanded || !collapsible ? works : works.slice(0, initial);
  const hidden = works.length - shown.length;

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
        </p>
      </div>

      {blurb && <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">{blurb}</p>}

      <ol className="mt-4 divide-y divide-paper-edge">
        {shown.map((w) => (
          <li key={`${w.title}|${w.author}|${w.displayYear}`}>
            <EssentialRow work={w} />
          </li>
        ))}
      </ol>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-ink"
        >
          {expanded ? "Show fewer" : `Show all ${total} — ${hidden} more`}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}

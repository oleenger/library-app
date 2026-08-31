"use client";

// Expandable list of a movement's books on the lineage node view. Shows the
// first few and reveals the rest in place — the centred card stays compact but
// every held work is one tap away, without leaving the lineage.

import Link from "next/link";
import { useState } from "react";
import { formatYear } from "@/lib/display";
import type { LineageExample } from "@/components/lineage-view";

/** How many titles to show before the "See all" expander. */
const INITIAL = 5;

export function MovementBooks({ books }: { books: LineageExample[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = books.length > INITIAL;
  const shown = expanded ? books : books.slice(0, INITIAL);

  return (
    <div className="mt-4">
      <ol className="divide-y divide-paper-edge">
        {shown.map((ex) => (
          <li key={ex.id}>
            <Link
              href={`/book/${ex.id}`}
              className="group flex items-baseline justify-between gap-3 py-3"
            >
              <span className="min-w-0 truncate">
                <span className="font-serif text-[0.95rem] font-bold text-ink transition-colors group-hover:text-accent">
                  {ex.title}
                </span>{" "}
                <span className="text-sm text-ink-soft">{ex.author}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                {formatYear(ex.year)}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-paper-edge bg-paper px-4 py-2 text-sm font-semibold text-ink-soft shadow-sm transition-colors hover:border-ink-faint hover:text-accent"
        >
          {expanded ? "Show fewer" : `See all ${books.length} books`}
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

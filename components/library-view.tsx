"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Work } from "@/lib/types";
import { formatYear, periodDot } from "@/lib/display";

interface Props {
  works: Work[];
  periods: string[];
  movements: string[];
}

export function LibraryView({ works, periods, movements }: Props) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<string>("");
  const [movement, setMovement] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((w) => {
      if (period && w.classification.period !== period) return false;
      if (movement) {
        const inMovements =
          w.classification.primaryMovement === movement ||
          w.classification.secondaryMovements.includes(movement);
        if (!inMovements) return false;
      }
      if (q) {
        const haystack = `${w.title} ${w.author}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [works, query, period, movement]);

  const hasFilters = Boolean(query || period || movement);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author…"
          aria-label="Search by title or author"
          className="w-full rounded-md border border-paper-edge bg-paper-raised px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-ink-soft focus:outline-none sm:max-w-xs"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Filter by period"
          className="rounded-md border border-paper-edge bg-paper-raised px-3 py-2 font-sans text-sm text-ink focus:border-ink-soft focus:outline-none"
        >
          <option value="">All periods</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={movement}
          onChange={(e) => setMovement(e.target.value)}
          aria-label="Filter by movement"
          className="rounded-md border border-paper-edge bg-paper-raised px-3 py-2 font-sans text-sm text-ink focus:border-ink-soft focus:outline-none"
        >
          <option value="">All movements</option>
          {movements.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPeriod("");
              setMovement("");
            }}
            className="font-sans text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-4 font-sans text-xs text-ink-faint" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "work" : "works"}
        {hasFilters ? " matching" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center font-serif text-lg text-ink-soft">
          No works match these filters.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-paper-edge">
                <Th>Title</Th>
                <Th>Author</Th>
                <Th>Period</Th>
                <Th>Movement</Th>
                <Th className="text-right">Year</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <BookRow key={w.id} work={w} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`py-2 pr-4 font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  return (
    <tr className="group border-b border-paper-edge transition-colors hover:bg-paper-raised">
      <td className="py-2.5 pr-4 align-top">
        <Link
          href={`/book/${work.id}`}
          className="font-serif text-base text-ink hover:underline hover:underline-offset-2"
        >
          {work.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4 align-top font-sans text-sm text-ink-soft">
        {work.author}
      </td>
      <td className="py-2.5 pr-4 align-top">
        <span className="flex items-center gap-2 font-sans text-sm text-ink-soft">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${periodDot(c.period)}`}
            aria-hidden
          />
          {c.period ?? "Unclassified"}
        </span>
      </td>
      <td className="py-2.5 pr-4 align-top font-sans text-sm text-ink-soft">
        {c.primaryMovement ?? "—"}
      </td>
      <td className="py-2.5 align-top text-right font-sans text-sm tabular-nums text-ink-faint">
        {formatYear(work.originalYear)}
      </td>
    </tr>
  );
}

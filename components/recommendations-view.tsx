"use client";

import { useMemo, useState } from "react";
import { formatYear, periodColor } from "@/lib/display";
import type { CanonPathView, CanonWorkView } from "@/lib/canon/select";
import { LineageEntryCard } from "@/components/lineage-entry-card";
import { slugify } from "@/lib/slug";

/**
 * Reading Paths: one card per movement the reader favours, drawn from the static
 * curated canon (lib/canon/paths.ts) and joined to live holdings server-side.
 * Each card reads two ways — as an ordered reading path (owned books inline as
 * green waypoints, missing works as dashed numbered gaps, each step with a
 * rationale) or as the flat by-importance ranking. Nothing here is generated:
 * order and notes are hand-curated.
 */
export function RecommendationsView({
  paths,
  workCount,
  initialMovement,
}: {
  paths: CanonPathView[];
  workCount: number;
  initialMovement?: string | null;
}) {
  const preselect =
    initialMovement && paths.some((p) => p.movement === initialMovement)
      ? initialMovement
      : paths[0]?.movement ?? "";
  const [selected, setSelected] = useState<string>(preselect);

  if (workCount < 5) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="font-serif text-2xl leading-tight sm:text-3xl">Canon</h2>
          <p className="mt-1 text-sm text-ink-soft">
            The canonical works behind the movements your shelves lean into.
          </p>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add at least 5 books first.
        </p>
      </section>
    );
  }

  const held = paths.filter((p) => p.holdings > 0);
  const rest = paths.filter((p) => p.holdings === 0);
  const current = paths.find((p) => p.movement === selected) ?? paths[0] ?? null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl leading-tight sm:text-3xl">Canon</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The canonical works of a movement — read them as an ordered reading path
          or ranked by importance. Books you own appear as waypoints.
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="rounded-2xl border border-paper-edge bg-paper p-8 text-center shadow-card">
          <p className="text-[0.95rem] text-ink-soft">No curated paths available.</p>
        </div>
      ) : (
        <>
          <MovementMenu
            held={held}
            rest={rest}
            value={current?.movement ?? ""}
            onChange={setSelected}
          />

          {current && (
            <LineageEntryCard
              movement={current.movement}
              slug={slugify(current.movement)}
            />
          )}

          {current && <CanonArea key={current.movement} path={current} />}

          <p className="text-xs text-ink-faint">
            Ordering and notes are curated, not generated. Owned books are matched
            by title or by author and year, so translated editions still count.
          </p>
        </>
      )}
    </section>
  );
}

/** Top menu for choosing which movement's path to read. Held movements first. */
function MovementMenu({
  held,
  rest,
  value,
  onChange,
}: {
  held: CanonPathView[];
  rest: CanonPathView[];
  value: string;
  onChange: (movement: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
        Choose a movement
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-paper-edge bg-paper py-3 pl-4 pr-10 font-serif text-base text-ink shadow-sm transition hover:border-ink-faint focus:border-accent focus:outline-none"
        >
          {held.length > 0 && (
            <optgroup label="On your shelves">
              {held.map((p) => (
                <option key={p.movement} value={p.movement}>
                  {p.movement} — {p.ownedCount}/{p.total} owned
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={held.length > 0 ? "More movements" : "All movements"}>
            {rest.map((p) => (
              <option key={p.movement} value={p.movement}>
                {p.movement}
              </option>
            ))}
          </optgroup>
        </select>
        <span
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

type AreaView = "path" | "importance";

/** A single movement's path, switchable between path and importance views. */
function CanonArea({ path }: { path: CanonPathView }) {
  const [view, setView] = useState<AreaView>("path");

  const pct = path.total > 0 ? Math.round((path.ownedCount / path.total) * 100) : 0;
  const color = periodColor(path.period);

  // Path view keeps the curated reading order; importance view re-ranks a copy.
  const byImportance = useMemo(
    () => [...path.works].sort((a, b) => b.importance - a.importance),
    [path.works],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
      <div className="border-b border-paper-edge px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-serif text-lg text-ink">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <span className="truncate">{path.movement}</span>
            </h3>
            <p className="mt-0.5 text-xs text-ink-soft">{path.blurb}</p>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
            {path.ownedCount} of {path.total} owned · {path.eraLabel}
          </span>
        </div>
      </div>

      {view === "path" ? (
        <ol className="px-5 py-5 sm:px-6">
          {path.works.map((item, i) => (
            <PathStep
              key={item.title + item.author}
              item={item}
              position={i + 1}
              isLast={i === path.works.length - 1}
            />
          ))}
        </ol>
      ) : (
        <ol className="divide-y divide-paper-edge">
          {byImportance.map((item) => (
            <ImportanceRow key={item.title + item.author} item={item} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Segmented path/importance switch for one area. */
function ViewToggle({ view, onChange }: { view: AreaView; onChange: (v: AreaView) => void }) {
  const opts: { id: AreaView; label: string }[] = [
    { id: "path", label: "As a path" },
    { id: "importance", label: "By importance" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-paper-edge bg-paper-sunken p-0.5" role="tablist">
      {opts.map((o) => {
        const active = o.id === view;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`rounded-md px-3 py-1.5 text-[0.75rem] font-semibold transition ${
              active ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** One step down the reading-path spine: owned waypoint or numbered gap. */
function PathStep({
  item,
  position,
  isLast,
}: {
  item: CanonWorkView;
  position: number;
  isLast: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <span className="absolute bottom-1 left-4 top-9 w-px -translate-x-1/2 bg-paper-edge" aria-hidden />
      )}
      <StatusDisc owned={item.owned} position={position} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="min-w-0 truncate font-serif text-[0.95rem] font-bold leading-tight text-ink">
            {item.title}
          </h4>
          <span className="shrink-0 text-xs tabular-nums text-ink-faint">
            {formatYear(item.year)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{item.author}</p>
        <p className="mt-1.5 text-[0.7rem] font-medium">
          {item.owned ? (
            <span className="text-emerald-600">In your library</span>
          ) : (
            <span className="text-ink-faint">Gap · reading position {position}</span>
          )}
        </p>
        {item.note && (
          <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">{item.note}</p>
        )}
      </div>
    </li>
  );
}

/** The status disc anchoring a path step: green check when owned, else the gap's reading position. */
function StatusDisc({ owned, position }: { owned: boolean; position: number }) {
  if (owned) {
    return (
      <span
        className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
        title="In your library"
        aria-label="In your library"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-ink-faint bg-paper font-serif text-sm tabular-nums text-ink-soft"
      title={`Gap — reading position ${position}`}
      aria-label={`Gap, reading position ${position}`}
    >
      {position}
    </span>
  );
}

/** A by-importance row: importance badge for gaps, green check for owned. */
function ImportanceRow({ item }: { item: CanonWorkView }) {
  // Fall back to the path note until an importance-specific rationale is curated.
  const reason = item.why ?? item.note;
  return (
    <li className="flex items-stretch gap-3 px-4 py-3 sm:px-5">
      {item.owned ? <OwnedBadge /> : <ScoreBadge value={item.importance} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="min-w-0 truncate font-serif text-[0.95rem] font-bold leading-tight text-ink">
            {item.title}
          </h4>
          <span className="shrink-0 text-xs tabular-nums text-ink-faint">
            {formatYear(item.year)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{item.author}</p>
        {item.owned && (
          <p className="mt-1.5 text-[0.7rem] font-medium text-emerald-600">In your library</p>
        )}
        {reason && (
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">{reason}</p>
        )}
      </div>
    </li>
  );
}

/** Owned marker for the by-importance view — mirrors ScoreBadge's footprint. */
function OwnedBadge() {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white"
      title="In your library"
      aria-label="In your library"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Importance 1..10, shown as a weighted numeric badge (10 = cornerstone). */
function ScoreBadge({ value }: { value: number }) {
  const tone =
    value >= 9
      ? "bg-ink text-canvas"
      : value >= 7
        ? "bg-accent/12 text-accent ring-1 ring-inset ring-accent/25"
        : "bg-paper-sunken text-ink-soft ring-1 ring-inset ring-paper-edge";
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-serif text-base tabular-nums ${tone}`}
      title={`Importance ${value}/10`}
      aria-label={`Importance ${value} out of 10`}
    >
      {value}
    </span>
  );
}

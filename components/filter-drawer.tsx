"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Work } from "@/lib/types";
import { periodColor, shortPeriod } from "@/lib/display";
import {
  facetOptions,
  hasActiveFilters,
  type FacetKey,
  type FacetOption,
  type Filters,
} from "@/lib/facets";

interface Props {
  open: boolean;
  onClose: () => void;
  works: Work[];
  filters: Filters;
  onToggle: (key: FacetKey, value: string) => void;
  onClear: () => void;
}

export function FilterDrawer({
  open,
  onClose,
  works,
  filters,
  onToggle,
  onClear,
}: Props) {
  const periods = useMemo(
    () => facetOptions(works, filters, "period"),
    [works, filters],
  );
  const movements = useMemo(
    () => facetOptions(works, filters, "movement"),
    [works, filters],
  );
  const authors = useMemo(
    () => facetOptions(works, filters, "author", 15),
    [works, filters],
  );
  const active = hasActiveFilters(filters);

  // Rendered through a portal to <body> so it stays viewport-fixed: the library
  // list lives under a subtree whose `enter-up` / pull-to-refresh transforms
  // would otherwise make an ancestor the containing block for this
  // `position: fixed` overlay, and its off-canvas pane would extend the
  // document's horizontal scroll width. Mirrors the Reads-page stats pane.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Selecting a facet applies it and closes the pane so the narrowed content is
  // visible immediately — no manual close needed.
  function handleToggle(key: FacetKey, value: string) {
    onToggle(key, value);
    onClose();
  }

  const overlay = (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Right pane */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filter catalogue"
        className={`absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-canvas shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Filter
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-24 pt-2">
          <FacetSection
            title="Periods"
            options={periods}
            selected={filters.period}
            onToggle={(v) => handleToggle("period", v)}
            colorFor={(v) => periodColor(v)}
            labelFor={(v) => shortPeriod(v)}
          />
          <FacetSection
            title="Movements"
            options={movements}
            selected={filters.movement}
            onToggle={(v) => handleToggle("movement", v)}
          />
          <FacetSection
            title="Authors"
            options={authors}
            selected={filters.author}
            onToggle={(v) => handleToggle("author", v)}
          />
        </div>

        {active && (
          <div className="border-t border-paper-edge bg-canvas px-6 py-4">
            <button
              type="button"
              onClick={onClear}
              className="w-full rounded-[0.7rem] border border-paper-edge bg-paper py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
            >
              Clear all filters
            </button>
          </div>
        )}
      </aside>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

function FacetSection({
  title,
  options,
  selected,
  onToggle,
  colorFor,
  labelFor,
}: {
  title: string;
  options: FacetOption[];
  selected: string;
  onToggle: (value: string) => void;
  colorFor?: (value: string) => string;
  labelFor?: (value: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {title}
      </h2>
      <ul className="divide-y divide-paper-edge">
        {options.map((o) => {
          const isSel = o.value === selected;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className="flex w-full items-center gap-3 py-3.5 text-left"
              >
                {colorFor && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorFor(o.value) }}
                    aria-hidden
                  />
                )}
                <span
                  className={`min-w-0 flex-1 truncate text-[0.95rem] ${
                    isSel ? "font-semibold text-ink" : "text-ink"
                  }`}
                >
                  {labelFor ? labelFor(o.value) : o.value}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-faint">
                  {o.count}
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
                    isSel
                      ? "border-accent bg-accent text-white"
                      : "border-paper-edge bg-paper"
                  }`}
                  aria-hidden
                >
                  {isSel && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-11" />
                    </svg>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

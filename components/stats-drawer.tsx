"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReadsPageData } from "@/lib/insights";
import { periodColor, shortPeriod } from "@/lib/display";
import { slugify } from "@/lib/slug";

interface Props {
  open: boolean;
  onClose: () => void;
  data: ReadsPageData;
}

/**
 * Right slide-in pane holding the reading breakdowns (by year / period /
 * movement). Mirrors the front-page filter pane so the two surfaces feel like
 * one system.
 *
 * Rendered through a portal to <body> so it stays viewport-fixed: the reads
 * list lives inside `<main className="enter-up">`, whose `animation: … both`
 * leaves a lingering `transform` that would otherwise make `main` the
 * containing block for this `position: fixed` overlay.
 */
export function StatsDrawer({ open, onClose, data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const maxYear = Math.max(...data.byYear.map((y) => y.count), 1);
  const maxMovement = Math.max(...data.byMovement.map((m) => m.count), 1);

  const overlay = (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Reading statistics"
        className={`absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-canvas shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Statistics
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-24 pt-4">
          {/* Reads by year */}
          <Section title="By year">
            <ul className="space-y-2.5">
              {data.byYear.map((y) => (
                <li key={y.year} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-xs tabular-nums text-ink-soft">
                    {y.year}
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-accent"
                      style={{ width: `${(y.count / maxYear) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                    {y.count}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Read vs owned, per period */}
          <Section title="By period">
            <ul className="space-y-2.5">
              {data.byPeriod.map((p) => {
                const pct = p.total > 0 ? (p.read / p.total) * 100 : 0;
                const color = periodColor(p.period);
                return (
                  <li key={p.period} className="flex items-center gap-3">
                    <Link
                      href={`/period/${slugify(p.period)}`}
                      className="w-24 shrink-0 truncate text-xs text-ink-soft transition-colors hover:text-accent"
                    >
                      {shortPeriod(p.period)}
                    </Link>
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                      {p.read}/{p.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Reads by movement */}
          {data.byMovement.length > 0 && (
            <Section title="By movement">
              <ul className="space-y-2.5">
                {data.byMovement.slice(0, 12).map((m) => (
                  <li key={m.movement} className="flex items-center gap-3">
                    <Link
                      href={`/movement/${slugify(m.movement)}`}
                      className="w-28 shrink-0 truncate text-xs text-ink-soft transition-colors hover:text-accent"
                      title={m.movement}
                    >
                      {m.movement}
                    </Link>
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-ink/70"
                        style={{ width: `${(m.count / maxMovement) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                      {m.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

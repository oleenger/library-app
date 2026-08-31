// Movement lineage view — the banded up/centre/down map from the proposal.
//
// A server component: pure presentation over a view model assembled in the route.
// Chips are links that re-centre the whole view on another movement (a full
// server render of /lineage/[slug]). Zero-holding movements render faded and
// dashed — an in-context "you own nothing here yet" learning prompt.

import Link from "next/link";
import type { Period } from "@/lib/taxonomy";
import { periodColor } from "@/lib/display";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { MovementBooks } from "@/components/movement-books";

/** A related movement rendered as a tappable chip. */
export interface LineageChip {
  movement: string;
  slug: string;
  period: Period | null;
  count: number;
}

/** An example title drawn from the user's own library. */
export interface LineageExample {
  id: string;
  title: string;
  author: string;
  year: number | null;
}

export interface LineageViewProps {
  movement: string;
  period: Period | null;
  eraLabel: string;
  note?: string;
  count: number;
  examples: LineageExample[];
  /** Whether a curated canon path exists for this movement (drives the link). */
  hasCanon?: boolean;
  /** Curated-canon works the reader owns / total, shown on the "Read the canon" card. */
  canonOwned?: number;
  canonTotal?: number;
  reactedAgainst: LineageChip[];
  ledTo: LineageChip[];
  alongside: LineageChip[];
}

/** A small coloured disc keyed to a movement's home-period colour. */
export function Dot({ period, className = "" }: { period: Period | null; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: periodColor(period) }}
      aria-hidden
    />
  );
}

/** A related movement as a tappable pill; faded + dashed when the user owns none. */
export function MovementChip({ chip }: { chip: LineageChip }) {
  const empty = chip.count === 0;
  return (
    <Link
      href={`/lineage/${chip.slug}`}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        empty
          ? "border-dashed border-paper-edge bg-transparent text-ink-faint hover:border-ink-faint hover:text-ink-soft"
          : "border-paper-edge bg-paper text-ink shadow-sm hover:border-ink-faint hover:text-accent"
      }`}
    >
      <Dot period={chip.period} className={`h-2 w-2 ${empty ? "opacity-40" : ""}`} />
      <span className="truncate">{chip.movement}</span>
      <span className={`tabular-nums ${empty ? "text-ink-faint/70" : "text-ink-faint"}`}>
        {chip.count}
      </span>
    </Link>
  );
}

/** Section eyebrow, e.g. "GREW OUT OF / REACTED AGAINST". */
function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
      {children}
    </p>
  );
}

/** A thin vertical rule linking the bands together. */
function Connector() {
  return <div className="mx-auto my-3 h-6 w-px bg-paper-edge" aria-hidden />;
}

/** A row of chips, centred, with an eyebrow. Renders nothing when empty. */
function ChipBand({ label, chips }: { label: string; chips: LineageChip[] }) {
  if (chips.length === 0) return null;
  return (
    <section>
      <BandLabel>{label}</BandLabel>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5">
        {chips.map((c) => (
          <MovementChip key={c.slug} chip={c} />
        ))}
      </div>
    </section>
  );
}

export function LineageView({
  movement,
  period,
  eraLabel,
  note,
  count,
  examples,
  hasCanon,
  canonOwned,
  canonTotal,
  reactedAgainst,
  ledTo,
  alongside,
}: LineageViewProps) {
  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <header className="mb-6 px-1">
            <Link
              href="/lineage"
              className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
              Movement lineage
            </Link>
            <h1 className="mt-1 font-serif text-4xl leading-tight tracking-[-0.02em] text-ink">
              {movement}
            </h1>
          </header>

          {/* Upstream */}
          {reactedAgainst.length > 0 && (
            <>
              <ChipBand label="Grew out of / reacted against" chips={reactedAgainst} />
              <Connector />
            </>
          )}

          {/* Centred movement */}
          <section className="overflow-hidden rounded-2xl border-2 border-accent/70 bg-paper-raised p-6 shadow-card sm:p-7">
            <div className="flex items-start gap-3">
              <Dot period={period} className="mt-2.5 h-3 w-3" />
              <div className="min-w-0">
                <h2 className="font-serif text-3xl leading-tight tracking-[-0.02em] text-ink">
                  {movement}
                </h2>
                {eraLabel && (
                  <p className="mt-0.5 text-sm text-ink-soft">{eraLabel}</p>
                )}
              </div>
            </div>

            {note && (
              <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">{note}</p>
            )}

            <hr className="my-6 border-paper-edge" />

            <p className="text-sm text-ink-soft">
              <span className="font-serif text-2xl text-accent">{count}</span>{" "}
              {count === 1 ? "work" : "works"} in your library
            </p>

            {examples.length > 0 ? (
              <MovementBooks books={examples} />
            ) : (
              <p className="mt-3 text-sm italic text-ink-faint">
                Nothing in your library under this movement yet.
              </p>
            )}

            {hasCanon && (
              <Link
                href={`/recommendations?movement=${encodeURIComponent(movement)}`}
                className="group mt-5 flex items-center gap-3 rounded-xl border border-paper-edge bg-paper px-4 py-3 shadow-sm transition-colors hover:border-ink-faint"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
                    <path d="M10 5a1 1 0 0 1 1-1h3.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11a1 1 0 0 1-1-1V5Z" />
                    <path d="m16.5 5 2.9.8a1 1 0 0 1 .7 1.22l-3 11.3" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    Read the canon
                  </p>
                  <p className="mt-0.5 truncate text-[0.9rem] font-bold text-ink">
                    The essential works of {movement}
                  </p>
                  {canonTotal ? (
                    <p className="mt-0.5 text-[0.72rem] font-medium text-ink-faint tabular-nums">
                      {canonOwned} of {canonTotal} owned
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
              </Link>
            )}
          </section>

          {/* Downstream */}
          {ledTo.length > 0 && (
            <>
              <Connector />
              <ChipBand label="Led to" chips={ledTo} />
            </>
          )}

          {/* Contemporaries */}
          {alongside.length > 0 && (
            <section className="mt-8 rounded-2xl bg-paper-sunken/60 p-5 sm:p-6">
              <BandLabel>Alongside — contemporaries</BandLabel>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                {alongside.map((c) => (
                  <MovementChip key={c.slug} chip={c} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </PullToRefresh>
  );
}

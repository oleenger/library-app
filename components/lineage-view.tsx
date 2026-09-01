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
import { EssentialsList, type CanonEntry } from "@/components/essentials-list";

export type { CanonEntry };

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
  /** Whether this movement has essential works in the reference data. */
  hasCanon?: boolean;
  /** Whether a curated, ordered reading path exists (drives the guided-path link). */
  hasGuidedPath?: boolean;
  /** Short subtitle for the canon, shown above the essentials list. */
  canonBlurb?: string;
  /** The movement's essential works, each marked owned or a gap. */
  canonWorks?: CanonEntry[];
  /** Curated-canon works the reader owns / total, for the coverage stat. */
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
  hasGuidedPath,
  canonBlurb,
  canonWorks,
  canonOwned,
  canonTotal,
  reactedAgainst,
  ledTo,
  alongside,
}: LineageViewProps) {
  const showEssentials = hasCanon && canonWorks && canonWorks.length > 0;
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

            {showEssentials ? (
              <>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  The essential works
                </p>
                <div className="mt-3">
                  <EssentialsList
                    works={canonWorks}
                    owned={canonOwned ?? 0}
                    total={canonTotal ?? 0}
                    blurb={canonBlurb}
                  />
                </div>
                {hasGuidedPath && (
                  <Link
                    href={`/recommendations?movement=${encodeURIComponent(movement)}`}
                    className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-ink"
                  >
                    Read them in order — the guided path
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Link>
                )}
              </>
            ) : (
              <>
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
              </>
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

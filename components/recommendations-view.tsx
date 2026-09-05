"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { periodColor } from "@/lib/display";
import type { MovementDetailView, ReadingStepView } from "@/lib/canon/select";
import { MovementChip } from "@/components/lineage-view";
import { EssentialsList } from "@/components/essentials-list";
import { CanonOwnLink } from "@/components/canon-own-link";
import type { LinkCandidate } from "@/components/link-edition-button";

/**
 * Canon: the single per-movement detail surface. Pick a movement (the reader's
 * most-held first) and read its description, its curated reading path, its broad
 * essentials, and its lineage. Nothing here is generated — the reading order,
 * essentials and notes are all curated static data joined to live holdings.
 */
export function RecommendationsView({
  details,
  workCount,
  initialMovement,
  candidates,
}: {
  details: MovementDetailView[];
  workCount: number;
  initialMovement?: string | null;
  candidates: LinkCandidate[];
}) {
  const preselect =
    initialMovement && details.some((d) => d.movement === initialMovement)
      ? initialMovement
      : details[0]?.movement ?? "";
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

  const held = details.filter((d) => !d.isPreMovement && d.holdings > 0);
  const rest = details.filter((d) => !d.isPreMovement && d.holdings === 0);
  const pre = details.find((d) => d.isPreMovement) ?? null;
  const current = details.find((d) => d.movement === selected) ?? details[0] ?? null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl leading-tight sm:text-3xl">Canon</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Any movement — its story, a guided reading path, and the essential works.
          Books you own appear as waypoints, filled in once you&apos;ve read them.
        </p>
      </div>

      {details.length === 0 ? (
        <div className="rounded-2xl border border-paper-edge bg-paper p-8 text-center shadow-card">
          <p className="text-[0.95rem] text-ink-soft">No movements available.</p>
        </div>
      ) : (
        <>
          <MovementMenu pre={pre} held={held} rest={rest} value={current?.movement ?? ""} onChange={setSelected} />

          {current && <MovementDetail key={current.movement} detail={current} candidates={candidates} />}

          <p className="text-xs text-ink-faint">
            Reading order, essentials and notes are curated, not generated. Owned
            books are matched by title or by author and year, so translated
            editions still count.
          </p>
        </>
      )}
    </section>
  );
}

/** Top menu for choosing which movement to read. Foundations, then held, then rest. */
function MovementMenu({
  pre,
  held,
  rest,
  value,
  onChange,
}: {
  pre: MovementDetailView | null;
  held: MovementDetailView[];
  rest: MovementDetailView[];
  value: string;
  onChange: (movement: string) => void;
}) {
  const label = (d: MovementDetailView) =>
    d.hasEssentials ? `${d.movement} — ${d.essentialsOwned}/${d.essentialsTotal} owned` : d.movement;
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
          {pre && (
            <optgroup label="Foundations">
              <option value={pre.movement}>{label(pre)}</option>
            </optgroup>
          )}
          {held.length > 0 && (
            <optgroup label="On your shelves">
              {held.map((d) => (
                <option key={d.movement} value={d.movement}>
                  {label(d)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={held.length > 0 ? "More movements" : "All movements"}>
            {rest.map((d) => (
              <option key={d.movement} value={d.movement}>
                {d.movement}
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

type AreaView = "path" | "essentials";

/**
 * One movement's full detail: description, then its reading path / essentials
 * (whichever exist), then its lineage — what it grew out of, led to, stood beside.
 */
function MovementDetail({ detail, candidates }: { detail: MovementDetailView; candidates: LinkCandidate[] }) {
  const color = periodColor(detail.period);
  // Essentials first — it's the default view; the reading path tab appears
  // whenever a curated path exists (foundations included).
  const views: AreaView[] = [
    ...(detail.hasEssentials ? (["essentials"] as const) : []),
    ...(detail.hasPath ? (["path"] as const) : []),
  ];
  const [view, setView] = useState<AreaView>(views[0] ?? "essentials");
  const active = views.includes(view) ? view : views[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-paper-edge bg-paper-raised p-5 shadow-card sm:p-6">
        <h3 className="flex items-center gap-2 font-serif text-xl text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          <span className="min-w-0 truncate">{detail.movement}</span>
        </h3>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-ink-faint">
          {detail.eraLabel}
        </p>
        {detail.note && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">{detail.note}</p>
        )}
      </div>

      {views.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
          {views.length > 1 && (
            <div className="border-b border-paper-edge px-5 py-3 sm:px-6">
              <ViewToggle view={active} onChange={setView} />
            </div>
          )}
          <div className="px-5 py-5 sm:px-6">
            {active === "path" ? (
              <ReadingPath steps={detail.readingPath} owned={detail.pathOwned} read={detail.pathRead} total={detail.pathTotal} candidates={candidates} />
            ) : (
              <EssentialsList
                works={detail.essentials}
                owned={detail.essentialsOwned}
                read={detail.essentialsRead}
                total={detail.essentialsTotal}
                candidates={candidates}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-paper-edge bg-paper p-6 shadow-card">
          {detail.holdings > 0 ? (
            <p className="text-sm text-ink-soft">
              <span className="font-serif text-2xl text-accent">{detail.holdings}</span>{" "}
              {detail.holdings === 1 ? "work" : "works"} in your library. No curated
              canon for this movement yet.
            </p>
          ) : (
            <p className="text-sm italic text-ink-faint">
              Nothing in your library under this movement yet, and no curated canon
              for it.
            </p>
          )}
        </div>
      )}

      <Relations detail={detail} />
    </div>
  );
}

/** Segmented reading-path / essentials switch. */
function ViewToggle({ view, onChange }: { view: AreaView; onChange: (v: AreaView) => void }) {
  const opts: { id: AreaView; label: string }[] = [
    { id: "essentials", label: "Essentials" },
    { id: "path", label: "Reading path" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-paper-edge bg-paper-sunken p-0.5" role="tablist">
      {opts.map((o) => {
        const isActive = o.id === view;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(o.id)}
            className={`rounded-md px-3 py-1.5 text-[0.75rem] font-semibold transition ${
              isActive ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The curated reading path as an ordered spine of waypoints and gaps. */
function ReadingPath({ steps, owned, read, total, candidates }: { steps: ReadingStepView[]; owned: number; read: number; total: number; candidates: LinkCandidate[] }) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
          {owned} of {total} owned · {read} read
        </span>
      </div>
      <ol>
        {steps.map((step, i) => (
          <PathStep key={`${step.title}|${step.author}`} step={step} isLast={i === steps.length - 1} candidates={candidates} />
        ))}
      </ol>
    </div>
  );
}

/** One step down the reading-path spine: owned waypoint or numbered gap. */
function PathStep({ step, isLast, candidates }: { step: ReadingStepView; isLast: boolean; candidates: LinkCandidate[] }) {
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h4
          className={`min-w-0 truncate font-serif text-[0.95rem] font-bold leading-tight ${
            step.owned ? "text-ink group-hover:text-accent" : "text-ink"
          }`}
        >
          {step.title}
        </h4>
        <span className="shrink-0 text-xs tabular-nums text-ink-faint">{step.displayYear}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-ink-soft">{step.author}</p>
      <p className="mt-1.5 text-[0.7rem] font-medium">
        {step.read ? (
          <span className="text-emerald-600">Read</span>
        ) : step.owned ? (
          <span className="text-emerald-600/80">In your library · unread</span>
        ) : (
          <span className="text-ink-faint">Gap · reading position {step.position}</span>
        )}
      </p>
      {step.note && (
        <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">{step.note}</p>
      )}
    </>
  );
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <span className="absolute bottom-1 left-4 top-9 w-px -translate-x-1/2 bg-paper-edge" aria-hidden />
      )}
      <StatusDisc owned={step.owned} read={step.read} position={step.position} />
      {step.ownedId ? (
        <Link href={`/book/${step.ownedId}`} className="group min-w-0 flex-1">
          {body}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          {body}
          <div className="mt-2">
            <CanonOwnLink canonTitle={step.title} canonAuthor={step.author} candidates={candidates} />
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * The status disc anchoring a path step: a solid green check when read, a green
 * ring when owned-but-unread, else a dashed disc showing its reading position.
 */
function StatusDisc({ owned, read, position }: { owned: boolean; read: boolean; position: number }) {
  if (read) {
    return (
      <span
        className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
        title="Read"
        aria-label="Read"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (owned) {
    return (
      <span
        className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-emerald-500 bg-paper text-emerald-600 shadow-sm"
        title="In your library, unread"
        aria-label="In your library, unread"
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

/** Section eyebrow for a lineage band. */
function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
      {children}
    </p>
  );
}

/** The movement's influence lineage as chip bands. Renders nothing when empty. */
function Relations({ detail }: { detail: MovementDetailView }) {
  const { reactedAgainst, ledTo, alongside } = detail;
  if (reactedAgainst.length + ledTo.length + alongside.length === 0) return null;
  return (
    <section className="rounded-2xl bg-paper-sunken/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">Lineage</h3>
      <div className="mt-4 space-y-5">
        {reactedAgainst.length > 0 && (
          <div>
            <BandLabel>Grew out of / reacted against</BandLabel>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {reactedAgainst.map((c) => (
                <MovementChip key={c.slug} chip={c} />
              ))}
            </div>
          </div>
        )}
        {ledTo.length > 0 && (
          <div>
            <BandLabel>Led to</BandLabel>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {ledTo.map((c) => (
                <MovementChip key={c.slug} chip={c} />
              ))}
            </div>
          </div>
        )}
        {alongside.length > 0 && (
          <div>
            <BandLabel>Alongside — contemporaries</BandLabel>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {alongside.map((c) => (
                <MovementChip key={c.slug} chip={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

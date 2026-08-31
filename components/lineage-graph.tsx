// Vertical lineage graph — a warm "literary metro map". Movements are stations on
// a timeline running top → bottom (oldest first), grouped by period. All the
// connective tissue lives in one left-hand lane: a period-coloured rail, station
// dots (filled = in your library, hollow = a gap), and gradient threads tracing
// the curated `ledTo` flow from one movement's period-colour to the next.
//
// Server component: pure presentation over the pre-computed geometry from
// lib/lineage-graph.ts. Station rows flow to the container width; the lane uses
// fixed row heights from the same geometry, so every dot and thread anchors
// exactly at any width.

import Link from "next/link";
import { periodColor, shortPeriod } from "@/lib/display";
import { CARD_H, LANE, RAIL_X, type LineageGraph } from "@/lib/lineage-graph";

function BookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5v-12Z" />
      <path d="M11 4h5.5A1.5 1.5 0 0 1 18 5.5v12a1.5 1.5 0 0 1-1.5 1.5H11" />
    </svg>
  );
}

export function LineageGraph({ graph }: { graph: LineageGraph }) {
  const { nodes, labels, edges, rail, height } = graph;
  const contentWidth = `calc(100% - ${LANE}px)`;
  const firstCenter = nodes.length ? nodes[0].y + CARD_H / 2 : 0;
  const lastCenter = nodes.length ? nodes[nodes.length - 1].y + CARD_H / 2 : 0;

  return (
    <div className="relative" style={{ height }}>
      {/* Left lane: rail, threads, station dots */}
      <svg
        className="absolute left-0 top-0"
        width={LANE}
        height={height}
        viewBox={`0 0 ${LANE} ${height}`}
        fill="none"
        aria-hidden
      >
        <defs>
          {edges.map((e) => (
            <linearGradient
              key={e.id}
              id={`thread-${e.id}`}
              gradientUnits="userSpaceOnUse"
              x1={RAIL_X}
              y1={e.yFrom}
              x2={RAIL_X}
              y2={e.yTo}
            >
              <stop offset="0" stopColor={periodColor(e.fromPeriod)} />
              <stop offset="1" stopColor={periodColor(e.toPeriod)} />
            </linearGradient>
          ))}
        </defs>

        {/* Faint continuous spine beneath everything */}
        <line
          x1={RAIL_X}
          y1={firstCenter}
          x2={RAIL_X}
          y2={lastCenter}
          stroke="#1f1b14"
          strokeOpacity="0.06"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Led-to threads */}
        {edges.map((e) => (
          <path
            key={e.id}
            d={e.d}
            stroke={`url(#thread-${e.id})`}
            strokeWidth="1.75"
            strokeOpacity={e.kind === "intra" ? 0.5 : 0.8}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Period-coloured rail runs */}
        {rail.map((s) => (
          <line
            key={s.period}
            x1={RAIL_X}
            y1={s.y1}
            x2={RAIL_X}
            y2={s.y2}
            stroke={periodColor(s.period)}
            strokeWidth="2.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
        ))}

        {/* Station dots */}
        {nodes.map((n) => {
          const c = periodColor(n.period);
          const cy = n.y + CARD_H / 2;
          const empty = n.count === 0;
          return (
            <g key={n.movement}>
              {!empty && <circle cx={RAIL_X} cy={cy} r="9" fill={c} opacity="0.14" />}
              <circle
                cx={RAIL_X}
                cy={cy}
                r="5"
                fill={empty ? "#fffdf9" : c}
                stroke={c}
                strokeWidth="1.75"
              />
            </g>
          );
        })}
      </svg>

      {/* Period headers */}
      {labels.map((l) => {
        const c = periodColor(l.period);
        return (
          <div
            key={l.period}
            className="absolute flex items-center gap-3"
            style={{ top: l.y, left: LANE, width: contentWidth, height: 42 }}
          >
            <span
              className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: c }}
            >
              {shortPeriod(l.period)}
            </span>
            <span
              className="h-px flex-1"
              style={{ background: `linear-gradient(90deg, ${c}59, ${c}00)` }}
            />
            {l.yearsRange && (
              <span className="shrink-0 text-[0.62rem] tabular-nums text-ink-faint">
                {l.yearsRange}
              </span>
            )}
          </div>
        );
      })}

      {/* Movement stations */}
      {nodes.map((n, i) => {
        const empty = n.count === 0;
        return (
          <Link
            key={n.movement}
            href={`/lineage/${n.slug}`}
            className="lineage-station group absolute flex flex-col justify-center"
            style={{
              top: n.y,
              left: LANE,
              width: contentWidth,
              height: CARD_H,
              animationDelay: `${Math.min(i * 45, 520)}ms`,
            }}
          >
            <span
              className={`font-serif text-[1.05rem] leading-[1.15] tracking-[-0.01em] transition-colors ${
                empty ? "text-ink-soft" : "text-ink group-hover:text-accent"
              }`}
            >
              {n.movement}
            </span>
            <span className="mt-1 flex items-center gap-2 text-[0.72rem]">
              {n.years && (
                <span className="tabular-nums text-ink-faint">{n.years}</span>
              )}
              {n.count > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-accent">
                  <BookGlyph />
                  {n.count}
                </span>
              ) : (
                <span className="text-ink-faint/70">not in library</span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

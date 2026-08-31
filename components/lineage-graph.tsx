// Vertical lineage graph: movements stacked chronologically (oldest at the top),
// grouped by period, with curved connectors in a right-hand gutter tracing the
// curated `ledTo` flow between them.
//
// Server component: pure presentation over the pre-computed geometry from
// lib/lineage-graph.ts. Node rows flow full-width (minus the gutter) so they read
// like table rows on a phone; the SVG gutter uses fixed row heights from the same
// geometry, so arcs anchor exactly to each row's mid-height at any container width.

import Link from "next/link";
import { periodColor, shortPeriod } from "@/lib/display";
import { CARD_H, GUTTER, type LineageGraph } from "@/lib/lineage-graph";

export function LineageGraph({ graph }: { graph: LineageGraph }) {
  const { nodes, labels, edges, height } = graph;
  const rowWidth = `calc(100% - ${GUTTER}px)`;

  return (
    <div className="relative" style={{ height }}>
      {/* Period headers */}
      {labels.map((l) => (
        <div
          key={l.period}
          className="absolute left-0 flex items-end pb-1 text-[0.6rem] font-semibold uppercase tracking-[0.13em]"
          style={{ top: l.y, width: rowWidth, height: 34, color: periodColor(l.period) }}
        >
          {shortPeriod(l.period)}
        </div>
      ))}

      {/* Node rows */}
      {nodes.map((n) => {
        const color = periodColor(n.period);
        const empty = n.count === 0;
        return (
          <Link
            key={n.movement}
            href={`/lineage/${n.slug}`}
            className={`group absolute left-0 flex items-center gap-3 rounded-xl border pl-3 pr-3.5 transition-colors ${
              empty
                ? "border-dashed border-paper-edge bg-canvas/40 hover:border-ink-faint"
                : "border-paper-edge bg-canvas/70 hover:border-ink-faint hover:bg-canvas"
            }`}
            style={{
              top: n.y,
              width: rowWidth,
              height: CARD_H,
              borderLeft: `3px solid ${empty ? "transparent" : color}`,
            }}
          >
            <span
              className={`min-w-0 flex-1 truncate text-[0.9rem] font-semibold leading-tight ${
                empty ? "text-ink-soft" : "text-ink group-hover:text-accent"
              }`}
            >
              {n.movement}
            </span>
            {n.years && (
              <span className="shrink-0 text-[0.68rem] tabular-nums text-ink-faint">
                {n.years}
              </span>
            )}
            <span
              className={`grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-[0.68rem] font-semibold tabular-nums ${
                empty ? "text-ink-faint/70" : "bg-accent-soft text-accent"
              }`}
            >
              {n.count}
            </span>
          </Link>
        );
      })}

      {/* Connector gutter */}
      <svg
        className="absolute top-0"
        style={{ right: 0 }}
        width={GUTTER}
        height={height}
        viewBox={`0 0 ${GUTTER} ${height}`}
        fill="none"
        aria-hidden
      >
        <defs>
          <marker
            id="lineage-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#968d7c" />
          </marker>
        </defs>
        {edges.map((e) => (
          <path
            key={`${e.from}->${e.to}`}
            d={e.d}
            stroke="#968d7c"
            strokeWidth={1.5}
            strokeOpacity={e.kind === "intra" ? 0.4 : 0.6}
            strokeDasharray={e.kind === "intra" ? "4 4" : undefined}
            markerEnd="url(#lineage-arrow)"
          />
        ))}
      </svg>
    </div>
  );
}

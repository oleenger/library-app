// Birds-eye lineage graph: movements laid out on a period timeline (oldest → newest,
// left → right) with curved edges tracing the curated `ledTo` flow between them.
//
// Server component: pure presentation over the pre-computed geometry from
// lib/lineage-graph.ts. The SVG edge layer and the absolutely-positioned node
// pills share one coordinate space, so nothing needs client-side measurement.
// Horizontally scrollable on narrow screens.

import Link from "next/link";
import { periodColor, shortPeriod } from "@/lib/display";
import { NODE_W, NODE_H, type LineageGraph } from "@/lib/lineage-graph";

export function LineageGraph({ graph }: { graph: LineageGraph }) {
  const { nodes, edges, columns, width, height } = graph;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="relative" style={{ width, height, minWidth: width }}>
        {/* Edge layer */}
        <svg
          className="absolute inset-0"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          fill="none"
          aria-hidden
        >
          <defs>
            <marker
              id="lineage-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
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
              strokeOpacity={e.kind === "loop" ? 0.4 : 0.65}
              strokeDasharray={e.kind === "loop" ? "4 4" : undefined}
              markerEnd="url(#lineage-arrow)"
            />
          ))}
        </svg>

        {/* Column period headers */}
        {columns.map((c) => (
          <div
            key={c.period}
            className="absolute top-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em]"
            style={{ left: c.x, width: NODE_W, color: periodColor(c.period) }}
          >
            {shortPeriod(c.period)}
          </div>
        ))}

        {/* Node pills */}
        {nodes.map((n) => {
          const color = periodColor(n.period);
          const empty = n.count === 0;
          return (
            <Link
              key={n.movement}
              href={`/lineage/${n.slug}`}
              className={`group absolute flex flex-col justify-center gap-0.5 rounded-xl border px-3 shadow-sm transition-colors ${
                empty
                  ? "border-dashed border-paper-edge bg-paper/60 hover:border-ink-faint"
                  : "border-paper-edge bg-paper hover:border-ink-faint"
              }`}
              style={{
                left: n.x,
                top: n.y,
                width: NODE_W,
                height: NODE_H,
                borderLeft: `3px solid ${empty ? "transparent" : color}`,
              }}
            >
              <span
                className={`line-clamp-2 text-[0.82rem] font-semibold leading-[1.1] ${
                  empty ? "text-ink-soft" : "text-ink group-hover:text-accent"
                }`}
              >
                {n.movement}
              </span>
              <span className="flex items-center gap-1.5 text-[0.6rem] text-ink-faint">
                {n.years && <span className="tabular-nums">{n.years}</span>}
                <span
                  className={`ml-auto tabular-nums ${empty ? "opacity-60" : "font-medium text-ink-soft"}`}
                >
                  {n.count}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

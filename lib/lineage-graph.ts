// Deterministic layout for the lineage graph shown on /lineage.
//
// Turns the curated LINEAGE data into positioned nodes and SVG edge paths so the
// route can render a birds-eye "how movements flow into one another" diagram.
// Columns are periods (oldest → newest); within a column, movements stack by
// start year. Edges are the `ledTo` relations between two placed movements.
//
// The graph is scoped to the *connected* subgraph: only movements that take part
// in at least one led-to edge appear here. Every other movement is still listed
// in the period-banded index below the graph. All geometry is computed here (no
// client-side measurement) so the SVG edge layer and the absolutely-positioned
// HTML node pills line up exactly.

import { LINEAGE } from "./lineage";
import { slugify } from "./slug";
import {
  MOVEMENTS,
  MOVEMENT_PERIODS,
  PERIODS,
  isMovement,
  type Movement,
  type Period,
} from "./taxonomy";

// Geometry (px). Node boxes are a fixed size so edges can anchor deterministically.
export const NODE_W = 158;
export const NODE_H = 56;
const COL_GAP = 96; // horizontal space between columns
const ROW_GAP = 26; // vertical space between stacked nodes
const PAD_X = 20;
const PAD_TOP = 52; // room for the period header labels
const PAD_BOTTOM = 24;
const COL_STRIDE = NODE_W + COL_GAP;
const ROW_STRIDE = NODE_H + ROW_GAP;

export interface GraphNode {
  movement: Movement;
  slug: string;
  period: Period;
  years?: string;
  count: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: Movement;
  to: Movement;
  /** SVG path `d`. */
  d: string;
  /** "forward" flows left→right across columns; "loop" joins nodes in one column. */
  kind: "forward" | "loop";
}

export interface GraphColumn {
  period: Period;
  label: string; // set by the caller (shortPeriod)
  x: number;
}

export interface LineageGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  columns: GraphColumn[];
  width: number;
  height: number;
}

/** First 4-digit year in a "1798–1837" string, for intra-column ordering. */
function startYear(years: string | undefined): number {
  const m = years?.match(/\d{4}/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Build the positioned lineage graph. `counts` maps a movement label to how many
 * works the reader holds in it (drives owned vs. faded styling).
 */
export function buildLineageGraph(counts: Map<string, number>): LineageGraph {
  // Edges: led-to relations where both endpoints are movements with a node.
  const rawEdges: Array<{ from: Movement; to: Movement }> = [];
  for (const [movement, node] of Object.entries(LINEAGE)) {
    if (!isMovement(movement)) continue;
    for (const to of node?.ledTo ?? []) {
      if (LINEAGE[to]) rawEdges.push({ from: movement, to });
    }
  }

  // Nodes: the union of edge endpoints (the connected subgraph).
  const placed = new Set<Movement>();
  for (const e of rawEdges) {
    placed.add(e.from);
    placed.add(e.to);
  }

  // Group placed movements by home period, preserving MOVEMENTS order as a tie-break.
  const byPeriod = new Map<Period, Movement[]>();
  for (const movement of MOVEMENTS) {
    if (!placed.has(movement)) continue;
    const period = MOVEMENT_PERIODS[movement];
    if (period === null) continue; // cross-period modes never join the timeline graph
    const list = byPeriod.get(period) ?? [];
    list.push(movement);
    byPeriod.set(period, list);
  }

  const activePeriods = PERIODS.filter((p) => byPeriod.has(p));
  const maxRows = Math.max(
    1,
    ...activePeriods.map((p) => byPeriod.get(p)?.length ?? 0),
  );
  const contentH = maxRows * ROW_STRIDE - ROW_GAP;

  // Position nodes; vertically centre each column so shorter columns sit mid-height,
  // keeping edges roughly horizontal.
  const nodeByMovement = new Map<Movement, GraphNode>();
  const columns: GraphColumn[] = [];
  activePeriods.forEach((period, col) => {
    const members = [...(byPeriod.get(period) ?? [])].sort(
      (a, b) =>
        startYear(LINEAGE[a]?.years) - startYear(LINEAGE[b]?.years) ||
        a.localeCompare(b),
    );
    const x = PAD_X + col * COL_STRIDE;
    columns.push({ period, label: "", x });
    const colH = members.length * ROW_STRIDE - ROW_GAP;
    const yStart = PAD_TOP + (contentH - colH) / 2;
    members.forEach((movement, row) => {
      nodeByMovement.set(movement, {
        movement,
        slug: slugify(movement),
        period,
        years: LINEAGE[movement]?.years,
        count: counts.get(movement) ?? 0,
        x,
        y: yStart + row * ROW_STRIDE,
      });
    });
  });

  // Build edge paths from the positioned nodes.
  const edges: GraphEdge[] = [];
  for (const { from, to } of rawEdges) {
    const a = nodeByMovement.get(from);
    const b = nodeByMovement.get(to);
    if (!a || !b) continue;
    const sx = a.x + NODE_W;
    const sy = a.y + NODE_H / 2;
    const ty = b.y + NODE_H / 2;
    if (b.x > a.x) {
      // Forward edge across columns: smooth left→right cubic.
      const tx = b.x;
      const dx = Math.max(40, (tx - sx) * 0.45);
      edges.push({
        from,
        to,
        kind: "forward",
        d: `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`,
      });
    } else {
      // Same-column (or backward) edge: bow out to the right and loop back to the
      // target's left edge.
      const tx = b.x;
      const bow = 54;
      edges.push({
        from,
        to,
        kind: "loop",
        d: `M${sx},${sy} C${sx + bow},${sy} ${tx + bow},${ty} ${tx},${ty}`,
      });
    }
  }

  const width = PAD_X * 2 + activePeriods.length * COL_STRIDE - COL_GAP;
  const height = PAD_TOP + contentH + PAD_BOTTOM;

  return { nodes: [...nodeByMovement.values()], edges, columns, width, height };
}

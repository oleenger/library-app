// Deterministic layout for the lineage graph shown on /lineage.
//
// Turns the curated LINEAGE data into a *vertical* timeline: movements stacked
// top → bottom in chronological order, grouped by period, with the curated
// `ledTo` relations drawn as curved connectors in a fixed gutter on the right.
// Vertical orientation reads naturally on a phone (scroll down = move forward in
// time) and lets the node rows flex to the container width.
//
// The graph is scoped to the *connected* subgraph: only movements that take part
// in at least one led-to edge appear here. Every other movement is still listed
// in the period-banded index below the graph. All vertical geometry is computed
// here (fixed row heights) so the SVG edge layer and the flowing HTML node rows
// line up exactly regardless of width.

import { LINEAGE } from "./lineage";
import { slugify } from "./slug";
import {
  MOVEMENTS,
  MOVEMENT_PERIODS,
  isMovement,
  type Movement,
  type Period,
} from "./taxonomy";

// Vertical geometry (px). Row heights are fixed so edges anchor deterministically;
// row *width* is responsive (the caller sizes it to the container).
export const CARD_H = 56;
const V_GAP = 22;
const V_STRIDE = CARD_H + V_GAP;
const LABEL_H = 34; // vertical space a period header takes before its first node
const PAD_TOP = 4;
const PAD_BOTTOM = 6;
/** Fixed right-hand lane the connector arcs are drawn in. */
export const GUTTER = 74;

export interface GraphNode {
  movement: Movement;
  slug: string;
  period: Period;
  years?: string;
  count: number;
  /** Top of the row, px from the top of the graph. */
  y: number;
  /** Chronological index among placed nodes (for arc-depth scaling). */
  row: number;
}

export interface GraphLabel {
  period: Period;
  /** Top of the label, px. */
  y: number;
}

export interface GraphEdge {
  from: Movement;
  to: Movement;
  /** SVG path `d`, in the gutter's own 0..GUTTER coordinate space. */
  d: string;
  /** "cross" spans two periods; "intra" links movements within one period. */
  kind: "cross" | "intra";
}

export interface LineageGraph {
  nodes: GraphNode[];
  labels: GraphLabel[];
  edges: GraphEdge[];
  /** Total height of the diagram, px. */
  height: number;
  /** Width of the right-hand connector gutter, px. */
  gutter: number;
}

/** First 4-digit year in a "1798–1837" string, for chronological ordering. */
function startYear(years: string | undefined): number {
  const m = years?.match(/\d{4}/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Build the positioned vertical lineage graph. `counts` maps a movement label to
 * how many works the reader holds in it (drives owned vs. faded styling).
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

  // Nodes: the union of edge endpoints (the connected subgraph), excluding any
  // cross-period modes (they have no place on a chronological timeline).
  const placed = new Set<Movement>();
  for (const e of rawEdges) {
    if (MOVEMENT_PERIODS[e.from] !== null) placed.add(e.from);
    if (MOVEMENT_PERIODS[e.to] !== null) placed.add(e.to);
  }

  // Order chronologically; MOVEMENTS order breaks ties within a shared start year.
  const ordered = [...placed].sort(
    (a, b) =>
      startYear(LINEAGE[a]?.years) - startYear(LINEAGE[b]?.years) ||
      MOVEMENTS.indexOf(a) - MOVEMENTS.indexOf(b),
  );

  // Walk top → bottom, inserting a period header whenever the period changes.
  const nodes: GraphNode[] = [];
  const labels: GraphLabel[] = [];
  const nodeByMovement = new Map<Movement, GraphNode>();
  let y = PAD_TOP;
  let prevPeriod: Period | null = null;
  ordered.forEach((movement, row) => {
    const period = MOVEMENT_PERIODS[movement] as Period; // non-null: cross-period excluded
    if (period !== prevPeriod) {
      labels.push({ period, y });
      y += LABEL_H;
      prevPeriod = period;
    }
    const n: GraphNode = {
      movement,
      slug: slugify(movement),
      period,
      years: LINEAGE[movement]?.years,
      count: counts.get(movement) ?? 0,
      y,
      row,
    };
    nodes.push(n);
    nodeByMovement.set(movement, n);
    y += V_STRIDE;
  });
  const height = y - V_GAP + PAD_BOTTOM;

  // Edges: arcs bowing right into the gutter, connecting the two rows' mid-heights.
  const edges: GraphEdge[] = [];
  for (const { from, to } of rawEdges) {
    const a = nodeByMovement.get(from);
    const b = nodeByMovement.get(to);
    if (!a || !b) continue;
    const yA = a.y + CARD_H / 2;
    const yB = b.y + CARD_H / 2;
    const dist = Math.abs(a.row - b.row);
    const depth = Math.min(GUTTER - 10, 18 + 12 * dist);
    edges.push({
      from,
      to,
      kind: a.period === b.period ? "intra" : "cross",
      d: `M0,${yA} C${depth},${yA} ${depth},${yB} 0,${yB}`,
    });
  }

  return { nodes, labels, edges, height, gutter: GUTTER };
}

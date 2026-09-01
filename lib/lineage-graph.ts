// Deterministic layout for the lineage graph shown on /lineage.
//
// A vertical "literary metro map": movements are stations on a timeline running
// top → bottom (oldest first), grouped by period. The connective tissue — the
// period-coloured rail and the curated `ledTo` threads — all lives in a single
// left-hand lane, so the graph reads as one coherent system and the movement
// names get the full remaining width. Vertical orientation scrolls naturally on
// a phone.
//
// Scope is the *connected* subgraph: only movements taking part in at least one
// led-to edge appear. Everything else is still listed in the period-banded index
// below. All vertical geometry is computed here (fixed row heights) so the SVG
// lane and the flowing HTML rows line up exactly at any container width.

import { forwardEdges, movementYears } from "./canon/data";
import { formatYear } from "./display";
import { slugify } from "./slug";
import {
  MOVEMENTS,
  MOVEMENT_PERIODS,
  isMovement,
  type Movement,
  type Period,
} from "./taxonomy";

// Vertical geometry (px). Row heights are fixed so edges anchor deterministically;
// row *width* is responsive (the caller sizes the content column to the container).
export const CARD_H = 60;
const V_GAP = 16;
const V_STRIDE = CARD_H + V_GAP;
const LABEL_H = 42; // vertical space a period header takes before its first node
const PAD_TOP = 8;
const PAD_BOTTOM = 12;

/** Width of the left connective lane (rail + threads + station dots). */
export const LANE = 72;
/** X of the rail / station dots within the lane. */
export const RAIL_X = 56;

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
  /** Combined year span of the period's movements, e.g. "1798–1901". */
  yearsRange: string;
}

export interface GraphEdge {
  from: Movement;
  to: Movement;
  /** Stable, id-safe key for the per-edge gradient. */
  id: string;
  /** SVG path `d`, in the lane's own coordinate space (rail at RAIL_X). */
  d: string;
  fromPeriod: Period;
  toPeriod: Period;
  /** Endpoint y's, for placing the per-edge gradient in user space. */
  yFrom: number;
  yTo: number;
  /** "cross" spans two periods; "intra" links movements within one period. */
  kind: "cross" | "intra";
}

export interface RailSegment {
  period: Period;
  y1: number;
  y2: number;
}

export interface LineageGraph {
  nodes: GraphNode[];
  labels: GraphLabel[];
  edges: GraphEdge[];
  /** Period-coloured rail runs, one per contiguous period group. */
  rail: RailSegment[];
  /** Total height of the diagram, px. */
  height: number;
}

/** Essentials year span for a movement, or a sentinel when it has none. */
function bounds(movement: Movement): [number, number] {
  const y = movementYears(movement);
  return y ? [y.min, y.max] : [Number.MAX_SAFE_INTEGER, -1];
}

/** Display year span, e.g. "1764–1890" (or a single year), or undefined. */
function yearsLabel(movement: Movement): string | undefined {
  const y = movementYears(movement);
  if (!y) return undefined;
  return y.min === y.max ? formatYear(y.min) : `${formatYear(y.min)}\u2013${formatYear(y.max)}`;
}

/**
 * Build the positioned vertical lineage graph. `counts` maps a movement label to
 * how many works the reader holds in it (drives owned vs. faded styling).
 */
export function buildLineageGraph(counts: Map<string, number>): LineageGraph {
  // Edges: forward influence threads (evolves-into / feeds / reaction-against;
  // overlap ties excluded) where both endpoints are placeable movements.
  const rawEdges: Array<{ from: Movement; to: Movement }> = [];
  for (const e of forwardEdges()) {
    if (isMovement(e.source) && isMovement(e.target)) {
      rawEdges.push({ from: e.source, to: e.target });
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
      bounds(a)[0] - bounds(b)[0] ||
      MOVEMENTS.indexOf(a) - MOVEMENTS.indexOf(b),
  );

  // Walk top → bottom, inserting a period header whenever the period changes.
  const nodes: GraphNode[] = [];
  const labels: GraphLabel[] = [];
  const rail: RailSegment[] = [];
  const nodeByMovement = new Map<Movement, GraphNode>();
  let y = PAD_TOP;
  let prevPeriod: Period | null = null;
  let segMinYear = Number.MAX_SAFE_INTEGER;
  let segMaxYear = -1;
  let segFirstCenter = 0;
  let segLastCenter = 0;

  const closeSegment = () => {
    if (prevPeriod === null) return;
    rail.push({ period: prevPeriod, y1: segFirstCenter, y2: segLastCenter });
    labels[labels.length - 1].yearsRange =
      segMaxYear >= 0 ? `${formatYear(segMinYear)}\u2013${formatYear(segMaxYear)}` : "";
  };

  ordered.forEach((movement, row) => {
    const period = MOVEMENT_PERIODS[movement] as Period; // non-null: cross-period excluded
    if (period !== prevPeriod) {
      if (prevPeriod !== null) closeSegment();
      labels.push({ period, y, yearsRange: "" });
      y += LABEL_H;
      prevPeriod = period;
      segMinYear = Number.MAX_SAFE_INTEGER;
      segMaxYear = -1;
    }
    const [lo, hi] = bounds(movement);
    segMinYear = Math.min(segMinYear, lo);
    segMaxYear = Math.max(segMaxYear, hi);
    const center = y + CARD_H / 2;
    if (period !== nodes[nodes.length - 1]?.period) segFirstCenter = center;
    segLastCenter = center;

    const n: GraphNode = {
      movement,
      slug: slugify(movement),
      period,
      years: yearsLabel(movement),
      count: counts.get(movement) ?? 0,
      y,
      row,
    };
    nodes.push(n);
    nodeByMovement.set(movement, n);
    y += V_STRIDE;
  });
  closeSegment();
  const height = y - V_GAP + PAD_BOTTOM;

  // Edges: threads bowing left into the lane, connecting the two stations.
  const edges: GraphEdge[] = [];
  for (const { from, to } of rawEdges) {
    const a = nodeByMovement.get(from);
    const b = nodeByMovement.get(to);
    if (!a || !b) continue;
    const yA = a.y + CARD_H / 2;
    const yB = b.y + CARD_H / 2;
    const dist = Math.abs(a.row - b.row);
    const bow = Math.min(RAIL_X - 8, 22 + 12 * dist);
    edges.push({
      from,
      to,
      id: `${slugify(from)}--${slugify(to)}`,
      kind: a.period === b.period ? "intra" : "cross",
      fromPeriod: a.period,
      toPeriod: b.period,
      yFrom: yA,
      yTo: yB,
      d: `M${RAIL_X},${yA} C${RAIL_X - bow},${yA} ${RAIL_X - bow},${yB} ${RAIL_X},${yB}`,
    });
  }

  return { nodes, labels, edges, rail, height };
}

// Typed runtime loader over the generated canon data (lib/canon/generated/
// canon-data.json, emitted by scripts/build-canon-data.ts from the authoritative
// TSVs under data/). This is the single read path the app uses for movement
// essentials, pre-movement classics, and the movement-influence graph.
//
// The generated JSON is committed, so this module works on a clean checkout; the
// predev/prebuild codegen simply keeps it in sync with the source TSVs.

import { isMovement, type Movement } from "../taxonomy";
import raw from "./generated/canon-data.json";

// ---- shapes (mirror the emitter) ------------------------------------------
export interface Essential {
  title: string;
  author: string;
  /** Single sortable year (BCE negative, circa/range collapsed). Null if unparseable. */
  sortYear: number | null;
  /** Faithful source string, e.g. "c. 400 BCE" or "1818". Render this. */
  displayYear: string;
  /** Curated 1..N rank within the movement; null when it arrives via a secondary tag. */
  rank: number | null;
}

export interface InfluenceEdge {
  source: string;
  target: string;
  relationship: string;
  strength: string;
  note: string;
}

interface MovementEntry {
  essentials: Essential[];
  years: { min: number; max: number } | null;
}

interface CanonData {
  generatedAt: string;
  source: string;
  movements: Record<string, MovementEntry>;
  preMovement: Essential[];
  edges: InfluenceEdge[];
}

const DATA = raw as CanonData;

// Relationships that describe a forward predecessor → successor step (the map
// threads and the up/down relation bands). Everything else ("cross-influence /
// overlap") is a contemporaneous tie rendered "alongside".
const OVERLAP = "cross-influence / overlap";

// ---- essentials -----------------------------------------------------------
/** The movement's essential works, pre-ordered (curated rank first, then by year). */
export function essentialsFor(movement: string): Essential[] {
  return DATA.movements[movement]?.essentials ?? [];
}

/** Year span of a movement's essentials, or null when it has none in the data. */
export function movementYears(movement: string): { min: number; max: number } | null {
  return DATA.movements[movement]?.years ?? null;
}

/** True when the data carries any essentials for this movement. */
export function hasEssentials(movement: string): boolean {
  return (DATA.movements[movement]?.essentials.length ?? 0) > 0;
}

/** The pre-movement / classical foundations, ordered oldest first. */
export function preMovementClassics(): Essential[] {
  return DATA.preMovement;
}

// ---- influence graph ------------------------------------------------------
/** All influence edges (taxonomy-valid endpoints only). */
export function lineageEdges(): InfluenceEdge[] {
  return DATA.edges;
}

/** Forward (directed) edges only — the map threads; excludes overlap ties. */
export function forwardEdges(): InfluenceEdge[] {
  return DATA.edges.filter((e) => e.relationship !== OVERLAP);
}

export interface InfluenceRelations {
  /** Upstream: movements this one grew out of / reacted against. */
  reactedAgainst: Movement[];
  /** Downstream: movements this one led to. */
  ledTo: Movement[];
  /** Contemporaneous overlaps. */
  alongside: Movement[];
}

/**
 * Relation buckets for a movement, derived from the influence edges. In the
 * source TSV the Source is always the earlier influencer and the Target the
 * later movement, so for every forward edge S→T: T leads-from S (S is upstream
 * of T) and T is downstream of S — regardless of whether the flavour is
 * "reaction against", "evolves into" or "feeds". Overlap edges are symmetric.
 */
export function influenceRelations(movement: string): InfluenceRelations {
  const reactedAgainst = new Set<Movement>();
  const ledTo = new Set<Movement>();
  const alongside = new Set<Movement>();

  for (const e of DATA.edges) {
    const overlap = e.relationship === OVERLAP;
    if (e.source === movement) {
      if (overlap) addMovement(alongside, e.target);
      else addMovement(ledTo, e.target);
    } else if (e.target === movement) {
      if (overlap) addMovement(alongside, e.source);
      else addMovement(reactedAgainst, e.source);
    }
  }

  return {
    reactedAgainst: [...reactedAgainst],
    ledTo: [...ledTo],
    alongside: [...alongside],
  };
}

function addMovement(set: Set<Movement>, name: string): void {
  if (isMovement(name)) set.add(name);
}

// ---- dev-time validation --------------------------------------------------
// The emitter already skips non-taxonomy names, but assert here too so a stale
// or hand-edited JSON blob fails fast in development rather than rendering a
// dead movement page or chip.
function assertValid(): void {
  const bad: string[] = [];
  for (const name of Object.keys(DATA.movements)) {
    if (!isMovement(name)) bad.push(`movement "${name}"`);
  }
  for (const e of DATA.edges) {
    if (!isMovement(e.source)) bad.push(`edge source "${e.source}"`);
    if (!isMovement(e.target)) bad.push(`edge target "${e.target}"`);
  }
  if (bad.length) {
    throw new Error(
      `lib/canon/generated/canon-data.json references non-taxonomy labels: ${bad.join(", ")}. ` +
        `Re-run \`npm run build:canon\`.`,
    );
  }
}

if (process.env.NODE_ENV !== "production") assertValid();

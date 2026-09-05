// Movement lineage — a small, hand-authored graph of how movements relate.
//
// This is the static "learning" data behind the lineage view: for any movement
// it records what it grew out of / reacted against, what it led to, and its
// contemporaries. It is *curated*, not derived and not LLM-generated. Every
// referenced label must be a valid taxonomy movement (validated below), and the
// home period (for era label + colour) comes from MOVEMENT_PERIODS in taxonomy.ts
// — it is not duplicated here.
//
// Coverage is intentionally a seed subset (the Romantic → Modernist → Postwar
// spine, centred on Modernism as in the mockup). Movements without an entry still
// resolve to a valid lineage view — era, holding count and example titles render;
// their relations are simply empty until authored. Draft content here is proposed
// for review, per the project's taxonomy-change convention.

import { isMovement, type Movement } from "./taxonomy";

/** One movement's place in the lineage graph. All relations are optional. */
export interface LineageNode {
  /** Active date range for the era label, e.g. "1901–1945". Colour comes from period. */
  years?: string;
  /** One-sentence static context note shown on the centred card. */
  note?: string;
  /** Upstream: movements this grew out of or reacted against. */
  reactedAgainst?: Movement[];
  /** Downstream: movements this led to. */
  ledTo?: Movement[];
  /** Contemporaries and closely-related sub-movements. */
  alongside?: Movement[];
}

export const LINEAGE: Partial<Record<Movement, LineageNode>> = {
  Romanticism: {
    years: "1798–1837",
    note: "Feeling, nature and the sublime raised over Enlightenment reason and neoclassical restraint.",
    reactedAgainst: ["Neoclassicism / Augustan"],
    ledTo: ["Realism", "Symbolism"],
    alongside: ["Gothic", "Transcendentalism", "Dark Romanticism"],
  },
  Realism: {
    years: "1830–1900",
    note: "Ordinary life rendered plainly — a turn from Romantic idealisation toward observed social reality.",
    reactedAgainst: ["Romanticism"],
    ledTo: ["Naturalism", "Modernism"],
    alongside: ["Naturalism"],
  },
  Naturalism: {
    years: "1865–1900",
    note: "Realism pushed to determinism: character shaped inexorably by heredity and environment.",
    reactedAgainst: ["Romanticism"],
    ledTo: ["Modernism"],
    alongside: ["Realism"],
  },
  Symbolism: {
    years: "1880–1910",
    note: "Suggestion and symbol over description — the inner and the ineffable against naturalist surfaces.",
    reactedAgainst: ["Realism", "Naturalism"],
    ledTo: ["Modernism", "Imagism", "Surrealism"],
    alongside: ["Aestheticism / Decadence"],
  },
  "Aestheticism / Decadence": {
    years: "1868–1901",
    note: "Art for art's sake — beauty and sensation as their own justification, indifferent to moral use.",
    reactedAgainst: ["Realism"],
    ledTo: ["Modernism"],
    alongside: ["Symbolism"],
  },
  Modernism: {
    years: "1901–1945",
    note: "Formal rupture, fragmentation and interior subjectivity — a deliberate break from realist convention after the certainties of the 19th century collapsed.",
    reactedAgainst: ["Realism", "Symbolism"],
    ledTo: ["Postmodernism"],
    alongside: [
      "Imagism",
      "Surrealism",
      "Harlem Renaissance",
    ],
  },
  Imagism: {
    years: "1912–1917",
    note: "Hard, clear images and everyday speech — no ornament, no abstraction.",
    reactedAgainst: ["Romanticism", "Symbolism"],
    ledTo: ["Modernism"],
    alongside: ["Modernism"],
  },
  Surrealism: {
    years: "1924–1945",
    note: "The unconscious, dream logic and startling juxtaposition unleashed against rational order.",
    reactedAgainst: ["Realism"],
    ledTo: ["Magical realism"],
    alongside: ["Modernism"],
  },
  "Harlem Renaissance": {
    years: "1918–1937",
    note: "A flowering of Black American literature, music and art centred on Harlem.",
    alongside: ["Modernism"],
  },
  Postmodernism: {
    years: "1945–2000",
    note: "Play, pastiche and self-awareness — scepticism toward grand narratives and the stable self.",
    reactedAgainst: ["Modernism"],
    alongside: ["Magical realism"],
  },
  "Magical realism": {
    years: "1935–2000",
    note: "The marvellous treated as ordinary within otherwise realist narration.",
    reactedAgainst: ["Realism"],
    alongside: ["Postmodernism", "Surrealism"],
  },
  Existentialism: {
    years: "1938–1965",
    note: "Meaning made, not given — freedom, absurdity and responsibility in a world without guarantees.",
    ledTo: ["Theatre of the Absurd"],
    alongside: ["Theatre of the Absurd", "Beat Generation"],
  },
  "Theatre of the Absurd": {
    years: "1953–1970",
    note: "Human existence staged as illogical, repetitive and comic — meaning visibly breaking down.",
    reactedAgainst: ["Realism"],
    alongside: ["Existentialism"],
  },
  "Beat Generation": {
    years: "1948–1965",
    note: "Spontaneous, unbuttoned prose and poetry pushing back against postwar conformity.",
    alongside: ["Existentialism"],
  },
};

/**
 * Every label referenced anywhere in the graph must be a valid taxonomy
 * movement (proposal acceptance criterion). Run once at module load outside
 * production so an authoring typo fails fast in development rather than
 * rendering a dead chip.
 */
function assertValidLineage(): void {
  const bad: string[] = [];
  for (const [movement, node] of Object.entries(LINEAGE)) {
    if (!isMovement(movement)) bad.push(movement);
    for (const rel of [
      ...(node?.reactedAgainst ?? []),
      ...(node?.ledTo ?? []),
      ...(node?.alongside ?? []),
    ]) {
      if (!isMovement(rel)) bad.push(`${movement} → ${rel}`);
    }
  }
  if (bad.length > 0) {
    throw new Error(
      `lib/lineage.ts references labels not in the taxonomy: ${bad.join(", ")}`,
    );
  }
}

if (process.env.NODE_ENV !== "production") assertValidLineage();

/** The lineage node for a movement, or an empty node when none is authored yet. */
export function lineageNode(movement: Movement): LineageNode {
  return LINEAGE[movement] ?? {};
}

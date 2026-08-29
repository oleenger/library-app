// Controlled vocabulary — the single source of truth for periods and movements.
// Mirrors docs/library-taxonomy.md. The CSV loader validates against these lists
// and rejects any value not present (proposal §5.1, §7): the taxonomy is the
// authority, not free text in the data file.

/** Periods, in chronological order. Each work has exactly one (or null). */
export const PERIODS = [
  "Classical / Antiquity",
  "Medieval",
  "Renaissance / Early Modern",
  "Enlightenment / Neoclassical",
  "Romantic",
  "Victorian / 19th century",
  "Modernist / early 20th century",
  "Postwar / late 20th century",
  "Contemporary",
] as const;

/**
 * Movements, grouped by the period they are most associated with (a movement is
 * assigned by style, not date, and may span periods). One primary per work plus
 * zero or more secondary; may be null where no useful label applies.
 */
export const MOVEMENTS = [
  // Renaissance / Early Modern
  "Humanism",
  "Metaphysical poetry",
  "Elizabethan / Jacobean drama",
  // Enlightenment / Neoclassical
  "Neoclassicism / Augustan",
  "Enlightenment",
  // 19th century
  "Romanticism",
  "Transcendentalism",
  "Gothic",
  "Dark Romanticism",
  "Realism",
  "Naturalism",
  "Regionalism / local colour",
  "Symbolism",
  "Aestheticism / Decadence",
  // Modernist / early 20th century
  "Modernism",
  "Imagism",
  "Stream of consciousness",
  "Surrealism",
  "Harlem Renaissance",
  "Lost Generation",
  // Postwar / late 20th century
  "Existentialism",
  "Theatre of the Absurd",
  "Beat Generation",
  "Nouveau Roman",
  "Oulipo",
  "Magical realism",
  "Postmodernism",
  "Metafiction",
  "Postcolonial literature",
  "Minimalism",
  // Contemporary
  "Contemporary literary fiction",
  "Autofiction",
  // Genre & cross-period forms — added beyond docs/library-taxonomy.md to cover
  // classical/medieval and genre works the era-grouped list did not reach.
  "Epic poetry", // long narrative poem of heroic deeds (Homer, Virgil, Dante, Milton)
  "Tragedy", // classical and dramatic tragedy (Sophocles)
  "Medieval romance", // chivalric quest and courtly adventure (Sir Gawain)
  "Satire", // ridicule of vice and folly (Chaucer, Swift, Heller)
  "Science fiction", // speculative science, technology and futures
  "Dystopian fiction", // cautionary imagined societies
] as const;

export type Period = (typeof PERIODS)[number];
export type Movement = (typeof MOVEMENTS)[number];

const PERIOD_SET: ReadonlySet<string> = new Set(PERIODS);
const MOVEMENT_SET: ReadonlySet<string> = new Set(MOVEMENTS);

export function isPeriod(value: string): value is Period {
  return PERIOD_SET.has(value);
}

export function isMovement(value: string): value is Movement {
  return MOVEMENT_SET.has(value);
}

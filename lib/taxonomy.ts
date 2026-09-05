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
  // Enlightenment / Neoclassical
  "Neoclassicism / Augustan",
  // 19th century
  "Romanticism",
  "Transcendentalism",
  "Gothic",
  "Dark Romanticism",
  "Realism",
  "Naturalism",
  "Symbolism",
  "Aestheticism / Decadence",
  // Modernist / early 20th century
  "Modernism",
  "Imagism",
  "Surrealism",
  "Futurism",
  "Expressionism",
  "Dada",
  "Harlem Renaissance",
  // Postwar / late 20th century
  "Existentialism",
  "Theatre of the Absurd",
  "Beat Generation",
  "Magical realism",
  "Postmodernism",
  "Postcolonial literature",
  // Contemporary
  "New Sincerity",
] as const;

export type Period = (typeof PERIODS)[number];
export type Movement = (typeof MOVEMENTS)[number];

/**
 * The sentinel primary-movement value in the reference data marking a work as a
 * pre-movement / classical foundation (before the movement lineage begins). It
 * is deliberately NOT a taxonomy Movement, but it IS a valid key for the
 * foundations bucket's essentials and — like any movement — its reading path.
 */
export const PRE_MOVEMENT_KEY = "None / Pre-movement";

/** True for the pre-movement foundations key, or any real taxonomy movement. */
export function isMovementOrPreMovement(value: string): boolean {
  return value === PRE_MOVEMENT_KEY || isMovement(value);
}

/**
 * The period each movement is *most associated with* — its home/origin era —
 * used for era labels and colour in period-keyed views (there is no separate
 * per-movement colour).
 *
 * Typed so every movement is covered — the compiler rejects a new movement that
 * omits an entry here. A movement may still be `null` if it has no single home
 * era; such movements render as "Cross-period form" rather than a false period.
 */
export const MOVEMENT_PERIODS: Record<Movement, Period | null> = {
  // Renaissance / Early Modern
  Humanism: "Renaissance / Early Modern",
  // Enlightenment / Neoclassical
  "Neoclassicism / Augustan": "Enlightenment / Neoclassical",
  // 19th century
  Romanticism: "Romantic",
  Transcendentalism: "Romantic",
  Gothic: "Romantic",
  "Dark Romanticism": "Romantic",
  Realism: "Victorian / 19th century",
  Naturalism: "Victorian / 19th century",
  Symbolism: "Victorian / 19th century",
  "Aestheticism / Decadence": "Victorian / 19th century",
  // Modernist / early 20th century
  Modernism: "Modernist / early 20th century",
  Imagism: "Modernist / early 20th century",
  Surrealism: "Modernist / early 20th century",
  Futurism: "Modernist / early 20th century",
  Expressionism: "Modernist / early 20th century",
  Dada: "Modernist / early 20th century",
  "Harlem Renaissance": "Modernist / early 20th century",
  // Postwar / late 20th century
  Existentialism: "Postwar / late 20th century",
  "Theatre of the Absurd": "Postwar / late 20th century",
  "Beat Generation": "Postwar / late 20th century",
  "Magical realism": "Postwar / late 20th century",
  Postmodernism: "Postwar / late 20th century",
  "Postcolonial literature": "Postwar / late 20th century",
  // Contemporary
  "New Sincerity": "Contemporary",
};

/** Movements with no single home period — rendered as "Cross-period form". */
export const CROSS_PERIOD_MOVEMENTS: ReadonlySet<Movement> = new Set(
  (Object.keys(MOVEMENT_PERIODS) as Movement[]).filter((m) => MOVEMENT_PERIODS[m] === null),
);

/** The home period for a movement, or null (unknown label, or a cross-period mode). */
export function movementPeriod(movement: string): Period | null {
  return isMovement(movement) ? MOVEMENT_PERIODS[movement] : null;
}

/** True when the movement has no single home period (a cross-period mode). */
export function isCrossPeriod(movement: string): boolean {
  return isMovement(movement) && CROSS_PERIOD_MOVEMENTS.has(movement);
}

const PERIOD_SET: ReadonlySet<string> = new Set(PERIODS);
const MOVEMENT_SET: ReadonlySet<string> = new Set(MOVEMENTS);

export function isPeriod(value: string): value is Period {
  return PERIOD_SET.has(value);
}

export function isMovement(value: string): value is Movement {
  return MOVEMENT_SET.has(value);
}

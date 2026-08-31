// Curated canonical reading paths — the static, hand-authored canon behind the
// Reading Paths feature. This is deliberately NOT LLM-generated and NOT derived
// from the user's shelf: a movement's canon is stable ("eternal"), so it lives
// here as reviewable, versioned data. The user's holdings are joined live at
// render time (see lib/canon/select.ts) to mark which works are owned waypoints
// and which are gaps — the data here never encodes ownership.
//
// Per path: works are listed in PEDAGOGICAL reading order (array position = the
// reading step), not strictly chronological — an accessible entry point may
// precede an earlier-but-harder work, and the summit sits last. `importance`
// (1..10) is a separate axis used by the "By importance" view.
//
// Every `movement` key must be a valid taxonomy movement; a dev-time check below
// fails fast on typos. Content is curated and open to revision — corrections and
// additions are welcome via the usual review.

import { isMovement, movementPeriod, type Movement, type Period } from "../taxonomy";

/** One work on a path. `year` is first publication (negative = BCE). */
export interface CanonWork {
  title: string;
  author: string;
  year: number;
  /** 1..10 canonical importance (10 = cornerstone). */
  importance: number;
  /** One-line rationale for its reading position / what it sets up. */
  note: string;
  /**
   * One-line rationale for why the work matters in its own right — shown in the
   * by-importance view. Optional: falls back to `note` until curated content
   * lands. (Kept separate because `note` is often phrased around reading order,
   * e.g. "start here" / "read last", which reads oddly outside the path.)
   */
  why?: string;
}

/** A movement's canonical reading path. */
export interface CanonPath {
  movement: Movement;
  /** Short subtitle shown under the path title. */
  blurb: string;
  /** Works in pedagogical reading order. */
  works: CanonWork[];
}

export const CANON_PATHS: readonly CanonPath[] = [
  // ---- Renaissance / Early Modern -------------------------------------------
  {
    movement: "Humanism",
    blurb: "Classical learning turned on the human world — reason, wit and the self.",
    works: [
      { title: "The Praise of Folly", author: "Erasmus", year: 1511, importance: 8, note: "Humanism laughing at itself — the movement's wit in one short satire." },
      { title: "Utopia", author: "Thomas More", year: 1516, importance: 8, note: "Reason turned on society: the founding humanist thought-experiment." },
      { title: "The Prince", author: "Niccolò Machiavelli", year: 1532, importance: 8, note: "Humanist realism about power, stripped of piety." },
      { title: "Gargantua and Pantagruel", author: "François Rabelais", year: 1534, importance: 7, note: "Erudition overflowing into bawdy comedy — learning at full volume." },
      { title: "Essays", author: "Michel de Montaigne", year: 1580, importance: 10, note: "The self made the subject of inquiry; humanism's essayistic summit." },
      { title: "Don Quixote", author: "Miguel de Cervantes", year: 1605, importance: 10, note: "Humanist irony births the modern novel — read it last." },
    ],
  },
  {
    movement: "Metaphysical poetry",
    blurb: "Intellectual conceits, paradox and argument — the mind at full stretch in verse.",
    works: [
      { title: "The Complete Poems", author: "Andrew Marvell", year: 1681, importance: 8, note: "Start with 'To His Coy Mistress' — the conceit at its most seductive." },
      { title: "The Complete English Poems", author: "John Donne", year: 1633, importance: 10, note: "The movement's engine: wit, paradox, the erotic and the divine fused." },
      { title: "The Temple", author: "George Herbert", year: 1633, importance: 9, note: "Devotion shaped into pattern — Donne's quieter sacred counterpart." },
      { title: "Silex Scintillans", author: "Henry Vaughan", year: 1650, importance: 6, note: "Herbert's heir; mysticism and sudden light." },
      { title: "Steps to the Temple", author: "Richard Crashaw", year: 1646, importance: 5, note: "Baroque excess — the mode pushed to sensuous extremes." },
    ],
  },
  {
    movement: "Elizabethan / Jacobean drama",
    blurb: "The English Renaissance stage, from public playhouse to dark Jacobean tragedy.",
    works: [
      { title: "Doctor Faustus", author: "Christopher Marlowe", year: 1604, importance: 8, note: "The overreacher's tragedy — the form's first great single-figure play." },
      { title: "Hamlet", author: "William Shakespeare", year: 1601, importance: 10, note: "The summit of the tradition; enter Shakespeare at his most inward." },
      { title: "King Lear", author: "William Shakespeare", year: 1606, importance: 10, note: "Tragedy at its bleakest and grandest, once Hamlet has prepared you." },
      { title: "Volpone", author: "Ben Jonson", year: 1606, importance: 7, note: "City comedy and satire — the stage's other master beside Shakespeare." },
      { title: "The Duchess of Malfi", author: "John Webster", year: 1614, importance: 8, note: "Jacobean darkness at its height: corruption, horror, cold grandeur." },
      { title: "'Tis Pity She's a Whore", author: "John Ford", year: 1633, importance: 6, note: "The late, decadent edge of the tradition." },
    ],
  },

  // ---- Enlightenment / Neoclassical -----------------------------------------
  {
    movement: "Neoclassicism / Augustan",
    blurb: "Balance, wit and satire on classical models — order as an aesthetic and a weapon.",
    works: [
      { title: "The Rape of the Lock", author: "Alexander Pope", year: 1712, importance: 8, note: "Mock-epic brilliance — the Augustan style at its most delightful entry point." },
      { title: "Gulliver's Travels", author: "Jonathan Swift", year: 1726, importance: 10, note: "Satire as demolition; the age's sharpest prose." },
      { title: "A Modest Proposal", author: "Jonathan Swift", year: 1729, importance: 8, note: "The savage-irony masterpiece in miniature." },
      { title: "The Dunciad", author: "Alexander Pope", year: 1728, importance: 7, note: "Neoclassical satire turned on dullness itself." },
      { title: "Rasselas", author: "Samuel Johnson", year: 1759, importance: 7, note: "Moral fable and the century's reasoning conscience — a fitting close." },
    ],
  },
  {
    movement: "Enlightenment",
    blurb: "Reason, empiricism and social critique — the novel of ideas takes shape.",
    works: [
      { title: "Candide", author: "Voltaire", year: 1759, importance: 10, note: "The Enlightenment's comic bomb against optimism — start here." },
      { title: "Robinson Crusoe", author: "Daniel Defoe", year: 1719, importance: 8, note: "Empirical, self-made man; the novel learning to report the world." },
      { title: "Tom Jones", author: "Henry Fielding", year: 1749, importance: 8, note: "The comic panorama — society mapped with reasoning good humour." },
      { title: "Julie, or the New Heloise", author: "Jean-Jacques Rousseau", year: 1761, importance: 7, note: "Feeling pressing against reason — the hinge toward Romanticism." },
      { title: "Dangerous Liaisons", author: "Pierre Choderlos de Laclos", year: 1782, importance: 8, note: "Reason weaponised into cruelty; the epistolary form at its coldest." },
      { title: "Jacques the Fatalist", author: "Denis Diderot", year: 1796, importance: 7, note: "Philosophy playing with its own form — the summit for the patient." },
    ],
  },

  // ---- 19th century ---------------------------------------------------------
  {
    movement: "Romanticism",
    blurb: "Feeling, imagination, nature and the individual raised over reason and rule.",
    works: [
      { title: "Lyrical Ballads", author: "William Wordsworth & S. T. Coleridge", year: 1798, importance: 9, note: "The manifesto in verse — where English Romanticism begins." },
      { title: "Frankenstein", author: "Mary Shelley", year: 1818, importance: 9, note: "Romantic overreach as narrative; the most accessible way in." },
      { title: "The Complete Poems", author: "John Keats", year: 1820, importance: 9, note: "Sensuous beauty and the odes — Romantic lyric at its richest." },
      { title: "Selected Poetry", author: "Lord Byron", year: 1818, importance: 8, note: "The Byronic hero and satirical dash — Romanticism's public face." },
      { title: "The Sorrows of Young Werther", author: "Johann Wolfgang von Goethe", year: 1774, importance: 8, note: "The continental fever that lit the fuse." },
      { title: "Faust, Part One", author: "Johann Wolfgang von Goethe", year: 1808, importance: 10, note: "The movement's philosophical summit — striving without limit." },
    ],
  },
  {
    movement: "Transcendentalism",
    blurb: "American idealism — self-reliance, nature and the divine in the ordinary.",
    works: [
      { title: "Nature", author: "Ralph Waldo Emerson", year: 1836, importance: 9, note: "The founding essay — the whole worldview in a few pages." },
      { title: "Self-Reliance", author: "Ralph Waldo Emerson", year: 1841, importance: 8, note: "The doctrine of the sovereign individual, stated once and for all." },
      { title: "Walden", author: "Henry David Thoreau", year: 1854, importance: 10, note: "The idea lived out on a pond — the movement's enduring book." },
      { title: "Civil Disobedience", author: "Henry David Thoreau", year: 1849, importance: 7, note: "Conscience against the state — the ethical edge of the same thought." },
      { title: "Leaves of Grass", author: "Walt Whitman", year: 1855, importance: 9, note: "Transcendentalism become body and nation — the great outflowering." },
    ],
  },
  {
    movement: "Gothic",
    blurb: "Dread, ruins and the uncanny — terror as a mode from castle to modern house.",
    works: [
      { title: "The Castle of Otranto", author: "Horace Walpole", year: 1764, importance: 7, note: "Where it starts — the founding (and creaky) Gothic machine." },
      { title: "The Mysteries of Udolpho", author: "Ann Radcliffe", year: 1794, importance: 7, note: "Suspense and sublime landscape; the mode's first bestseller." },
      { title: "Frankenstein", author: "Mary Shelley", year: 1818, importance: 9, note: "Gothic fused with idea — dread that thinks." },
      { title: "Wuthering Heights", author: "Emily Brontë", year: 1847, importance: 9, note: "Gothic passion inland — the moor as haunted psyche." },
      { title: "Dracula", author: "Bram Stoker", year: 1897, importance: 9, note: "The genre's summit and template; read once the roots are clear." },
      { title: "The Turn of the Screw", author: "Henry James", year: 1898, importance: 8, note: "Gothic gone ambiguous — the ghost you can't prove." },
    ],
  },
  {
    movement: "Dark Romanticism",
    blurb: "Romanticism's shadow — sin, madness and the perverse in the American grain.",
    works: [
      { title: "The Tell-Tale Heart and Other Stories", author: "Edgar Allan Poe", year: 1843, importance: 9, note: "Start with the tales — dread and guilt distilled." },
      { title: "The Scarlet Letter", author: "Nathaniel Hawthorne", year: 1850, importance: 9, note: "Sin, shame and the Puritan dark — the movement's central novel." },
      { title: "Young Goodman Brown", author: "Nathaniel Hawthorne", year: 1835, importance: 7, note: "The allegory of universal complicity, in a single story." },
      { title: "Moby-Dick", author: "Herman Melville", year: 1851, importance: 10, note: "The summit: metaphysical obsession scaled to an ocean." },
      { title: "Benito Cereno", author: "Herman Melville", year: 1855, importance: 7, note: "Evil misread — the darkness turned toward history." },
    ],
  },
  {
    movement: "Realism",
    blurb: "Ordinary contemporary life rendered plainly — society observed, not idealised.",
    works: [
      { title: "Madame Bovary", author: "Gustave Flaubert", year: 1857, importance: 10, note: "The precise, pitiless template for everything after — begin here." },
      { title: "Middlemarch", author: "George Eliot", year: 1872, importance: 10, note: "The English realist summit: a whole town's moral life." },
      { title: "Anna Karenina", author: "Leo Tolstoy", year: 1877, importance: 10, note: "Realism at its most humane and total." },
      { title: "Fathers and Sons", author: "Ivan Turgenev", year: 1862, importance: 8, note: "A generational fracture rendered with quiet exactness." },
      { title: "The Portrait of a Lady", author: "Henry James", year: 1881, importance: 9, note: "Realism turning inward — consciousness as the real subject." },
      { title: "The Age of Innocence", author: "Edith Wharton", year: 1920, importance: 8, note: "Late, American realism — social pressure as tragedy." },
    ],
  },
  {
    movement: "Naturalism",
    blurb: "Realism plus determinism — heredity and environment as inescapable forces.",
    works: [
      { title: "Thérèse Raquin", author: "Émile Zola", year: 1867, importance: 8, note: "The clinical method announced — appetite and consequence." },
      { title: "Germinal", author: "Émile Zola", year: 1885, importance: 10, note: "The movement's masterpiece: the mine as fate." },
      { title: "McTeague", author: "Frank Norris", year: 1899, importance: 7, note: "American naturalism — greed and decline in San Francisco." },
      { title: "Sister Carrie", author: "Theodore Dreiser", year: 1900, importance: 8, note: "Desire and drift in the modern city, without judgement." },
      { title: "The Call of the Wild", author: "Jack London", year: 1903, importance: 7, note: "Determinism in the wild — instinct as destiny." },
    ],
  },
  {
    movement: "Regionalism / local colour",
    blurb: "Specific place, dialect and custom — the nation written from its corners.",
    works: [
      { title: "The Adventures of Huckleberry Finn", author: "Mark Twain", year: 1884, importance: 10, note: "The river, the vernacular — American local colour become universal." },
      { title: "The Country of the Pointed Firs", author: "Sarah Orne Jewett", year: 1896, importance: 8, note: "Coastal Maine rendered with quiet precision — the mode's quiet classic." },
      { title: "O Pioneers!", author: "Willa Cather", year: 1913, importance: 8, note: "The prairie as subject; place shaping character." },
      { title: "The Awakening", author: "Kate Chopin", year: 1899, importance: 8, note: "Creole Louisiana and a woman's interior — region opening onto modernity." },
      { title: "Winesburg, Ohio", author: "Sherwood Anderson", year: 1919, importance: 8, note: "The small town anatomised — regionalism turning modernist." },
    ],
  },
  {
    movement: "Symbolism",
    blurb: "Suggestion over statement — image, music and the ineffable against plain sense.",
    works: [
      { title: "The Flowers of Evil", author: "Charles Baudelaire", year: 1857, importance: 10, note: "The wellspring — modern beauty found in the city and the sordid." },
      { title: "A Season in Hell", author: "Arthur Rimbaud", year: 1873, importance: 9, note: "Adolescent fire; language breaking toward the visionary." },
      { title: "Poésies", author: "Stéphane Mallarmé", year: 1899, importance: 9, note: "Symbolism at its purest and hardest — the summit, saved for last." },
      { title: "Selected Poems", author: "Paul Verlaine", year: 1866, importance: 7, note: "'Music before everything' — the movement's ear." },
      { title: "Against Nature", author: "Joris-Karl Huysmans", year: 1884, importance: 8, note: "The Symbolist sensibility in prose — the decadent bible." },
    ],
  },
  {
    movement: "Aestheticism / Decadence",
    blurb: "Art for art's sake — beauty and sensation as their own justification.",
    works: [
      { title: "The Picture of Dorian Gray", author: "Oscar Wilde", year: 1890, importance: 10, note: "The movement's manifesto-as-novel — start here." },
      { title: "The Importance of Being Earnest", author: "Oscar Wilde", year: 1895, importance: 8, note: "Surface as substance; wit refined to pure style." },
      { title: "Against Nature", author: "Joris-Karl Huysmans", year: 1884, importance: 9, note: "The decadent's breviary of artificial pleasures." },
      { title: "Salomé", author: "Oscar Wilde", year: 1891, importance: 6, note: "Ornament and dread — Aestheticism at its most feverish." },
      { title: "Marius the Epicurean", author: "Walter Pater", year: 1885, importance: 7, note: "The philosophy stated in full — 'to burn with a hard, gemlike flame'." },
    ],
  },

  // ---- Modernist / early 20th century ---------------------------------------
  {
    movement: "Modernism",
    blurb: "Formal rupture and interior subjectivity after the 19th century's certainties collapsed.",
    works: [
      { title: "Heart of Darkness", author: "Joseph Conrad", year: 1899, importance: 8, note: "Start here: realism beginning to fracture — the hinge modernism swings from." },
      { title: "The Metamorphosis", author: "Franz Kafka", year: 1915, importance: 9, note: "Nightmare logic told deadpan — estrangement before the long books demand it." },
      { title: "The Great Gatsby", author: "F. Scott Fitzgerald", year: 1925, importance: 8, note: "The most compressed, accessible modernist novel — your way in." },
      { title: "Mrs Dalloway", author: "Virginia Woolf", year: 1925, importance: 9, note: "Consciousness across a single day — technique glimpsed in Gatsby, now the whole method." },
      { title: "The Waste Land", author: "T. S. Eliot", year: 1922, importance: 9, note: "The movement's defining poem — read once prose has taught its allusive logic." },
      { title: "The Sound and the Fury", author: "William Faulkner", year: 1929, importance: 9, note: "Fragmented time and voice — modernist difficulty, fully embraced." },
      { title: "Ulysses", author: "James Joyce", year: 1922, importance: 10, note: "The summit — every technique at once. Attempt it last." },
    ],
  },
  {
    movement: "Imagism",
    blurb: "The hard, clear image and everyday speech — no ornament, no abstraction.",
    works: [
      { title: "Des Imagistes", author: "Ezra Pound (ed.)", year: 1914, importance: 8, note: "The founding anthology — the doctrine in practice." },
      { title: "Sea Garden", author: "H. D.", year: 1916, importance: 9, note: "Imagism's purest voice: taut, mineral, exact." },
      { title: "Personae", author: "Ezra Pound", year: 1926, importance: 8, note: "The theorist's own images before the Cantos swallow him." },
      { title: "Spring and All", author: "William Carlos Williams", year: 1923, importance: 8, note: "'No ideas but in things' — the image made American." },
      { title: "Some Imagist Poets", author: "Amy Lowell (ed.)", year: 1915, importance: 6, note: "The movement organising (and quarrelling with) itself." },
    ],
  },
  {
    movement: "Stream of consciousness",
    blurb: "Narrative as the unmediated flow of thought — syntax bent to the mind's shape.",
    works: [
      { title: "The Metamorphosis", author: "Franz Kafka", year: 1915, importance: 6, note: "A gentle threshold — close third person pressed against a single consciousness." },
      { title: "Mrs Dalloway", author: "Virginia Woolf", year: 1925, importance: 9, note: "The technique at its most lucid and beautiful — start the method here." },
      { title: "To the Lighthouse", author: "Virginia Woolf", year: 1927, importance: 9, note: "Consciousness and time deepened — Woolf's fullest achievement." },
      { title: "The Sound and the Fury", author: "William Faulkner", year: 1929, importance: 9, note: "Interiority pushed to the edge of legibility." },
      { title: "Ulysses", author: "James Joyce", year: 1922, importance: 10, note: "The unbounded interior — Molly's soliloquy as the summit." },
    ],
  },
  {
    movement: "Surrealism",
    blurb: "Dream logic and the unconscious unleashed against rational order.",
    works: [
      { title: "Manifesto of Surrealism", author: "André Breton", year: 1924, importance: 8, note: "The programme announced — read the rules before the dreams." },
      { title: "Nadja", author: "André Breton", year: 1928, importance: 8, note: "Surrealism lived in Paris — chance, obsession, the marvellous." },
      { title: "Paris Peasant", author: "Louis Aragon", year: 1926, importance: 7, note: "The city as dream-text; mythology of the everyday." },
      { title: "Selected Poems", author: "Paul Éluard", year: 1926, importance: 7, note: "Surrealism's lyric tenderness." },
      { title: "The Lost Steps", author: "Alejo Carpentier", year: 1953, importance: 7, note: "The bridge onward — surreal method feeding magical realism." },
    ],
  },
  {
    movement: "Harlem Renaissance",
    blurb: "The early-20th-century flowering of Black American literature, music and art.",
    works: [
      { title: "The New Negro", author: "Alain Locke (ed.)", year: 1925, importance: 8, note: "The movement introducing itself — the defining anthology." },
      { title: "The Weary Blues", author: "Langston Hughes", year: 1926, importance: 9, note: "Jazz and blues made into poetry — the movement's signature voice." },
      { title: "Cane", author: "Jean Toomer", year: 1923, importance: 9, note: "A modernist mosaic of the Black South — the formal high-water mark." },
      { title: "Their Eyes Were Watching God", author: "Zora Neale Hurston", year: 1937, importance: 10, note: "The enduring novel — voice, desire and self-possession. Read last." },
      { title: "Passing", author: "Nella Larsen", year: 1929, importance: 8, note: "Identity and the colour line, taut as a thriller." },
    ],
  },
  {
    movement: "Lost Generation",
    blurb: "Expatriate American writers disillusioned by the First World War.",
    works: [
      { title: "The Sun Also Rises", author: "Ernest Hemingway", year: 1926, importance: 10, note: "The defining novel — the wound and the style, both new. Start here." },
      { title: "The Great Gatsby", author: "F. Scott Fitzgerald", year: 1925, importance: 9, note: "The dream souring; the era's other essential book." },
      { title: "A Farewell to Arms", author: "Ernest Hemingway", year: 1929, importance: 8, note: "The war itself, in the pared-down voice it produced." },
      { title: "Tender Is the Night", author: "F. Scott Fitzgerald", year: 1934, importance: 7, note: "The expatriate glamour decaying — the hangover after the party." },
      { title: "A Moveable Feast", author: "Ernest Hemingway", year: 1964, importance: 7, note: "The memoir that mythologised the whole generation — a fitting coda." },
    ],
  },

  // ---- Postwar / late 20th century ------------------------------------------
  {
    movement: "Existentialism",
    blurb: "Freedom, absurdity and meaning made rather than given.",
    works: [
      { title: "The Stranger", author: "Albert Camus", year: 1942, importance: 10, note: "The idea as a spare, unforgettable novel — the way in." },
      { title: "The Myth of Sisyphus", author: "Albert Camus", year: 1942, importance: 9, note: "The essay behind the novel — the absurd stated directly." },
      { title: "Nausea", author: "Jean-Paul Sartre", year: 1938, importance: 8, note: "Existence pressing on consciousness until it sickens." },
      { title: "Notes from Underground", author: "Fyodor Dostoevsky", year: 1864, importance: 9, note: "The 19th-century root — freedom as torment, read once the moderns land." },
      { title: "Being and Nothingness", author: "Jean-Paul Sartre", year: 1943, importance: 8, note: "The full philosophical system — the summit, for the committed." },
    ],
  },
  {
    movement: "Theatre of the Absurd",
    blurb: "A meaningless universe staged — logic and language visibly breaking down.",
    works: [
      { title: "The Bald Soprano", author: "Eugène Ionesco", year: 1950, importance: 8, note: "Language collapsing into nonsense — the mode at its most playful entry." },
      { title: "Waiting for Godot", author: "Samuel Beckett", year: 1953, importance: 10, note: "The central work — nothing happens, twice, unforgettably." },
      { title: "Endgame", author: "Samuel Beckett", year: 1957, importance: 9, note: "The absurd distilled to a bare, terminal room." },
      { title: "Rhinoceros", author: "Eugène Ionesco", year: 1959, importance: 7, note: "Absurdism turned political — conformity as contagion." },
      { title: "The Birthday Party", author: "Harold Pinter", year: 1957, importance: 7, note: "Menace beneath small talk — the absurd gone English." },
    ],
  },
  {
    movement: "Beat Generation",
    blurb: "Spontaneity and counterculture against postwar conformity.",
    works: [
      { title: "Howl and Other Poems", author: "Allen Ginsberg", year: 1956, importance: 10, note: "The incantation that launched it — read it aloud, first." },
      { title: "On the Road", author: "Jack Kerouac", year: 1957, importance: 10, note: "The movement's novel: motion, jazz, spontaneous prose." },
      { title: "Naked Lunch", author: "William S. Burroughs", year: 1959, importance: 8, note: "The Beat descent into the cut-up and the grotesque — the hard edge." },
      { title: "The Dharma Bums", author: "Jack Kerouac", year: 1958, importance: 7, note: "The gentler, Buddhist counterpart to On the Road." },
      { title: "A Coney Island of the Mind", author: "Lawrence Ferlinghetti", year: 1958, importance: 7, note: "The Beats' most popular verse — the movement at street level." },
    ],
  },
  {
    movement: "Nouveau Roman",
    blurb: "The French anti-novel — surfaces, objects and structure over plot and character.",
    works: [
      { title: "Jealousy", author: "Alain Robbe-Grillet", year: 1957, importance: 9, note: "The purest demonstration — perception without a stable narrator. Start here." },
      { title: "The Voyeur", author: "Alain Robbe-Grillet", year: 1955, importance: 7, note: "Objects and gaps; a crime you assemble yourself." },
      { title: "The Planetarium", author: "Nathalie Sarraute", year: 1959, importance: 8, note: "Sub-conversational tremors — the 'tropisms' beneath speech." },
      { title: "The Flanders Road", author: "Claude Simon", year: 1960, importance: 8, note: "Memory and war dissolved into one long sentence — the summit." },
      { title: "For a New Novel", author: "Alain Robbe-Grillet", year: 1963, importance: 6, note: "The theory, once the novels have shown you what it means." },
    ],
  },
  {
    movement: "Oulipo",
    blurb: "Writing under invented constraints — the workshop of potential literature.",
    works: [
      { title: "Exercises in Style", author: "Raymond Queneau", year: 1947, importance: 9, note: "One anecdote, ninety-nine ways — the constraint idea, delightfully. Begin here." },
      { title: "If on a winter's night a traveler", author: "Italo Calvino", year: 1979, importance: 9, note: "Structure as the story — Oulipo at its most seductive." },
      { title: "Life: A User's Manual", author: "Georges Perec", year: 1978, importance: 10, note: "A whole apartment block solved like a puzzle — the movement's summit." },
      { title: "A Void", author: "Georges Perec", year: 1969, importance: 8, note: "An entire novel without the letter 'e' — constraint as tour de force." },
      { title: "Invisible Cities", author: "Italo Calvino", year: 1972, importance: 8, note: "Combinatorial dream-cities — the constraint turned lyrical." },
    ],
  },
  {
    movement: "Magical realism",
    blurb: "The marvellous treated as ordinary within otherwise realist narration.",
    works: [
      { title: "Ficciones", author: "Jorge Luis Borges", year: 1944, importance: 9, note: "The precursor and toolkit — labyrinths and paradoxes, in miniature. Start here." },
      { title: "Pedro Páramo", author: "Juan Rulfo", year: 1955, importance: 9, note: "The short, haunted novel that made García Márquez possible." },
      { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez", year: 1967, importance: 10, note: "The movement's summit — a family and a town as myth." },
      { title: "The House of the Spirits", author: "Isabel Allende", year: 1982, importance: 7, note: "The mode carried into a later generation and history." },
      { title: "Midnight's Children", author: "Salman Rushdie", year: 1981, importance: 9, note: "Magical realism meets postcolonial India — the form gone global." },
      { title: "Beloved", author: "Toni Morrison", year: 1987, importance: 9, note: "The marvellous bearing the weight of history — the American summit." },
    ],
  },
  {
    movement: "Postmodernism",
    blurb: "Irony, pastiche and instability — scepticism toward grand narratives and the stable self.",
    works: [
      { title: "Slaughterhouse-Five", author: "Kurt Vonnegut", year: 1969, importance: 9, note: "Time-shuffled and darkly funny — the friendliest door in. Start here." },
      { title: "The Crying of Lot 49", author: "Thomas Pynchon", year: 1966, importance: 8, note: "Paranoia and pattern in a short, dazzling package." },
      { title: "White Noise", author: "Don DeLillo", year: 1985, importance: 9, note: "Consumer dread and media saturation — postmodern America named." },
      { title: "If on a winter's night a traveler", author: "Italo Calvino", year: 1979, importance: 8, note: "The novel about reading novels — self-awareness as pleasure." },
      { title: "Gravity's Rainbow", author: "Thomas Pynchon", year: 1973, importance: 10, note: "The maximalist summit — attempt it last, and gladly." },
      { title: "Infinite Jest", author: "David Foster Wallace", year: 1996, importance: 9, note: "Postmodernism straining back toward feeling — the late monument." },
    ],
  },
  {
    movement: "Metafiction",
    blurb: "Fiction that foregrounds its own artifice and the act of writing.",
    works: [
      { title: "If on a winter's night a traveler", author: "Italo Calvino", year: 1979, importance: 9, note: "The reader made the hero — metafiction at its most charming. Begin here." },
      { title: "Pale Fire", author: "Vladimir Nabokov", year: 1962, importance: 10, note: "A poem, a mad commentary, a novel hidden in the gap — the summit." },
      { title: "Lost in the Funhouse", author: "John Barth", year: 1968, importance: 8, note: "Stories about telling stories — American metafiction's set text." },
      { title: "The French Lieutenant's Woman", author: "John Fowles", year: 1969, importance: 8, note: "A Victorian novel that knows it's being written — self-awareness with heart." },
      { title: "At Swim-Two-Birds", author: "Flann O'Brien", year: 1939, importance: 8, note: "The riotous ancestor — characters revolting against their author." },
    ],
  },
  {
    movement: "Postcolonial literature",
    blurb: "Writing by and about former colonies and their aftermath.",
    works: [
      { title: "Things Fall Apart", author: "Chinua Achebe", year: 1958, importance: 10, note: "The founding novel — colonialism seen from within the culture it breaks. Start here." },
      { title: "Wide Sargasso Sea", author: "Jean Rhys", year: 1966, importance: 9, note: "Writing back to the canon — the madwoman given her own voice." },
      { title: "Midnight's Children", author: "Salman Rushdie", year: 1981, importance: 9, note: "Independence as epic and carnival — the form at full ambition." },
      { title: "A Grain of Wheat", author: "Ngũgĩ wa Thiong'o", year: 1967, importance: 8, note: "The costs of liberation — the movement's political conscience." },
      { title: "The God of Small Things", author: "Arundhati Roy", year: 1997, importance: 8, note: "Lyrical, intimate postcolonial India — the later summit." },
      { title: "Orientalism", author: "Edward W. Said", year: 1978, importance: 9, note: "The theory that named the field — read once the novels have grounded it." },
    ],
  },
  {
    movement: "Minimalism",
    blurb: "Spare, understated prose — meaning in the pause and the unsaid.",
    works: [
      { title: "What We Talk About When We Talk About Love", author: "Raymond Carver", year: 1981, importance: 10, note: "The style's purest statement — start with the stories that defined it." },
      { title: "Cathedral", author: "Raymond Carver", year: 1983, importance: 9, note: "Minimalism warming slightly — the same spareness, more grace." },
      { title: "Jesus' Son", author: "Denis Johnson", year: 1992, importance: 8, note: "Wrecked, luminous fragments — the mode at its most lyrical." },
      { title: "Self-Help", author: "Lorrie Moore", year: 1985, importance: 7, note: "Wit sharpening the understatement." },
      { title: "The Things They Carried", author: "Tim O'Brien", year: 1990, importance: 8, note: "Restraint under the weight of war — the summit." },
    ],
  },

  // ---- Contemporary ---------------------------------------------------------
  {
    movement: "Autofiction",
    blurb: "Autobiographical fiction blurring author and narrator.",
    works: [
      { title: "The Lover", author: "Marguerite Duras", year: 1984, importance: 8, note: "The luminous forerunner — memory rewritten as fiction. Begin here." },
      { title: "My Struggle: Book 1", author: "Karl Ove Knausgård", year: 2009, importance: 10, note: "The project that defined the term — the ordinary rendered without a filter." },
      { title: "Outline", author: "Rachel Cusk", year: 2014, importance: 9, note: "The self as a listening absence — autofiction's cool, radical turn." },
      { title: "The Neapolitan Novels", author: "Elena Ferrante", year: 2011, importance: 8, note: "Autofiction's questions worked through fiction's machinery." },
      { title: "The Years", author: "Annie Ernaux", year: 2008, importance: 9, note: "A life dissolved into a collective 'we' — the form's summit." },
    ],
  },

  // ---- Genre & cross-period forms -------------------------------------------
  {
    movement: "Epic poetry",
    blurb: "The long narrative poem of heroic deeds — the oldest ambition in literature.",
    works: [
      { title: "The Odyssey", author: "Homer", year: -725, importance: 10, note: "Story before scale — the most inviting way into epic." },
      { title: "The Iliad", author: "Homer", year: -750, importance: 10, note: "Rage and war — the fountainhead, read once Odysseus has drawn you in." },
      { title: "The Aeneid", author: "Virgil", year: -19, importance: 9, note: "Epic turned to empire and duty — Homer's Roman answer." },
      { title: "The Divine Comedy", author: "Dante Alighieri", year: 1320, importance: 10, note: "The Christian cosmos as journey — the medieval summit." },
      { title: "Paradise Lost", author: "John Milton", year: 1667, importance: 10, note: "Epic in English at its grandest — the form's late peak." },
    ],
  },
  {
    movement: "Tragedy",
    blurb: "The dramatic fall — character and fate colliding, from Athens onward.",
    works: [
      { title: "Oedipus Rex", author: "Sophocles", year: -429, importance: 10, note: "The perfect machine of tragedy — start with the model Aristotle chose." },
      { title: "The Oresteia", author: "Aeschylus", year: -458, importance: 9, note: "Vengeance becoming justice — tragedy as trilogy." },
      { title: "Medea", author: "Euripides", year: -431, importance: 9, note: "Passion against reason — the most modern of the Greeks." },
      { title: "Othello", author: "William Shakespeare", year: 1603, importance: 10, note: "Tragedy interiorised — jealousy engineered step by step." },
      { title: "Phèdre", author: "Jean Racine", year: 1677, importance: 8, note: "Neoclassical tragedy at its most controlled and consuming." },
      { title: "Death of a Salesman", author: "Arthur Miller", year: 1949, importance: 8, note: "The common man as tragic figure — the form made modern." },
    ],
  },
  {
    movement: "Medieval romance",
    blurb: "Chivalric quest and courtly adventure — knights, love and the marvellous.",
    works: [
      { title: "Sir Gawain and the Green Knight", author: "Anonymous (Pearl Poet)", year: 1400, importance: 10, note: "The single finest English romance — the ideal starting point." },
      { title: "The Knight of the Cart (Lancelot)", author: "Chrétien de Troyes", year: 1180, importance: 9, note: "The fountainhead of Arthurian courtly love." },
      { title: "Tristan", author: "Gottfried von Strassburg", year: 1210, importance: 8, note: "The great romance of doomed passion." },
      { title: "Le Morte d'Arthur", author: "Thomas Malory", year: 1485, importance: 10, note: "The whole Arthurian world gathered — the tradition's summit." },
      { title: "The Canterbury Tales", author: "Geoffrey Chaucer", year: 1400, importance: 8, note: "Romance among many modes — the form absorbed and gently mocked." },
    ],
  },
  {
    movement: "Satire",
    blurb: "Ridicule of vice and folly — a mode that recurs in every age.",
    works: [
      { title: "Candide", author: "Voltaire", year: 1759, importance: 10, note: "The fastest, funniest way in — optimism demolished in a hundred pages." },
      { title: "Gulliver's Travels", author: "Jonathan Swift", year: 1726, importance: 10, note: "Satire scaled from court to species — the towering model." },
      { title: "Animal Farm", author: "George Orwell", year: 1945, importance: 9, note: "The political fable at its most perfect and portable." },
      { title: "Catch-22", author: "Joseph Heller", year: 1961, importance: 9, note: "Bureaucracy and war turned to circular nightmare-comedy." },
      { title: "The Master and Margarita", author: "Mikhail Bulgakov", year: 1967, importance: 9, note: "The devil in Soviet Moscow — satire as glorious fantasy." },
      { title: "Catch-22 / Slaughterhouse-Five era close", author: "Kurt Vonnegut", year: 1963, importance: 7, note: "Cat's Cradle — apocalypse played for deadpan laughs." },
    ],
  },
  {
    movement: "Science fiction",
    blurb: "Speculative science, technology and futures — literature's laboratory.",
    works: [
      { title: "Frankenstein", author: "Mary Shelley", year: 1818, importance: 9, note: "The genre's origin — creation and consequence. Start at the source." },
      { title: "The War of the Worlds", author: "H. G. Wells", year: 1898, importance: 8, note: "The template for invasion and scientific dread." },
      { title: "Nineteen Eighty-Four", author: "George Orwell", year: 1949, importance: 9, note: "SF as political warning — the most consequential of all." },
      { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", year: 1969, importance: 10, note: "The genre grown fully literary — gender, culture, ambiguity. The summit." },
      { title: "Dune", author: "Frank Herbert", year: 1965, importance: 8, note: "World-building at epic scale — ecology, power, myth." },
      { title: "Neuromancer", author: "William Gibson", year: 1984, importance: 8, note: "Cyberpunk and the net imagined before it existed — the modern turn." },
    ],
  },
  {
    movement: "Dystopian fiction",
    blurb: "Cautionary imagined societies — the future as warning.",
    works: [
      { title: "Animal Farm", author: "George Orwell", year: 1945, importance: 8, note: "The short fable — the mechanics of tyranny, made simple. Start here." },
      { title: "Brave New World", author: "Aldous Huxley", year: 1932, importance: 9, note: "Control by pleasure rather than fear — the other half of the warning." },
      { title: "Nineteen Eighty-Four", author: "George Orwell", year: 1949, importance: 10, note: "The genre's summit — surveillance, language, the boot forever. Read last of the classics." },
      { title: "We", author: "Yevgeny Zamyatin", year: 1924, importance: 9, note: "The ancestor both Huxley and Orwell drew on." },
      { title: "Fahrenheit 451", author: "Ray Bradbury", year: 1953, importance: 8, note: "The book-burning parable — dystopia turned lyrical." },
      { title: "The Handmaid's Tale", author: "Margaret Atwood", year: 1985, importance: 9, note: "The tradition renewed — theocracy and the female body. The modern summit." },
    ],
  },
];

// --- Lookup + validation ---------------------------------------------------

const BY_MOVEMENT = new Map<Movement, CanonPath>(CANON_PATHS.map((p) => [p.movement, p]));

/** The curated path for a movement, or null if none is authored. */
export function canonPath(movement: string): CanonPath | null {
  return isMovement(movement) ? BY_MOVEMENT.get(movement) ?? null : null;
}

/** The home period for a path's movement (null for cross-period modes). */
export function canonPathPeriod(path: CanonPath): Period | null {
  return movementPeriod(path.movement);
}

/**
 * Dev-time integrity check: every path keys a valid taxonomy movement, no
 * movement appears twice, and no path is empty. Fails fast on an authoring slip
 * in development; skipped in production.
 */
function assertValidCanon(): void {
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const p of CANON_PATHS) {
    if (!isMovement(p.movement)) bad.push(`unknown movement: ${p.movement}`);
    if (seen.has(p.movement)) bad.push(`duplicate movement: ${p.movement}`);
    seen.add(p.movement);
    if (p.works.length === 0) bad.push(`empty path: ${p.movement}`);
    for (const w of p.works) {
      if (w.importance < 1 || w.importance > 10) {
        bad.push(`${p.movement} → "${w.title}" importance out of range: ${w.importance}`);
      }
    }
  }
  if (bad.length > 0) {
    throw new Error(`lib/canon/paths.ts invalid: ${bad.join("; ")}`);
  }
}

if (process.env.NODE_ENV !== "production") assertValidCanon();

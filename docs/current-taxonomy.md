# Current Taxonomy (in-app)

The controlled vocabulary **as implemented in the app** — the single source of
truth is [`lib/taxonomy.ts`](../lib/taxonomy.ts), which this document mirrors.
The CSV loader (`lib/books.ts`) validates every book against these lists and
**rejects any value not present**.

This mirrors [`docs/library-taxonomy.md`](library-taxonomy.md); both list exactly
the movements assigned in `data/all-books.tsv` — the authoritative canon.

Two independent axes:

- **Period** — *when* a work sits in literary history. One per work (or null).
- **Movement** — the *school or style*. One primary (or null) + zero or more
  secondary. A movement is assigned by **style, not date**, and may span periods.

---

## Periods (one per work)

In chronological order.

| Period | Approx. range |
|---|---|
| Classical / Antiquity | before c. 500 |
| Medieval | c. 500–1500 |
| Renaissance / Early Modern | c. 1500–1660 |
| Enlightenment / Neoclassical | c. 1660–1798 |
| Romantic | c. 1798–1837 |
| Victorian / 19th century | c. 1837–1901 |
| Modernist / early 20th century | c. 1901–1945 |
| Postwar / late 20th century | c. 1945–2000 |
| Contemporary | c. 2000–present |

---

## Movements (one primary + optional secondary)

Grouped by the period they are most associated with.

### Renaissance / Early Modern
- **Humanism** — classical revival, human-centred inquiry.

### Enlightenment / Neoclassical
- **Neoclassicism / Augustan** — balance, restraint, satire (Pope, Swift).

### 19th century
- **Romanticism** — emotion, imagination, nature, individualism.
- **Transcendentalism** — American idealist offshoot (Emerson, Thoreau).
- **Gothic** — dread, the uncanny, ruins and excess.
- **Dark Romanticism** — Romanticism's shadow side (Hawthorne, Melville, Poe).
- **Realism** — accurate depiction of ordinary contemporary life (Eliot, Flaubert, Tolstoy).
- **Naturalism** — realism plus determinism, environment as force (Zola, Dreiser).
- **Symbolism** — suggestion, imagery, the ineffable (Mallarmé, Baudelaire).
- **Aestheticism / Decadence** — art for art's sake (Wilde).

### Modernist / early 20th century
- **Modernism** — formal rupture, fragmentation, subjectivity.
- **Imagism** — precise, spare poetic image (Pound, H.D.).
- **Surrealism** — dream logic, the unconscious.
- **Futurism** — speed, machines, rupture with the past (Marinetti, Mayakovsky).
- **Expressionism** — distorted, anguished inner vision (Kafka, Trakl, Kaiser).
- **Dada** — anti-art, chance, provocation (Tzara, Ball, Schwitters).
- **Harlem Renaissance** — early-20th-c. African American flowering.

### Postwar / late 20th century
- **Existentialism** — freedom, absurdity, meaning-making (Camus, Sartre).
- **Theatre of the Absurd** — meaningless universe on stage (Beckett, Ionesco).
- **Beat Generation** — spontaneity, counterculture (Kerouac, Ginsberg).
- **Magical realism** — the marvellous within the everyday (García Márquez, Borges, Rushdie).
- **Postmodernism** — irony, metafiction, pastiche, instability (Pynchon, DeLillo).
- **Postcolonial literature** — writing by/about former colonies and their aftermath.

### Contemporary
- **New Sincerity** — post-ironic earnestness after postmodernism (Wallace, Saunders, Eggers).

---

## Assignment rules

1. Exactly one **period** per work (or null if genuinely unplaceable).
2. Exactly one **primary movement** (or null); secondary movements optional.
3. A movement may span periods — assign by style, not the calendar.
4. Where a work fits none well, prefer **null** over forcing a label. A genre
   (e.g. crime, science fiction) is *not* a movement — leave its movement null.
5. The import CSV (and, later, the LLM scanning path) must draw only from this
   approved list; new labels are proposed separately, never invented inline.

## Notes
- The taxonomy contains only movements present in `data/all-books.tsv` (plus
  `Humanism` and `Dark Romanticism`, which appear there as secondary tags). Keep
  this document, `docs/library-taxonomy.md`, and `lib/taxonomy.ts` in sync when
  the vocabulary changes.
- Non-Western and national traditions (e.g. Norwegian) remain lightly represented;
  add labels if the collection needs them.

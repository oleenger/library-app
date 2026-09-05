# Literary Taxonomy — Periods & Movements

A starting **controlled vocabulary** for the library app, drawn from the standard literary-history canon (as used in academic reference lists and literature curricula). Two independent axes:

- **Period** — *when* a work sits in literary history. Broad, roughly mutually exclusive time buckets. Each work gets **one**.
- **Movement** — the *school or style* a work belongs to. Each work gets **one primary**, plus **zero or more secondary**. May be null where no useful label applies.

Dates are approximate and Anglo-European-centric by default; treat boundaries as fuzzy. Approve, trim, or extend before finalising the import CSV.

---

## Periods (one per work)

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

Grouped by the period they are most associated with, but a movement is assigned by *style*, not date.

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
4. Where a work fits none well, prefer **null** over forcing a label. A genre (e.g. crime, science fiction) is *not* a movement — leave such works' movement null.
5. This list is authoritative and mirrors the movements assigned in `data/all-books.tsv`. The LLM (scanning path) and the import CSV must draw only from it; new labels are proposed separately, never invented inline.

## Notes
- The taxonomy contains only movements present in `data/all-books.tsv` (plus `Humanism` and `Dark Romanticism`, which appear there as secondary tags).
- Non-Western and national traditions (e.g. Norwegian) are only lightly represented here; add labels if the collection needs them.

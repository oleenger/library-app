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
- **Enlightenment** — reason, empiricism, social critique.

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
- **Stream of consciousness** — interior mental flow (Joyce, Woolf).
- **Surrealism** — dream logic, the unconscious.
- **Harlem Renaissance** — early-20th-c. African American flowering.
- **Lost Generation** — expatriate postwar disillusion (Hemingway, Fitzgerald).

### Postwar / late 20th century
- **Existentialism** — freedom, absurdity, meaning-making (Camus, Sartre).
- **Theatre of the Absurd** — meaningless universe on stage (Beckett, Ionesco).
- **Beat Generation** — spontaneity, counterculture (Kerouac, Ginsberg).
- **Nouveau Roman** — anti-novel, French formal experiment (Robbe-Grillet).
- **Magical realism** — the marvellous within the everyday (García Márquez, Borges, Rushdie).
- **Postmodernism** — irony, metafiction, pastiche, instability (Pynchon, DeLillo).
- **Metafiction** — fiction foregrounding its own artifice.
- **Postcolonial literature** — writing by/about former colonies and their aftermath.

### Contemporary
- **Contemporary literary fiction** — general label for present-day literary work without a sharper movement.
- **Autofiction** — autobiographical fiction blurring author and narrator (Ferrante, Knausgård, Louis).

### Genre & cross-period forms
Assigned by style, not date; these reach classical/medieval and genre works the era-grouped list above does not.
- **Epic poetry** — long narrative poem of heroic deeds (Homer, Virgil, Dante, Milton).
- **Satire** — ridicule of vice and folly (Chaucer, Swift, Heller).
- **Science fiction** — speculative science, technology and futures.
- **Dystopian fiction** — cautionary imagined societies.

---

## Assignment rules

1. Exactly one **period** per work (or null if genuinely unplaceable).
2. Exactly one **primary movement** (or null); secondary movements optional.
3. A movement may span periods — assign by style, not the calendar.
4. Where a work fits none well, prefer **null** over forcing a label.
5. The LLM (scanning path) and the import CSV must both draw only from this approved list; new labels are proposed separately, never invented inline.

## Notes
- This list favours breadth of coverage for a general literary collection. Trim movements you'll never use to keep filtering clean.
- Non-Western and national traditions (e.g. Norwegian) are only lightly represented here; add labels if the collection needs them.

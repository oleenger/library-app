# Personal Library App

## Project proposal and consultant handover

**Status:** Ready for technical estimation and implementation proposal  
**Product owner:** Single private user  
**Collection size:** Approximately 3,000 books  
**Primary devices:** Android phone and laptop  
**Reference design:** https://personal-library-design.ole-enger.chatgpt.site

## 1. Purpose

Build a private web application that combines:

1. A catalogue of physical books owned by the user.
2. A reading record covering books read, whether or not they are currently owned.

The distinguishing feature is that books are organised by **literary period and movement**. For the initial collection these classifications are supplied by the user in the import CSV; for books added later by barcode scan they are generated with an LLM and reviewed by the user. Existing services such as Goodreads and LibraryThing do not make this classification axis central to browsing.

The application should be installable as a PWA and work well on both phone and laptop.

## 2. Product principles

- The application is for one user, not a general-purpose commercial product.
- Owned books and reading history are related but independent.
- Classification quality matters more than minimising an already small LLM cost.
- LLM output is a suggestion; the user remains the authority.
- Corrections must be retained and never silently overwritten.
- The interface should feel like a personal library, not an analytics dashboard.
- Book covers should be visually prominent.
- Keep the architecture small and understandable. Avoid unnecessary frameworks and abstraction layers.

## 3. Core domain model

The implementation must distinguish four concepts:

| Concept | Example |
|---|---|
| Work | *Ulysses* by James Joyce |
| Edition | Everyman's Library hardback with ISBN 9781857151008 |
| Owned copy | The physical copy on a particular shelf |
| Reading event | Read in August 2026 and rated five stars |

This distinction is required because the user may:

- Own a book that has not been read.
- Have read a book that is not owned.
- Own more than one edition of the same work.
- Read the same work more than once.
- Import a Goodreads record and later scan an owned edition of the same work.

## 4. Primary user experience

### 4.1 Library

The main view of books physically owned.

- Cover-led grid with an optional compact list view.
- Search by title and author.
- Filter by period, movement and read status.
- Sort by author, title, publication year, acquisition date and rating.
- Clear indication of whether a work has been read.
- Selecting a book opens its work and edition details.

### 4.2 Reading record

A chronological record of all books read.

- Group readings by year.
- Show cover, title, author, reading date and rating.
- Support rereads as separate events.
- Search and filter independently of ownership.
- Provide small summary figures, without turning the page into a statistics dashboard.

### 4.3 Book detail

One page combining work, classification, owned edition and reading information.

- Title, author and original publication year.
- Prominent cover.
- Literary period, primary movement and optional secondary movements.
- Short explanation of the classification.
- Edition details: ISBN, publisher, year, language and format.
- Copy details: ownership, acquisition date, location/shelf and notes.
- Reading events with dates, ratings and notes.
- Fast editing of all user-controlled fields.

The reference mockup demonstrates these three pages and the intended visual direction. It is not a complete workflow specification.

## 5. Book intake

### 5.1 Initial import (one-time standalone script)

The initial collection is loaded once from a CSV that the user has already fully populated — including period and movement. This is a **standalone migration script, not an application feature.** There is no import UI, no rerun-safety, no reconciliation and no LLM involvement for this batch.

- The CSV carries all fields, including period, movement, reading dates and ratings.
- The script is purely mechanical: parse → validate → insert.
- **Validate every period and movement value against the controlled taxonomy** and reject or report any value not in it. The taxonomy must therefore be finalised before the CSV is finalised.
- Import works, editions (where ISBN present), reading dates and ratings.
- Treat imported readings as reading history, not proof of current ownership.
- Preserve missing values rather than inventing them.
- Produce a load summary: inserted and rejected-for-review.
- Retain the script and its source CSV after the run as the clean backup of the reviewed collection, at least until in-app export exists.

### 5.2 Barcode scanning

Allow the phone camera to scan EAN-13/ISBN barcodes when adding owned books.

- Use the browser Barcode Detection API where supported.
- Use `@zxing/browser` as the fallback.
- Resolve ISBN metadata through Google Books first and Open Library second.
- Match the edition to an existing work where possible.
- Ask for confirmation before saving a suggested match.
- Provide manual entry when scanning or metadata lookup fails.

Scanning identifies an edition. Literary classification belongs to the work and must not be duplicated for every edition.

### 5.3 Manual entry

Allow works, editions, copies and readings to be entered or corrected without an ISBN or external metadata result.

## 6. LLM-assisted classification

**Scope:** LLM classification applies **only to books added later by barcode scan**, which arrive with no period or movement. The initial collection is already classified via the import CSV (section 5.1) and does not use the LLM. This is therefore a low-volume convenience path, not a bulk operation.

### 6.1 Provider decision

Use the **Anthropic API directly**, called only from the server-side application.

- Preferred quality model: Claude Sonnet, with the exact model identifier held in configuration.
- Use the normal Messages API for individual scanned additions. (No bulk/batch run is required, since the initial collection is classified via CSV.)
- Do not route through Vertex AI for this personal Vercel-hosted application.
- Do not use LangChain or a comparable orchestration framework.
- Keep a small internal provider interface so another implementation can be added later.

```ts
interface BookClassifier {
  classify(book: BookMetadata): Promise<BookClassification>;
}
```

### 6.2 Classification input

Provide the model with:

- Title and author.
- Original publication year.
- Original language when known.
- Short synopsis or reliable metadata description when available.
- The approved classification taxonomy and definitions.

A stronger model cannot compensate for missing or incorrect source metadata. Metadata should therefore be resolved before classification.

### 6.3 Classification output

Use a strict Anthropic tool schema rather than requesting free-form JSON. Validate the result with Zod before persistence.

```json
{
  "period": "Postmodernism",
  "primary_movement": "Postcolonial literature",
  "secondary_movements": ["Magical realism"],
  "confidence": 0.91,
  "explanation": "Brief reason for the classification",
  "needs_review": false
}
```

The model must:

- Select from the approved taxonomy by default.
- Be allowed to return `uncertain` or `not_applicable`.
- Suggest a new taxonomy label separately rather than silently inventing one.
- Give a concise explanation.
- Mark ambiguous or weakly supported results for review.

Model confidence is only a review signal and must not be treated as a calibrated probability.

### 6.4 Classification persistence

Store:

- Original model suggestion.
- Final user-approved classification.
- Classification status: `unreviewed`, `accepted`, `corrected` or `uncertain`.
- Provider and model identifier.
- Prompt/taxonomy version.
- Confidence and explanation.
- Timestamp.

Once a classification has been accepted or corrected, it must not be replaced automatically. Reclassification must be an explicit user action.

### 6.5 Classification review

Provide a fast review surface, even though it is not part of the three-page visual mockup.

- Review one work quickly without leaving the queue.
- Accept the suggestion in one action.
- Edit period and movements inline.
- Prioritise uncertain and low-confidence results.
- Support bulk acceptance for clearly correct results.
- Show unclassified and unreviewed counts in filters.

## 7. Taxonomy

The taxonomy must be controlled and editable rather than embedded in prompts or source code.

Recommended structure:

- One primary period.
- One primary movement.
- Zero or more secondary movements.
- Definitions and optional date guidance for every permitted label.
- Nullable classification for works that resist a useful single label.

Example:

| Work | Period | Primary movement | Secondary movement |
|---|---|---|---|
| *Midnight's Children* | Postmodernism | Postcolonial literature | Magical realism |

The product owner must approve the initial taxonomy before the complete import is classified.

## 8. Suggested data model

| Table | Purpose |
|---|---|
| `authors` | Canonical author records |
| `works` | Title, original year, language and description |
| `work_authors` | Supports multiple authors and editors |
| `editions` | ISBN, publisher, edition year, language, format and cover |
| `copies` | Ownership, acquisition, location and copy-specific notes |
| `reading_events` | Date read, rating and reading notes |
| `periods` | Controlled period taxonomy |
| `movements` | Controlled movement taxonomy |
| `work_movements` | Primary and secondary movement assignments |
| `classification_runs` | Suggestions, final results, versions and status (scanned additions) |

Period and movement fields must be nullable. Database constraints should prevent duplicate ISBN editions and accidental duplicate reading events where practical, while still allowing explicit overrides.

## 9. Proposed technology

| Area | Choice |
|---|---|
| Application | Next.js and TypeScript |
| UI | Tailwind CSS and shadcn/ui |
| Database | Supabase Postgres |
| Authentication | Supabase Auth with RLS |
| Hosting | Vercel |
| LLM | Direct Anthropic API |
| Runtime validation | Zod |
| Barcode fallback | `@zxing/browser` |
| Metadata | Google Books, then Open Library |
| PWA/service worker | Serwist |
| Offline catalogue | IndexedDB through Dexie |
| CSV parsing | Papa Parse |
| Schema management | Supabase CLI SQL migrations |
| Testing | Vitest and Playwright |

Do not add Prisma unless the consultant can demonstrate a concrete benefit. Supabase-generated TypeScript types and SQL migrations should be sufficient.

## 10. Offline behaviour

- The application shell and most recently synchronised catalogue should be browsable offline.
- Search and filtering should continue to work against the local catalogue.
- Editing while offline is explicitly out of scope for the first version.
- The interface must clearly indicate when an action requires a connection.

At this scale, downloading the complete lightweight catalogue for local browsing is acceptable. Cover images can use normal browser caching and do not all need to be guaranteed offline.

## 11. Security and operations

- Anthropic and metadata API credentials must never be exposed to the browser.
- Store secrets in Vercel environment variables.
- Apply Supabase RLS to all user data.
- Restrict the deployed application to the owner.
- Validate all external metadata and LLM responses before persistence.
- Set provider spend limits where available.
- Log classification failures and metadata-source provenance without logging secrets.
- Provide full export of the user's data in a documented JSON and/or CSV format.

## 12. Design direction

- Modern, quiet and editorial.
- Light mode using warm paper tones rather than pure white.
- Restrained serif typography for titles, with a neutral sans-serif interface font.
- Book covers provide the dominant colour and visual interest.
- Literary periods may use subtle colour coding, but colour must not be the only indicator.
- Avoid dense cards, excessive statistics, gradients and generic dashboard styling.
- Responsive desktop and mobile layouts.
- Touch targets and camera interactions must work well on Android Chrome.

## 13. Scope for the first release

### Included

- Single-user authentication.
- One-time standalone CSV load script (taxonomy-validated, no LLM).
- Work, edition, copy and reading-event management.
- Library and reading-history browsing.
- Search, filtering and sorting.
- Book detail and editing.
- Barcode scanning and metadata lookup.
- LLM classification and review (scanned additions only).
- Scanned-edition to existing-work matching and manual merge resolution.
- PWA installation and offline browsing.
- Data export and basic operational logging.

### Explicitly excluded

- Live Goodreads synchronisation.
- Multiple users or household sharing.
- Social features, recommendations or public profiles.
- Native Android or iOS applications.
- Offline editing and conflict resolution.
- Automatic web research for every classification.
- Fine-tuning an LLM.
- A general-purpose agent framework.

## 14. Delivery approach

### Phase 1 — Domain and taxonomy

- Agree the work/edition/copy/reading model.
- Create and approve the controlled taxonomy (periods and movements, with clear definitions distinguishing the two axes). This must be finalised before the import CSV is finalised.
- Validate the LLM classifier against a small benchmark for the *scanning* path only (period/movement on unseen titles), since the initial collection is user-classified.

### Phase 2 — Foundation and load

- Establish project, database, authentication and migrations.
- Build the standalone CSV load script (taxonomy validation, mechanical insert, load summary).
- Implement work, edition, copy and reading-event CRUD.
- Add export and backup capability early.

### Phase 3 — Core application

- Implement Library, Reading record and Book detail based on the reference design.
- Add search, filters and responsive layouts.
- Add taxonomy administration and classification review.

### Phase 4 — Physical-library intake

- Add barcode scanning.
- Integrate metadata providers.
- Implement matching of scanned editions to imported works.
- Add manual fallback and duplicate resolution.

### Phase 5 — PWA and production readiness

- Add offline catalogue synchronisation.
- Complete automated tests and mobile testing.
- Validate accessibility, performance, RLS and secret handling.
- Deploy production version and provide concise operating documentation.

## 15. Acceptance criteria

### Data integrity

- Owned status and reading history can be managed independently.
- Multiple editions and rereads are represented without duplicating the underlying work.
- The CSV load rejects any period/movement value outside the taxonomy rather than inserting it.
- Scanning an edition already related to a loaded work offers a match instead of creating a second work.
- Complete user data can be exported without vendor-specific tooling.

### Classification

- All LLM results (scanned additions) conform to the agreed schema or fail safely into review.
- Every result retains provider, model, prompt/taxonomy version and original suggestion.
- User corrections survive metadata refreshes and are never silently overwritten.
- Uncertain and unreviewed works can be found and corrected efficiently.

### User experience

- Library, Reading record and Book detail work on current Android Chrome and a modern desktop browser.
- Covers are displayed prominently with a graceful fallback when unavailable.
- Search and filters remain responsive with at least 3,000 works.
- The catalogue remains browsable offline after synchronisation.
- Online-only actions are clearly indicated when offline.

### Security

- No provider credential is present in client-side code or network responses.
- Database RLS prevents access without the owner's authenticated session.
- External metadata and LLM output are validated before database insertion.

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Literary classification is subjective | Controlled taxonomy, explanations and user approval |
| Obscure books lack sufficient model knowledge | Resolve reliable descriptions first and route uncertain cases to review |
| Loaded and scanned records create duplicates | Separate work/edition model; scan matches against existing works |
| Norwegian edition metadata is incomplete | Provider fallback and efficient manual entry |
| External cover links disappear | Store source provenance and permit manual cover replacement |
| Taxonomy changes later | Version taxonomy and support explicit reclassification |
| Scope expands into a commercial product | Treat single-user constraints as deliberate architectural requirements |

## 17. Open decisions for the product owner

These should not block initial technical estimation, but should be resolved during Phase 1:

- Final application name.
- Approved period and movement taxonomy — **blocks finalising the import CSV**, so resolve first. Define period (era) and movement (school/style) as distinct axes to avoid conflation.
- Whether shelf/location tracking is required in the first release.
- Whether acquisition date and price should be stored.
- Whether cover images should remain external or be cached in owned storage.
- Whether ISBNdb or another paid metadata source should be added if free-provider coverage proves insufficient.
- Exact benchmark acceptance threshold for classification quality.

## 18. Expected consultant response

The consultant should return:

- Confirmation or proposed changes to the architecture, with reasons.
- Delivery estimate by phase.
- Fixed-price or time-and-materials proposal.
- Identification of assumptions and excluded work.
- Approach to Goodreads reconciliation and duplicate handling.
- Proposed classification benchmark and evaluation method.
- Testing and deployment plan.
- Handover expectations: source repository, migrations, environment setup, operating notes and ownership of all accounts and data.

This is a small application in infrastructure terms, but not merely standard CRUD. The main implementation quality will be determined by the domain model, duplicate reconciliation and classification review experience.

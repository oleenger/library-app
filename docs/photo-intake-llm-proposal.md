# Photo Book Intake — Conceptual Proposal

**Status:** Concept for discussion (pre-implementation)
**Scope:** High-level only. Implementation detail deferred to a later document.
**Relates to:** `personal-library-app-project-proposal.md` §5 (Book intake), §6 (LLM classification)

## 1. Idea in one sentence

Point the phone camera at a shelf of books, take a picture, and let an LLM read the spines/covers and turn them into structured book rows — the same shape as the initial import CSV — ready for the user to review and add to the library.

## 2. Why

- Barcode scanning (existing plan, §5.2) adds **one book at a time** and needs a readable EAN-13. Many shelves, older books and foreign editions don't cooperate.
- A photo captures **many books at once**. It is the fastest way to bulk-add physical books that are already on a shelf.
- The user already owns ~3,000 books. Photo intake is the natural companion to the one-time CSV migration for anything acquired later in batches.

## 3. What the user sees

1. **Capture** — open the camera in the app, photograph a shelf (or a stack of covers). Multiple photos allowed per session.
2. **Extract** — the app sends the photo to the server; the LLM identifies each visible book.
3. **Review** — a candidate list appears: cover thumbnail (from the photo crop or resolved metadata), title, author, confidence. The user confirms, edits or discards each row.
4. **Add** — confirmed rows are matched against existing works/editions and saved.

The user is always the authority. Nothing is added silently. This mirrors the existing principle that "LLM output is a suggestion."

## 4. The core process: photo → CSV → library

The extraction step produces the **same CSV row shape as the initial migration** (§5.1). This is deliberate:

- One well-understood data contract for "a batch of books to add."
- The photo path becomes a *generator* of that CSV; the existing validation and insert logic is reused.
- Reviewing a photo batch and reviewing an imported CSV become the same mental model.

```
 Phone photo(s)
        │
        ▼
  [ LLM extraction SKILL ]  ── identifies books, emits candidate rows
        │
        ▼
   Candidate CSV / rows  (title, author, year?, isbn?, confidence, source_photo)
        │
        ▼
   Metadata resolution   (Google Books → Open Library, as in §5.2)
        │
        ▼
   User review & edit     (confirm / correct / discard)
        │
        ▼
   Match & insert         (reuse §5.1 taxonomy-validated insert path)
```

Classification (period/movement, §6) runs **after** the book is confirmed, on the resolved work — not from the photo. The photo answers *"which books are these?"*, not *"how are they classified?"*.

## 5. The SKILL

Extraction is driven by a **skill**: a self-contained, versioned instruction set the LLM follows to turn an image into structured book candidates. Conceptually it defines:

- **Task** — read every distinguishable book in the image; return one row per book.
- **Output contract** — a strict schema (title, author, best-guess year, visible ISBN if legible, per-book confidence, and a note when a spine is partially obscured). Same discipline as §6.3: tool schema, not free-form JSON.
- **Behaviour rules** — never invent a book that isn't visible; flag low-confidence and unreadable spines for review rather than guessing; return a bounding hint so the app can crop a thumbnail.

Keeping this as a skill (rather than an inline prompt) means it can be versioned, tested against sample shelf photos, and improved without touching application code — consistent with keeping the taxonomy and prompts out of source (§7).

## 6. How it fits the existing architecture

| Concern | Reuse from existing proposal |
|---|---|
| LLM provider | Direct Anthropic API, server-side only (§6.1), using a vision-capable Claude model |
| Output validation | Strict tool schema + Zod before persistence (§6.3) |
| Metadata resolution | Google Books then Open Library (§5.2) |
| Insert & taxonomy | Reuse the CSV insert/validation path (§5.1) |
| Review surface | Extends the classification review model (§6.5) to a per-photo candidate queue |
| Data model | New `intake_batches` / candidate records; confirmed rows flow into `works`/`editions`/`copies` |
| Security | Photo and API key stay server-side; no credentials in the browser (§11) |

## 7. Deliberately out of scope (for this concept)

- Real-time / live camera detection. This is capture-then-process, not a viewfinder overlay.
- Guaranteed extraction of every spine in a dense or blurry photo — unreadable books are simply skipped and flagged.
- Automatic classification from the image.
- Offline extraction (requires the server + LLM).

## 8. Open questions for later depth

- Photo composition guidance — one shelf per shot, or freeform?
- How aggressively to auto-resolve metadata vs. leave for user review.
- Whether to store the original photos (as provenance for a batch) or discard after extraction.
- Confidence threshold for auto-suggesting a match vs. forcing manual confirmation.
- Cost/latency envelope per photo and per batch.

## 9. Implementation suggestions

The model reading is verified, so this section covers the plumbing. Stack is Next.js 15 (App Router), React 19, TypeScript — suggestions align with that.

### 9.1 Capture (client)

Rear camera on Android Chrome / iOS Safari with one attribute — no camera SDK:

```tsx
<input type="file" accept="image/*" capture="environment"
       multiple onChange={onPick} />
```

Downscale before upload to control token cost and latency. Longest edge ~1600px keeps spine text legible while cutting a 10 MB photo to a few hundred KB:

```ts
async function downscale(file: File, maxEdge = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(bmp.width * scale, bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}
```

### 9.2 Upload + extract (server)

A route handler keeps the API key server-side. Send the image to a vision-capable Claude model with the extraction skill and a **tool schema** so the response is structured, not free-form:

```ts
// app/api/intake/extract/route.ts
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("photo") as File;
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic(); // ANTHROPIC_API_KEY from env
  const msg = await client.messages.create({
    model: process.env.CLASSIFIER_MODEL!,        // hold model id in config
    max_tokens: 2048,
    tools: [EXTRACT_BOOKS_TOOL],                  // strict schema, see 9.3
    tool_choice: { type: "tool", name: "extract_books" },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
        { type: "text", text: EXTRACTION_SKILL }, // the versioned skill (§5)
      ],
    }],
  });

  const candidates = extractToolResult(msg); // validate with Zod before returning
  return Response.json({ candidates });
}
```

New deps: `@anthropic-ai/sdk` and `zod`. Set `export const runtime = "nodejs"` and cap upload size on the route.

### 9.3 Extraction contract (the skill's output)

One tool, one row per book, confidence per book:

```ts
const EXTRACT_BOOKS_TOOL = {
  name: "extract_books",
  description: "Return one entry per distinguishable book visible in the image.",
  input_schema: {
    type: "object",
    properties: {
      books: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:      { type: "string" },
            author:     { type: "string" },
            year:       { type: "integer" },      // best guess, optional
            isbn:       { type: "string" },       // only if legible
            confidence: { type: "number" },       // 0..1
            unreadable: { type: "boolean" },      // partially obscured spine
          },
          required: ["title", "author", "confidence"],
        },
      },
    },
    required: ["books"],
  },
} as const;
```

Mirror this with a Zod schema and parse the tool result before it leaves the server — same discipline as §6.3. Reject/flag anything that fails rather than persisting it.

### 9.4 From candidates to library

1. **Resolve metadata** — for each confirmed candidate, look up Google Books → Open Library (§5.2) to fill ISBN, cover, publisher.
2. **Review UI** — a candidate list per photo: thumbnail, title, author, confidence badge; confirm / edit / discard. Sort lowest-confidence first. Reuse the review patterns from §6.5.
3. **Match & insert** — feed confirmed rows through the existing CSV insert/taxonomy path (§5.1), matching against existing works to avoid duplicate `works`.
4. **Classify** — run §6 classification *after* insert, on the resolved work — not from the photo.

### 9.5 Suggested data model additions

| Table | Purpose |
|---|---|
| `intake_batches` | One row per capture session: created-at, photo count, status |
| `intake_candidates` | Extracted rows: batch id, raw LLM fields, confidence, resolved metadata, review status (`pending`/`confirmed`/`discarded`), linked work/edition once inserted |

Keeping candidates as their own table means a batch can be reviewed over time and provides provenance ("this book came from photo X").

### 9.6 Build order

1. Static `<input capture>` → route handler → log the parsed candidates (prove the pipe).
2. Add client downscale + Zod validation.
3. Add the candidate table + review UI.
4. Wire metadata resolution and the existing insert/match path.
5. Trigger classification on confirmed works.

Steps 1–2 are the "plumbing" and are small; the review UI (step 3) is the main product work.

## 10. Summary

Photo intake is a **bulk, LLM-driven front door** to the same book-adding pipeline the CSV migration already uses. A versioned skill turns an image into candidate rows; everything downstream — metadata, review, taxonomy, insert — is existing machinery. It complements barcode scanning (precise, single) with a fast, batch-oriented path, while keeping the user firmly in control.

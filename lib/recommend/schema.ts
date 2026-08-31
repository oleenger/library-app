// The recommendation contract: one Anthropic tool ("recommend_books") whose
// output is validated with a mirrored Zod schema before it leaves the server.
// The model returns books NOT in the library, each tied to a concrete reason
// grounded in the reader's history. Period/movement enums are drawn from the
// taxonomy so the classification stays in-vocabulary and browseable later.

import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { MOVEMENTS, PERIODS } from "../taxonomy";

// --- Anthropic tool schema (JSON Schema) ---------------------------------

export const RECOMMEND_BOOKS_TOOL: Anthropic.Tool = {
  name: "recommend_books",
  description:
    "Recommend books the reader has NOT read yet, chosen from their demonstrated " +
    "taste (highly-rated works, favoured periods/movements/authors). Never " +
    "recommend a book already present in the provided library. Each pick must " +
    "cite concrete evidence from the reading history.",
  input_schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        description: "Between 3 and 8 recommendations, best first.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Work title." },
            author: { type: "string", description: 'Natural order "First Last".' },
            first_published: { type: "integer", description: "Best-guess year first published." },
            period: { type: "string", enum: [...PERIODS], description: "One literary period." },
            primary_movement: { type: "string", enum: [...MOVEMENTS], description: "One primary movement, or omit if none fits." },
            reason: {
              type: "string",
              description:
                "1-2 sentences tying this pick to specific evidence in the reader's " +
                "history (name the read titles/authors/movements that motivate it).",
            },
            confidence: { type: "number", description: "0..1 confidence this is a strong match for the reader." },
          },
          required: ["title", "author", "reason", "confidence"],
        },
      },
    },
    required: ["recommendations"],
  },
};

// --- Zod mirror (validated before persistence) ---------------------------

export const RecommendationSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  first_published: z.number().int().nullish(),
  period: z.enum(PERIODS).nullish(),
  primary_movement: z.enum(MOVEMENTS).nullish(),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const RecommendResultSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// --- Canon gaps ----------------------------------------------------------
// A structural view, not a taste view: the foundational canon of the periods
// and movements the reader favours. Each work is scored 1..10 by how
// foundational it is (10 = a cornerstone every serious library must hold, e.g.
// Pride and Prejudice for Romanticism, Gravity's Rainbow for Postmodernism) and
// given a reading `order` within its area. The list includes works the reader
// already owns (waypoints) alongside the ones they lack (gaps), so the same data
// renders either as a ranked gap list ("By importance") or an ordered reading
// path ("As a path"). Owned/gap status is a live join against holdings, done in
// the view — not baked into the model output.

export const CANON_GAPS_TOOL: Anthropic.Tool = {
  name: "identify_canon_gaps",
  description:
    "Lay out the foundational canon of the periods and movements the reader " +
    "clearly favours, so it can be read either as a ranked gap list or as an " +
    "ordered reading path. Use the coverage counts to infer the reader's focus " +
    "areas (where they own the most), then under each area list its cornerstone " +
    "works — INCLUDING the ones the reader already owns, which serve as waypoints " +
    "in the path. Score each work 1..10 by canonical importance AND give it a " +
    "reading `order` within its area. Return about 30 works in total across all " +
    "areas.",
  input_schema: {
    type: "object",
    properties: {
      focus_areas: {
        type: "array",
        description:
          "4 to 6 areas the reader favours (a period like 'Victorian / 19th " +
          "century' or a movement like 'Modernism'), strongest first. About 30 " +
          "works total across all areas.",
        items: {
          type: "object",
          properties: {
            focus: {
              type: "string",
              description:
                "The period or movement the reader is into, e.g. 'Modernism' or " +
                "'Victorian / 19th century'.",
            },
            works: {
              type: "array",
              description:
                "The area's cornerstone works — both the ones the reader owns " +
                "(waypoints) and the ones they lack (gaps) — in canonical " +
                "reading order.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Work title." },
                  author: { type: "string", description: 'Natural order "First Last".' },
                  first_published: { type: "integer", description: "Best-guess year first published." },
                  period: { type: "string", enum: [...PERIODS], description: "One literary period." },
                  primary_movement: { type: "string", enum: [...MOVEMENTS], description: "The movement this work anchors, or omit if none fits." },
                  importance: {
                    type: "integer",
                    description:
                      "1..10 canonical importance. 10 = foundational cornerstone " +
                      "(Pride and Prejudice / Romanticism; Gravity's Rainbow / " +
                      "Postmodernism). 7-9 = major. 4-6 = notable. 1-3 = minor.",
                  },
                  order: {
                    type: "integer",
                    description:
                      "1-based reading position within this area, pedagogical " +
                      "(not strictly chronological): an accessible entry point may " +
                      "precede an earlier-but-harder work, and the summit sits last. " +
                      "Number every work in the area consecutively from 1.",
                  },
                  reason: {
                    type: "string",
                    description:
                      "One line on why this work sits at this position and what it " +
                      "sets up for the next — a rationale for the reading order, not " +
                      "just a blurb.",
                  },
                },
                required: ["title", "author", "importance", "order", "reason"],
              },
            },
          },
          required: ["focus", "works"],
        },
      },
    },
    required: ["focus_areas"],
  },
};

export const CanonGapSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  first_published: z.number().int().nullish(),
  period: z.enum(PERIODS).nullish(),
  primary_movement: z.enum(MOVEMENTS).nullish(),
  importance: z.number().int().min(1).max(10),
  /** 1-based reading position within the area (pedagogical order). */
  order: z.number().int().min(1).nullish(),
  reason: z.string().nullish(),
});

export const CanonFocusSchema = z.object({
  focus: z.string().min(1),
  works: z.array(CanonGapSchema),
});

export const CanonResultSchema = z.object({
  focus_areas: z.array(CanonFocusSchema),
});

export type CanonGap = z.infer<typeof CanonGapSchema>;
export type CanonFocus = z.infer<typeof CanonFocusSchema>;

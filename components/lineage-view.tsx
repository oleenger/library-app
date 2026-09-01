// Shared movement-chip primitives for the lineage map and the canon detail.
//
// A movement is navigated to at a single destination — its canon detail on
// /recommendations — so every chip links there. Zero-holding movements render
// faded and dashed, an in-context "you own nothing here yet" learning prompt.

import Link from "next/link";
import type { Period } from "@/lib/taxonomy";
import { periodColor } from "@/lib/display";

/** A related movement rendered as a tappable chip. */
export interface LineageChip {
  movement: string;
  slug: string;
  period: Period | null;
  count: number;
}

/** A small coloured disc keyed to a movement's home-period colour. */
export function Dot({ period, className = "" }: { period: Period | null; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: periodColor(period) }}
      aria-hidden
    />
  );
}

/** A related movement as a tappable pill; faded + dashed when the user owns none. */
export function MovementChip({ chip }: { chip: LineageChip }) {
  const empty = chip.count === 0;
  return (
    <Link
      href={`/recommendations?movement=${encodeURIComponent(chip.movement)}`}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        empty
          ? "border-dashed border-paper-edge bg-transparent text-ink-faint hover:border-ink-faint hover:text-ink-soft"
          : "border-paper-edge bg-paper text-ink shadow-sm hover:border-ink-faint hover:text-accent"
      }`}
    >
      <Dot period={chip.period} className={`h-2 w-2 ${empty ? "opacity-40" : ""}`} />
      <span className="truncate">{chip.movement}</span>
      <span className={`tabular-nums ${empty ? "text-ink-faint/70" : "text-ink-faint"}`}>
        {chip.count}
      </span>
    </Link>
  );
}

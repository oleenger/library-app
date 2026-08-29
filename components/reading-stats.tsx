// Front-page reading statistics. Server component (no interactivity) so it renders
// on first paint. Pure presentation over getReadingStats().

import Link from "next/link";
import type { ReadingStats } from "@/lib/insights";

export function ReadingStats({ stats }: { stats: ReadingStats }) {
  if (stats.read === 0) {
    return (
      <section className="flex h-12 shrink-0 items-center gap-3 rounded-full border border-dashed border-paper-edge bg-paper px-5 shadow-card">
        <p className="text-sm text-ink-soft">No reads yet.</p>
        <Link
          href="/reads"
          className="whitespace-nowrap text-xs font-semibold text-accent hover:underline"
        >
          Import →
        </Link>
      </section>
    );
  }

  return (
    <section className="flex h-12 shrink-0 items-center gap-4 rounded-full border border-paper-edge bg-paper pl-3 pr-6 shadow-card">
      <Donut percent={stats.percent} />
      <dl className="flex items-center gap-4">
        <Figure label="Read" value={stats.read} />
        <Figure label="In library" value={stats.total} />
      </dl>
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div>
      <dd className="font-serif text-lg tabular-nums leading-none text-ink">
        {value}
        {hint && <span className="ml-1 text-sm text-amber-500">{hint}</span>}
      </dd>
      <dt className="mt-0.5 text-[0.55rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}

function Donut({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (percent / 100) * c;
  return (
    <div className="relative grid h-9 w-9 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-9 w-9 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efece3" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#1c6b50"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <span className="absolute font-serif text-[0.6rem] tabular-nums text-ink">
        {percent}%
      </span>
    </div>
  );
}

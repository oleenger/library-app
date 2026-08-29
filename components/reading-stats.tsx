// Front-page reading statistics. Server component (no interactivity) so it renders
// on first paint. Pure presentation over getReadingStats().

import Link from "next/link";
import type { ReadingStats } from "@/lib/insights";

export function ReadingStats({ stats }: { stats: ReadingStats }) {
  if (stats.read === 0) {
    return (
      <section className="flex shrink-0 items-center gap-3 rounded-2xl border border-dashed border-paper-edge bg-paper px-5 py-3 shadow-card">
        <p className="text-sm text-ink-soft">No reads yet.</p>
        <Link
          href="/reading"
          className="whitespace-nowrap text-xs font-semibold text-accent hover:underline"
        >
          Import →
        </Link>
      </section>
    );
  }

  return (
    <section className="flex shrink-0 items-center gap-5 rounded-2xl border border-paper-edge bg-paper px-5 py-3 shadow-card">
      <Donut percent={stats.percent} />
      <dl className="flex items-center gap-5">
        <Figure label="Read" value={stats.read} />
        <Figure label="In library" value={stats.total} />
      </dl>
      <Link
        href="/reads"
        className="whitespace-nowrap text-xs font-semibold text-accent hover:underline"
      >
        Read books →
      </Link>
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
      <dd className="font-serif text-2xl tabular-nums leading-none text-ink">
        {value}
        {hint && <span className="ml-1 text-base text-amber-500">{hint}</span>}
      </dd>
      <dt className="mt-1 text-[0.58rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
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
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efece3" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#1c6b50"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-serif text-lg tabular-nums text-ink">{percent}%</span>
        <span className="block text-[0.5rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          read
        </span>
      </div>
    </div>
  );
}

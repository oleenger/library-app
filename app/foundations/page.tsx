// Foundations — the pre-movement canon.
//
// The 65 works the reference data marks "None / Pre-movement": everything from
// Gilgamesh to Austen that predates (or stands outside) the movement lineage.
// They are the roots the movement map grows from, so they get their own browse
// surface, grouped into era bands and joined live against the reader's shelf for
// ownership. Many also surface on movement pages via their secondary tags; here
// they are shown whole, in chronological order.

import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { EssentialsList, type CanonEntry } from "@/components/essentials-list";
import { getWorks } from "@/lib/books";
import { preMovementClassics } from "@/lib/canon/data";
import { findOwnedWork } from "@/lib/recommend/match";
import { periodColor, shortPeriod } from "@/lib/display";
import { PERIODS, type Period } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export const metadata = { title: "Foundations — Personal Library" };

/** The era band a pre-movement year falls into, aligned to the taxonomy periods. */
function eraForYear(year: number | null): Period {
  if (year == null) return "Classical / Antiquity";
  if (year < 500) return "Classical / Antiquity";
  if (year < 1500) return "Medieval";
  if (year < 1660) return "Renaissance / Early Modern";
  if (year < 1800) return "Enlightenment / Neoclassical";
  if (year < 1837) return "Romantic";
  if (year < 1901) return "Victorian / 19th century";
  return "Contemporary";
}

interface EraGroup {
  period: Period;
  works: CanonEntry[];
  owned: number;
  read: number;
}

export default async function FoundationsPage() {
  const works = await getWorks();
  const classics = preMovementClassics();

  // Bucket into era bands, preserving the loader's oldest-first order.
  const byEra = new Map<Period, EraGroup>();
  for (const c of classics) {
    const period = eraForYear(c.sortYear);
    const owning = findOwnedWork(works, c.title, c.author, c.sortYear);
    const entry: CanonEntry = {
      title: c.title,
      author: c.author,
      displayYear: c.displayYear,
      owned: owning != null,
      read: owning?.reading != null,
      ownedId: owning?.id ?? null,
    };
    const group = byEra.get(period) ?? { period, works: [], owned: 0, read: 0 };
    group.works.push(entry);
    if (entry.owned) group.owned += 1;
    if (entry.read) group.read += 1;
    byEra.set(period, group);
  }

  // Emit in chronological period order.
  const groups = PERIODS.map((p) => byEra.get(p)).filter((g): g is EraGroup => g != null);

  const total = classics.length;
  const ownedTotal = groups.reduce((n, g) => n + g.owned, 0);
  const readTotal = groups.reduce((n, g) => n + g.read, 0);
  const pct = total > 0 ? Math.round((ownedTotal / total) * 100) : 0;

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <header className="mb-8 px-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Before the movements
            </p>
            <h1 className="mt-1 font-serif text-4xl leading-tight tracking-[-0.02em] text-ink">
              Foundations
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              The classics that predate the movement lineage — the roots
              everything after grows from, from Gilgamesh to Austen.
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-4xl leading-none tabular-nums text-accent">
                {pct}%
              </span>
              <p className="text-sm text-ink-soft">
                of the foundations —{" "}
                <span className="font-medium text-ink tabular-nums">
                  {ownedTotal} of {total}
                </span>{" "}
                in your library,{" "}
                <span className="font-medium text-ink tabular-nums">{readTotal}</span> read
              </p>
            </div>
          </header>

          <div className="space-y-10">
            {groups.map((g) => (
              <section key={g.period}>
                <h2 className="mb-3 flex items-baseline gap-2 px-1">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: periodColor(g.period) }}
                    aria-hidden
                  />
                  <span
                    className="font-serif text-xl tracking-[-0.01em]"
                    style={{ color: periodColor(g.period) }}
                  >
                    {shortPeriod(g.period)}
                  </span>
                  <span className="text-xs tabular-nums text-ink-faint">
                    {g.owned}/{g.works.length}
                  </span>
                </h2>
                <div className="rounded-2xl border border-paper-edge bg-paper-raised p-5 shadow-card sm:p-6">
                  <EssentialsList
                    works={g.works}
                    owned={g.owned}
                    read={g.read}
                    total={g.works.length}
                  />
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </PullToRefresh>
  );
}

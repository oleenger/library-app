import Link from "next/link";
import { getWorks } from "@/lib/books";
import { getReadsPageData, getReadingStats } from "@/lib/insights";
import { ReadsClient } from "@/components/reads-client";
import { ReadingStats } from "@/components/reading-stats";

export const metadata = { title: "Read books — Personal Library" };
export const dynamic = "force-dynamic";

export default async function ReadsPage() {
  const works = await getWorks();
  const data = getReadsPageData(works);
  const reading = getReadingStats(works);

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/reads/manage"
            className="inline-flex items-center gap-2 rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink"
          >
            Edit read status
          </Link>
          <Link
            href="/reading"
            className="hidden items-center gap-2 rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink sm:inline-flex"
          >
            Import reads
          </Link>
        </div>
      </nav>

      <main className="enter-up mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
              Read books
            </h1>
            <p className="mt-3 text-[0.95rem] text-ink-soft">
              {data.read} {data.read === 1 ? "title" : "titles"} read, newest first.
            </p>
          </div>
          <ReadingStats stats={reading} />
        </header>
        <ReadsClient initialWorks={works} />
      </main>
    </div>
  );
}

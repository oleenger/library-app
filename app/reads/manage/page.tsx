import Link from "next/link";
import { getWorks } from "@/lib/books";
import { ReadStatusManager } from "@/components/read-status-manager";

export const metadata = { title: "Edit read status — Personal Library" };
export const dynamic = "force-dynamic";

export default async function ReadStatusManagePage() {
  const works = await getWorks();

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/reads" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">Read books</span>
        </Link>
        <span className="text-xs text-ink-faint">Bulk edit</span>
      </nav>

      <main className="enter-up mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            Edit read status
          </h1>
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Select multiple books and mark them read or unread at once. Manual reads
            are protected from Goodreads reconcile; marking read keeps any existing
            read date.
          </p>
        </header>
        <ReadStatusManager works={works} />
      </main>
    </div>
  );
}

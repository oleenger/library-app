import Link from "next/link";
import { ReadingImport } from "@/components/reading-import";

export const metadata = { title: "Import reads — Personal Library" };

export default function ReadingPage() {
  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <span className="text-xs text-ink-faint">Reading history</span>
      </nav>

      <main className="enter-up mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mx-auto mb-8 max-w-2xl">
          <h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            Import reads
          </h1>
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Upload your Goodreads export to mark which library titles you have read.
          </p>
        </header>
        <ReadingImport />
      </main>
    </div>
  );
}

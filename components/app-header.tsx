"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Radius shared across the logo tile, search box and the trailing action so the
// whole header reads as one set of matching, gently-rounded rectangles.
const RADIUS = "rounded-[0.7rem]";

type LibraryProps = {
  mode: "library";
  query: string;
  onQueryChange: (value: string) => void;
  onFilterClick: () => void;
  filterActive: boolean;
};

type BackProps = {
  mode: "back";
  /** Where the back arrow returns to. Defaults to the Library. */
  backHref?: string;
};

type Props = LibraryProps | BackProps;

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

const INPUT_CLASS = `h-10 w-full ${RADIUS} border border-paper-edge bg-paper pl-10 pr-4 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/12`;

export function AppHeader(props: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-edge bg-canvas/85 shadow-header backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="The Library"
          className="shrink-0"
          onClick={() => window.dispatchEvent(new Event("library:home"))}
        >
          <img
            src="/logo.svg"
            alt=""
            className={`h-10 w-10 ${RADIUS} ring-1 ring-ink/10`}
          />
        </Link>

        {props.mode === "library" ? (
          <label className="relative flex-1">
            <span className="sr-only">Search by title or author</span>
            <SearchIcon />
            <input
              type="search"
              value={props.query}
              onChange={(e) => props.onQueryChange(e.target.value)}
              placeholder="Search title or author"
              className={INPUT_CLASS}
            />
          </label>
        ) : (
          <BackSearch />
        )}

        {props.mode === "library" ? (
          <button
            type="button"
            onClick={props.onFilterClick}
            aria-label="Filter"
            className={`grid h-10 w-10 shrink-0 place-items-center border transition-colors ${RADIUS} ${
              props.filterActive
                ? "border-accent bg-accent text-white"
                : "border-paper-edge bg-paper text-ink-soft hover:border-ink-faint hover:text-ink"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="9" cy="17" r="2" />
            </svg>
          </button>
        ) : (
          <Link
            href={props.backHref ?? "/"}
            aria-label="Back to Library"
            className={`grid h-10 w-10 shrink-0 place-items-center border border-paper-edge bg-paper text-ink-soft transition-colors hover:border-ink-faint hover:text-ink ${RADIUS}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}

/** Search box on secondary pages — submitting jumps to the Library search. */
function BackSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
      }}
    >
      <span className="sr-only">Search by title or author</span>
      <SearchIcon />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search title or author"
        className={INPUT_CLASS}
      />
    </form>
  );
}

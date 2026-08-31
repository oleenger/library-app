"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Dest = {
  href: string;
  label: string;
  icon: React.ReactNode;
  dummy?: boolean;
};

// Bottom nav: two destinations on each side of a center capture (scan) action.
const LEFT: Dest[] = [
  {
    href: "/",
    label: "Library",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
        <path d="M10 5a1 1 0 0 1 1-1h3.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11a1 1 0 0 1-1-1V5Z" />
        <path d="m16.5 5 2.9.8a1 1 0 0 1 .7 1.22l-3 11.3" />
      </svg>
    ),
  },
  {
    href: "/reads",
    label: "Reading",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 6.5C10.5 5.2 8.7 4.6 6.5 4.6c-1 0-2 .13-2.9.4V18c.9-.27 1.9-.4 2.9-.4 2.2 0 4 .6 5.5 1.9 1.5-1.3 3.3-1.9 5.5-1.9 1 0 2 .13 2.9.4V5c-.9-.27-1.9-.4-2.9-.4-2.2 0-4 .6-5.5 1.9Z" />
        <path d="M12 6.5V19" />
      </svg>
    ),
  },
];

const RIGHT: Dest[] = [
  {
    href: "/recommendations",
    label: "Canon",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.7l-1.6-4.5L6 10.6 10.4 9 12 4.5Z" />
        <path d="M18.5 4v3M20 5.5h-3M6 17v2M7 18H5" />
      </svg>
    ),
  },
  {
    href: "/lineage",
    label: "Movements",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="5" r="2.2" />
        <circle cx="5.5" cy="18.5" r="2.2" />
        <circle cx="18.5" cy="18.5" r="2.2" />
        <path d="M12 7.2v3.3m0 0-5 5.5m5-5.5 5 5.5" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  // Login/capture are focused full-screen surfaces — no app chrome.
  if (pathname === "/login" || pathname === "/capture") return null;

  function onTabClick(e: React.MouseEvent, href: string, dummy?: boolean) {
    if (dummy) {
      e.preventDefault();
      return;
    }
    // Returning to the Library resets it to the first page of results.
    if (href === "/") {
      window.dispatchEvent(new Event("library:home"));
    }
    // Tapping the already-active tab scrolls back to the top.
    if (isActive(pathname, href)) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderTab(d: Dest) {
    const active = !d.dummy && isActive(pathname, d.href);
    return (
      <li key={d.label} className="flex-1">
        <Link
          href={d.href}
          onClick={(e) => onTabClick(e, d.href, d.dummy)}
          aria-current={active ? "page" : undefined}
          className={`flex flex-col items-center gap-1 pb-1.5 pt-2 text-[0.65rem] font-semibold tracking-wide transition-colors ${
            active ? "text-accent" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          <span
            className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
              active ? "bg-accent/12" : "bg-transparent"
            }`}
          >
            {d.icon}
          </span>
          {d.label}
        </Link>
      </li>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-paper-edge bg-canvas/90 shadow-[0_-1px_16px_rgba(20,24,20,0.05)] backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-end justify-around px-2">
        {LEFT.map(renderTab)}

        {/* Center capture (scan) action */}
        <li className="flex-1">
          <div className="flex flex-col items-center pb-1.5">
            <Link
              href="/capture"
              aria-label="Add books"
              className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30 transition-all hover:bg-ink active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <path d="M8 12h8" />
              </svg>
            </Link>
          </div>
        </li>

        {RIGHT.map(renderTab)}
      </ul>
    </nav>
  );
}

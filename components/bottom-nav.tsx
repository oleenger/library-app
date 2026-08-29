"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Dest = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

// Material bottom nav: 3–5 primary destinations. Capture is an ACTION → FAB.
const DESTINATIONS: Dest[] = [
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
  {
    href: "/recommendations",
    label: "For You",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m12 3.5 2.4 4.9 5.4.8-3.9 3.8.92 5.4L12 15.9l-4.82 2.5.92-5.4-3.9-3.8 5.4-.8L12 3.5Z" />
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

  // Login is a standalone full-screen surface — no app chrome.
  if (pathname === "/login") return null;

  const showFab = pathname !== "/capture";

  return (
    <>
      {showFab && (
        <Link
          href="/capture"
          aria-label="Add books"
          className="fixed right-5 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30 transition active:scale-95 hover:bg-ink sm:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
        </Link>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-paper-edge bg-canvas/90 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {DESTINATIONS.map((d) => {
            const active = isActive(pathname, d.href);
            return (
              <li key={d.href} className="flex-1">
                <Link
                  href={d.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-semibold tracking-wide transition-colors ${
                    active ? "text-accent" : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {d.icon}
                  {d.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

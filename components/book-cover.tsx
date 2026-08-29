import { periodColor } from "@/lib/display";

/**
 * A book-cover-shaped tile. Until real cover art exists it renders a printed
 * placeholder derived from the work's period colour, so the grid reads as a
 * shelf of spines. Pass `coverUrl` later to swap in real artwork with no other
 * changes at the call site.
 */
export function BookCover({
  title,
  author,
  period,
  read = false,
  coverUrl = null,
  className = "",
}: {
  title: string;
  author: string;
  period: string | null;
  read?: boolean;
  coverUrl?: string | null;
  className?: string;
}) {
  const color = periodColor(period);
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-l-sm rounded-r-md shadow-cover ${className}`}
      style={{ backgroundColor: color }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {/* printed-cover shading */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />
          {/* spine */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-black/25" />
          <div className="pointer-events-none absolute inset-y-0 left-2 w-px bg-white/25" />
          <div className="relative z-10 flex h-full flex-col justify-between p-3 pl-4">
            <h3 className="line-clamp-4 font-serif text-[0.95rem] font-medium leading-snug text-canvas">
              {title}
            </h3>
            <p className="line-clamp-2 font-serif text-[0.7rem] italic text-canvas/80">
              {author}
            </p>
          </div>
        </>
      )}

      {read && (
        <span
          className="absolute right-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white/70"
          title="Read"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

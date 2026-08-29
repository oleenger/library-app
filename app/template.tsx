// Re-mounts on every route change, giving each page a light fade-in so
// navigation feels continuous rather than a hard cut. Sits inside the layout,
// so persistent chrome (bottom nav, banners) does not re-animate.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

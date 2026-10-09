/**
 * Shown the instant a menu is clicked, while the next admin page is still being prepared by the
 * server — so the screen responds at once instead of looking frozen on the old page.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-8 w-56 rounded-lg bg-ar-surface2" />
      <div className="h-3 w-80 max-w-full rounded bg-ar-surface2 mt-3" />
      <div className="border-b border-ar-line mt-5" />
      <div className="mt-6 h-10 rounded-xl bg-ar-surface2" />
      <div className="mt-4 rounded-2xl border border-ar-line bg-ar-surface overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-t first:border-t-0 border-ar-line flex items-center px-4.5 gap-4">
            <div className="h-3 w-1/5 rounded bg-ar-surface2" />
            <div className="h-3 w-1/6 rounded bg-ar-surface2" />
            <div className="h-3 flex-1 rounded bg-ar-surface2" />
          </div>
        ))}
      </div>
    </div>
  );
}

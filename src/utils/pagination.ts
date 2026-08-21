/**
 * Which page numbers a pager should show.
 *
 * Pure, and separate from the component, because the interesting cases are the
 * edges — a range short enough to show whole, a current page near either end
 * where the window is clipped, a gap of exactly one page that must render as
 * the page rather than an ellipsis — and those are worth being able to check
 * without mounting anything.
 *
 * `null` marks an elided run and renders as "…".
 */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const shown = new Set<number>([1, pageCount, page])
  shown.add(page - 1)
  shown.add(page + 1)
  // Near either end the window is clipped, so it is widened inwards to keep the
  // control a stable width instead of shrinking on the first and last pages.
  if (page <= 3) [2, 3, 4].forEach((n) => shown.add(n))
  if (page >= pageCount - 2)
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => shown.add(n))

  const sorted = [...shown].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)

  const out: (number | null)[] = []
  let previous = 0
  for (const n of sorted) {
    // A gap of exactly one page is shown as that page: "1 … 3" hides no more
    // than "1 2 3" does, and costs the reader a click.
    if (previous && n - previous === 2) out.push(previous + 1)
    else if (previous && n - previous > 2) out.push(null)
    out.push(n)
    previous = n
  }
  return out
}

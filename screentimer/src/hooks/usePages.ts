import { useLayoutEffect, useMemo, useRef, useState } from 'react'

/** Greedily packs items of the given heights into pages; returns item counts. */
export function paginate(heights: number[], gap: number, available: number): number[] {
  const sizes: number[] = []
  let count = 0
  let used = 0

  for (const height of heights) {
    const needed = count === 0 ? height : used + gap + height
    if (count > 0 && needed > available) {
      sizes.push(count)
      count = 1
      used = height
    } else {
      count += 1
      used = needed
    }
  }
  if (count > 0) sizes.push(count)
  return sizes
}

function chunk<T>(items: readonly T[], sizes: number[]): T[][] {
  const pages: T[][] = []
  let offset = 0
  for (const size of sizes) {
    if (offset >= items.length) break
    pages.push(items.slice(offset, offset + size))
    offset += size
  }
  // Sizes lag one layout pass behind new items: keep the rest visible meanwhile.
  if (offset < items.length) pages.push(items.slice(offset))
  return pages
}

/**
 * Splits items into pages that fit the viewport. All the items are rendered
 * once, hidden, as a list inside `measureRef` whose children are the items,
 * one each, so their real heights are known. Pages are recomputed whenever
 * the viewport or the content resizes.
 */
export function usePages<T>(items: readonly T[]) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState<number[]>([])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const list = measureRef.current?.firstElementChild
    if (!viewport || !list) return

    const observer = new ResizeObserver(() => {
      const heights = [...list.children].map((child) => child.getBoundingClientRect().height)
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0
      setSizes(paginate(heights, gap, viewport.clientHeight))
    })
    observer.observe(viewport)
    observer.observe(list)
    return () => observer.disconnect()
  }, [items])

  const pages = useMemo(() => chunk(items, sizes), [items, sizes])
  return { viewportRef, measureRef, pages }
}

import { useEffect, useState } from 'react'

/** Index cycling through `length` items, advancing every `intervalSeconds`. */
export function useCycle(length: number, intervalSeconds: number, paused = false): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (length < 2 || paused) return
    const id = setInterval(() => setTick((prev) => prev + 1), intervalSeconds * 1000)
    return () => clearInterval(id)
  }, [length, intervalSeconds, paused])

  return length > 0 ? tick % length : 0
}

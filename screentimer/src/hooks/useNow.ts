import { useEffect, useState } from 'react'

/**
 * Current time, updated right after each second boundary: one render per
 * second, and the displayed seconds never lag behind the real clock.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = new Date()
      setNow(current)
      timer = setTimeout(tick, 1000 - current.getMilliseconds())
    }
    timer = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(timer)
  }, [])

  return now
}

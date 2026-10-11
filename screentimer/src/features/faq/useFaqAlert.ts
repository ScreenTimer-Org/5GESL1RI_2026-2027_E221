import { useEffect, useMemo, useRef, useState } from 'react'
import type { FaqAlert } from '../../config/schema'
import type { FaqEntry } from './parseFaq'

let audioContext: AudioContext | null = null

/**
 * Two-note chime made with the Web Audio API: no sound file to ship. Browsers
 * may block it until the page has been clicked once (autoplay policy).
 */
function playChime() {
  try {
    audioContext ??= new AudioContext()
    const ctx = audioContext
    void ctx.resume()
    const start = ctx.currentTime
    for (const [offset, frequency] of [
      [0, 880],
      [0.18, 1320],
    ]) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.5)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.5)
    }
  } catch {
    // No audio on this device: the visual alert, if enabled, is still shown.
  }
}

/**
 * Counts the changes of the FAQ since the screen was shown, and plays the
 * chime on each one when the sound is enabled. The first load of the source
 * is not a change. Returns the number of changes to flash, 0 when the visual
 * alert is off: a new number restarts the flash.
 */
export function useFaqAlert(faq: readonly FaqEntry[], settled: boolean, alert: FaqAlert): number {
  const signature = useMemo(() => JSON.stringify(faq), [faq])
  const [seen, setSeen] = useState({ signature, settled })
  const [changes, setChanges] = useState(0)

  if (signature !== seen.signature || settled !== seen.settled) {
    // The FAQ that arrives with the first read of the source is not a change.
    if (signature !== seen.signature && seen.settled) setChanges((count) => count + 1)
    setSeen({ signature, settled })
  }

  const sound = alert === 'sound' || alert === 'both'
  const played = useRef(0)
  useEffect(() => {
    if (changes <= played.current) return
    played.current = changes
    if (sound) playChime()
  }, [changes, sound])

  return alert === 'visual' || alert === 'both' ? changes : 0
}

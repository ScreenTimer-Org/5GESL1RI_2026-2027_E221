import { useEffect, useRef, useState } from 'react'
import { isSafeUrl } from '../../config/safeUrl'
import { parseFaq, type FaqEntry } from './parseFaq'

/** `network`: the pad could not be fetched. `format`: it is not valid FAQ JSON. */
export type FaqError = 'network' | 'format'

export interface FaqState {
  /** Last valid FAQ: kept on screen while the pad is unreachable or mid-edit. */
  entries: FaqEntry[]
  updatedAt: Date | null
  error: FaqError | null
}

const INITIAL_STATE: FaqState = { entries: [], updatedAt: null, error: null }

/** Waits for the pad link to settle, so typing it does not fire one request per keystroke. */
const START_DELAY_MS = 1_000
/** Rate-limited Etherpad servers stall instead of answering: give up after this. */
const REQUEST_TIMEOUT_MS = 15_000
/** Longest wait between attempts while the pad keeps failing. */
const MAX_BACKOFF_MS = 5 * 60_000
/** ±15 % so screens loaded at the same time do not poll in lockstep. */
const JITTER = 0.15

/** Accepts a pad URL (`.../p/name`) or a direct export URL. */
export function toExportUrl(padUrl: string): string {
  const url = padUrl.trim().replace(/\/+$/, '')
  return url.includes('/export/') ? url : `${url}/export/txt`
}

/** Doubles the interval after each consecutive failure, up to MAX_BACKOFF_MS. */
function nextDelay(intervalMs: number, failures: number): number {
  const backoff = Math.max(intervalMs, Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS))
  return backoff * (1 - JITTER + Math.random() * 2 * JITTER)
}

/** Aborts on `signal` or after `timeoutMs` (AbortSignal.any/timeout are too recent to rely on). */
async function fetchText(url: string, signal: AbortSignal, timeoutMs: number): Promise<string> {
  const request = new AbortController()
  const abort = () => request.abort()
  const timer = setTimeout(abort, timeoutMs)
  signal.addEventListener('abort', abort)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

/**
 * Polls the pad's plain-text export. Keeps the last good entries on failure.
 * The response is only ever rendered as text, never as HTML.
 *
 * Etherpad rate-limits exports per IP (10 per 90 s by default, Framapad
 * included), and every screen of a school usually shares one public IP. So
 * requests never overlap, back off on failure and stop while the tab is hidden.
 */
export function useEtherpadFaq(padUrl: string, refreshSeconds: number): FaqState {
  const [state, setState] = useState<FaqState>(INITIAL_STATE)
  // Read at scheduling time: changing the interval must not restart polling.
  const intervalMs = useRef(refreshSeconds * 1000)

  useEffect(() => {
    intervalMs.current = refreshSeconds * 1000
  }, [refreshSeconds])

  useEffect(() => {
    if (!padUrl || !isSafeUrl(padUrl)) return
    const controller = new AbortController()
    const exportUrl = toExportUrl(padUrl)
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let lastText: string | null = null
    let lastParsed: FaqEntry[] | null = null
    let dueWhileHidden = false

    const schedule = (delay = nextDelay(intervalMs.current, failures)) => {
      timer = setTimeout(refresh, delay)
    }

    const refresh = async () => {
      if (document.hidden) {
        dueWhileHidden = true
        return
      }
      try {
        const text = await fetchText(exportUrl, controller.signal, REQUEST_TIMEOUT_MS)
        failures = 0
        // Unchanged pad: reuse the same result so nothing downstream re-renders or re-paginates.
        if (text !== lastText) {
          lastText = text
          lastParsed = parseFaq(text)
        }
        const entries = lastParsed
        setState((prev) =>
          entries ? { entries, updatedAt: new Date(), error: null } : { ...prev, error: 'format' },
        )
      } catch (error) {
        if (controller.signal.aborted) return
        failures += 1
        console.warn('FAQ refresh failed', error)
        setState((prev) => ({ ...prev, error: 'network' }))
      }
      schedule()
    }

    const onVisibilityChange = () => {
      if (!document.hidden && dueWhileHidden) {
        dueWhileHidden = false
        refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    schedule(START_DELAY_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearTimeout(timer)
      controller.abort()
      setState(INITIAL_STATE)
    }
  }, [padUrl])

  return state
}

import { useEffect, useMemo, useState, type RefObject } from 'react'
import { MAX_DOCUMENT_LENGTH, parseDocument, type SourceDocument } from './document'
import { parseSource, toFetchUrl, type SourceSpec } from './sourceSpec'
import { useUpload } from './uploads'

/**
 * `network`: the link could not be fetched. `format`: it is not a valid
 * document. `missing`: the imported file is not in this browser.
 */
export type SourceError = 'network' | 'format' | 'missing'

export interface SourceState {
  /** Last valid document: kept on screen while the source is unreachable or mid-edit. */
  doc: SourceDocument | null
  updatedAt: Date | null
  error: SourceError | null
  /** False until the first attempt to read the source is over. */
  settled: boolean
}

const IDLE: SourceState = { doc: null, updatedAt: null, error: null, settled: true }
const PENDING: SourceState = { ...IDLE, settled: false }

/** Rate-limited Etherpad servers stall instead of answering: give up after this. */
const REQUEST_TIMEOUT_MS = 15_000
/** Longest wait between attempts while the source keeps failing. */
const MAX_BACKOFF_MS = 5 * 60_000
/** ±15 % so screens loaded at the same time do not poll in lockstep. */
const JITTER = 0.15

/** UTF-8 takes up to 4 bytes per character. */
const MAX_RESPONSE_BYTES = MAX_DOCUMENT_LENGTH * 4

/** Doubles the interval after each consecutive failure, up to MAX_BACKOFF_MS. */
function nextDelay(intervalMs: number, failures: number): number {
  const backoff = Math.max(intervalMs, Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS))
  return backoff * (1 - JITTER + Math.random() * 2 * JITTER)
}

/**
 * Stops downloading past `maxBytes`, so a link to a huge file cannot fill the
 * memory of every screen. Returns null in that case.
 */
async function readLimited(response: Response, maxBytes: number): Promise<string | null> {
  if (Number(response.headers.get('content-length')) > maxBytes) return null
  if (!response.body) return response.text()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
}

/**
 * Aborts on `signal` or after `timeoutMs` (AbortSignal.any/timeout are too
 * recent to rely on). Returns null when the response is too large.
 */
async function fetchText(url: string, signal: AbortSignal, timeoutMs: number): Promise<string | null> {
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
    return await readLimited(response, MAX_RESPONSE_BYTES)
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

/**
 * Polls a link (pad export or plain file). Keeps the last valid document on
 * failure. The response is only ever rendered as text, never as HTML.
 *
 * Etherpad rate-limits exports per IP (10 per 90 s by default, Framapad
 * included), and every screen of a school usually shares one public IP. So
 * requests never overlap, back off on failure and stop while the tab is hidden.
 */
function useLinkSource(link: string, refreshSeconds: RefObject<number>): SourceState {
  // Tagged with its link, so a stale result never shows up after the link changes.
  const [state, setState] = useState<{ link: string; value: SourceState }>({ link: '', value: IDLE })

  useEffect(() => {
    if (!link) return
    const controller = new AbortController()
    const fetchUrl = toFetchUrl(link)
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let lastText: string | null = null
    let lastDoc: SourceDocument | null = null
    let dueWhileHidden = false

    const update = (next: (prev: SourceState) => SourceState) =>
      setState((prev) => ({ link, value: next(prev.link === link ? prev.value : PENDING) }))

    const schedule = () => {
      timer = setTimeout(() => refresh(), nextDelay(refreshSeconds.current * 1000, failures))
    }

    /** The first load runs even in a hidden tab: the screen waits for it before rendering. */
    const refresh = async (initial = false) => {
      if (document.hidden && !initial) {
        dueWhileHidden = true
        return
      }
      try {
        const text = await fetchText(fetchUrl, controller.signal, REQUEST_TIMEOUT_MS)
        failures = 0
        // Unchanged source: reuse the same result so nothing downstream re-renders or re-paginates.
        if (text !== lastText) {
          lastText = text
          lastDoc = text === null ? null : parseDocument(text)
        }
        const doc = lastDoc
        update((prev) =>
          doc
            ? { doc, updatedAt: new Date(), error: null, settled: true }
            : { ...prev, error: 'format', settled: true },
        )
      } catch (error) {
        if (controller.signal.aborted) return
        failures += 1
        console.warn(`Refresh of ${link} failed`, error)
        update((prev) => ({ ...prev, error: 'network', settled: true }))
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
    refresh(true)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearTimeout(timer)
      controller.abort()
    }
  }, [link, refreshSeconds])

  if (!link) return IDLE
  return state.link === link ? state.value : PENDING
}

/** Imported files were validated before being saved, so they are only missing, never invalid. */
function useUploadSource(slot: string): SourceState {
  const upload = useUpload(slot)
  return useMemo(() => {
    if (!slot) return IDLE
    const doc = upload && parseDocument(upload.text)
    return doc
      ? { doc, updatedAt: new Date(upload.savedAt), error: null, settled: true }
      : { ...IDLE, error: 'missing' }
  }, [slot, upload])
}

/**
 * Reads the document behind a source spec. `refreshSeconds` is read when each
 * poll is scheduled, so changing it does not restart polling.
 */
export function useSource(spec: SourceSpec, refreshSeconds: RefObject<number>): SourceState {
  const source = parseSource(spec)
  const link = useLinkSource(source.kind === 'link' ? source.url : '', refreshSeconds)
  const upload = useUploadSource(source.kind === 'upload' ? source.slot : '')
  return source.kind === 'link' ? link : source.kind === 'upload' ? upload : IDLE
}

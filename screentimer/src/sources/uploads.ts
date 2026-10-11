import { useMemo, useSyncExternalStore } from 'react'

/**
 * Imported files are kept in localStorage, so they survive reloads. They only
 * exist in this browser: a link pointing to an upload does not carry the file.
 */
const KEY_PREFIX = 'screentimer:upload:'

export interface Upload {
  name: string
  text: string
  savedAt: string
}

const listeners = new Set<() => void>()

function readRaw(slot: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + slot)
  } catch {
    return null
  }
}

function parseUpload(raw: string | null): Upload | null {
  if (raw === null) return null
  try {
    const value = JSON.parse(raw)
    const valid =
      typeof value?.name === 'string' &&
      typeof value?.text === 'string' &&
      typeof value?.savedAt === 'string' &&
      !Number.isNaN(Date.parse(value.savedAt))
    return valid ? value : null
  } catch {
    return null
  }
}

/** Throws when storage is full or disabled. */
export function saveUpload(slot: string, upload: Upload): void {
  localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(upload))
  listeners.forEach((listener) => listener())
}

/** Also notified by other tabs of the same page through the `storage` event. */
function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** The file imported into `slot`, or null. An empty slot reads nothing. */
export function useUpload(slot: string): Upload | null {
  const raw = useSyncExternalStore(subscribe, () => (slot ? readRaw(slot) : null))
  return useMemo(() => parseUpload(raw), [raw])
}

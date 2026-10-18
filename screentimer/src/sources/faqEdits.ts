import { MAX_FAQ_ENTRIES, validateFaq, type FaqEntry } from '../features/faq/parseFaq'

/** Questions added or hidden on this screen, on top of the FAQ source. */
export interface FaqEdits {
  added: FaqEntry[]
  /** `questionKey` of the source questions hidden from the screen. */
  hidden: string[]
}

export const NO_FAQ_EDITS: FaqEdits = { added: [], hidden: [] }

const KEY_PATTERN = /^[0-9a-z]{1,8}$/

/**
 * Short, stable id of a question (FNV-1a), so hiding one keeps the URL short
 * and still applies after its answer is edited in the source.
 */
export function questionKey(question: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < question.length; i++) {
    hash ^= question.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function applyFaqEdits(source: readonly FaqEntry[], { added, hidden }: FaqEdits): FaqEntry[] {
  if (hidden.length === 0 && added.length === 0) return source as FaqEntry[]
  const hiddenKeys = new Set(hidden)
  return [...source.filter((entry) => !hiddenKeys.has(questionKey(entry.question))), ...added]
}

/** `[[question, answer], …]` as base64url JSON: shorter than percent-encoded JSON, and URL safe. */
export function encodeFaqEntries(entries: readonly FaqEntry[]): string {
  const json = JSON.stringify(entries.map((entry) => [entry.question, entry.answer]))
  const binary = Array.from(new TextEncoder().encode(json), (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Untrusted (comes from the URL): anything invalid yields no entries. */
export function decodeFaqEntries(value: string): FaqEntry[] {
  let data: unknown
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))))
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const entries = validateFaq(data.map((pair) => (Array.isArray(pair) ? { question: pair[0], answer: pair[1] } : pair)))
  return entries ?? []
}

export function encodeHidden(hidden: readonly string[]): string {
  return hidden.join(',')
}

export function decodeHidden(value: string): string[] {
  return [...new Set(value.split(',').filter((key) => KEY_PATTERN.test(key)))].slice(0, MAX_FAQ_ENTRIES)
}

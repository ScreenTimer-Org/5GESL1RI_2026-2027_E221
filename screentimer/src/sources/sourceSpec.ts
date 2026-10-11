import { isSafeUrl } from '../config/safeUrl'

/**
 * Where the config or the FAQ comes from, as written in the page URL:
 * - `''`: nothing but the page URL itself (defaults and local changes)
 * - `upload:<slot>`: a file imported in this browser
 * - anything else: a link to an Etherpad pad or to a JSON / text file
 */
export type SourceSpec = string

export type Source =
  | { kind: 'none' }
  | { kind: 'upload'; slot: string }
  | { kind: 'link'; url: string }

/** Not a valid relative path (`upload:` parses as a URL scheme), so it cannot be mistaken for a link. */
const UPLOAD_PREFIX = 'upload:'
const MAX_LINK_LENGTH = 2048
/** Slots are chosen by the panel (`shared`, `config`, `faq`), never typed. */
const SLOT_PATTERN = /^[a-z]{1,16}$/

export function parseSource(spec: SourceSpec): Source {
  const value = spec.trim()
  if (value.startsWith(UPLOAD_PREFIX)) {
    const slot = value.slice(UPLOAD_PREFIX.length)
    return SLOT_PATTERN.test(slot) ? { kind: 'upload', slot } : { kind: 'none' }
  }
  if (value !== '' && value.length <= MAX_LINK_LENGTH && isSafeUrl(value)) return { kind: 'link', url: value }
  return { kind: 'none' }
}

export function formatSource(source: Source): SourceSpec {
  if (source.kind === 'upload') return `${UPLOAD_PREFIX}${source.slot}`
  return source.kind === 'link' ? source.url : ''
}

/** Drops invalid specs, e.g. a `javascript:` link typed in the URL. */
export function normalizeSource(spec: SourceSpec): SourceSpec {
  return formatSource(parseSource(spec))
}

const PAD_PATH = /\/p\/[^/]+\/?$/

/** Etherpad pad links look like `…/p/<name>` (Framapad included). */
export function isPadLink(link: string): boolean {
  try {
    return PAD_PATH.test(new URL(link, globalThis.location?.href).pathname)
  } catch {
    return false
  }
}

/** Pads are read through their plain-text export; other links are fetched as they are. */
export function toFetchUrl(link: string): string {
  const url = new URL(link, globalThis.location?.href)
  if (PAD_PATH.test(url.pathname)) url.pathname = `${url.pathname.replace(/\/+$/, '')}/export/txt`
  return url.href
}

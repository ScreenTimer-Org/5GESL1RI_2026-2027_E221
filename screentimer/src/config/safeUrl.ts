const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function baseHref(): string {
  return globalThis.location?.href ?? 'http://localhost/'
}

/**
 * Accepts absolute http(s) URLs and relative paths (resolved against the page).
 * Rejects `javascript:`, `data:`, `blob:`, `file:` and anything unparsable.
 */
export function isSafeUrl(value: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value, baseHref()).protocol)
  } catch {
    return false
  }
}

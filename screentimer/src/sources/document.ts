import { isRecord, validateConfig } from '../config/codec'
import type { AppConfig, ConfigPatch } from '../config/schema'
import { validateFaq, type FaqEntry } from '../features/faq/parseFaq'

/** Longer pads or files are rejected before being parsed. */
export const MAX_DOCUMENT_LENGTH = 200_000

/**
 * What a source provides: `{ "config": {…}, "faq": […] }`. Both parts are
 * optional, so one file can hold the config, the FAQ or both.
 */
export interface SourceDocument {
  config: ConfigPatch
  /** Undefined when the document has no `faq` key. */
  faq?: FaqEntry[]
}

const DOCUMENT_KEYS = ['config', 'faq']

function readConfig(input: unknown): ConfigPatch {
  const { config, invalid } = validateConfig(input)
  if (invalid.length > 0) console.warn('Ignored invalid config values from source:', invalid)
  return config
}

/**
 * Parses untrusted text (pad, file). Returns null when it is not a valid
 * document, e.g. while a teacher is mid-edit, so the caller can keep the last
 * valid one. Invalid config values are dropped one by one, like in the URL,
 * but an invalid FAQ or an unknown key (e.g. a typo such as `"faqs"`)
 * invalidates the whole document.
 */
export function parseDocument(text: string): SourceDocument | null {
  if (text.length > MAX_DOCUMENT_LENGTH) return null
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }

  if (!isRecord(data)) return null
  if (Object.keys(data).some((key) => !DOCUMENT_KEYS.includes(key))) return null
  if (data.config !== undefined && !isRecord(data.config)) return null

  const faq = data.faq === undefined ? undefined : validateFaq(data.faq)
  if (faq === null) return null
  return { config: readConfig(data.config ?? {}), faq }
}

export function serializeDocument(config: AppConfig, faq: FaqEntry[]): string {
  return `${JSON.stringify({ config, faq }, null, 2)}\n`
}

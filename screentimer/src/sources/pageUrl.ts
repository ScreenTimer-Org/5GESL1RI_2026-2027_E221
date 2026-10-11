import { configFromSearch, writeConfigToSearch } from '../config/codec'
import type { ConfigPatch } from '../config/schema'
import { decodeFaqEntries, decodeHidden, encodeFaqEntries, encodeHidden, type FaqEdits } from './faqEdits'
import { normalizeSource, type SourceSpec } from './sourceSpec'

/**
 * Everything a screen needs that is not in its sources. It lives in the page
 * URL, so copying the link shares the whole setup.
 */
export interface PageState {
  configSource: SourceSpec
  faqSource: SourceSpec
  /** Config values set on this screen, applied over the config source. */
  overrides: ConfigPatch
  faqEdits: FaqEdits
}

/** Used for both the config and the FAQ when the URL names no source. */
export const DEFAULT_SOURCE: SourceSpec = 'config.json'

const PARAMS = {
  /** Source of both the config and the FAQ. */
  source: 'src',
  configSource: 'configSrc',
  faqSource: 'faqSrc',
  faqAdded: 'faqAdd',
  faqHidden: 'faqHide',
} as const

export function readPageState(search: string): PageState {
  const params = new URLSearchParams(search)
  const shared = params.get(PARAMS.source)
  const configSource = params.get(PARAMS.configSource) ?? shared
  const faqSource = params.get(PARAMS.faqSource) ?? shared

  const overrides = configFromSearch(params)
  if (overrides.invalid.length > 0) console.warn('Ignored invalid config values from URL:', overrides.invalid)

  return {
    configSource: normalizeSource(configSource ?? DEFAULT_SOURCE),
    faqSource: normalizeSource(faqSource ?? DEFAULT_SOURCE),
    overrides: overrides.config,
    faqEdits: {
      added: decodeFaqEntries(params.get(PARAMS.faqAdded) ?? ''),
      hidden: decodeHidden(params.get(PARAMS.faqHidden) ?? ''),
    },
  }
}

/** Query parameters that are not ours are kept as they are. */
export function writePageState(state: PageState, current: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(current)
  for (const name of Object.values(PARAMS)) params.delete(name)

  const { configSource, faqSource, overrides, faqEdits } = state
  if (configSource === faqSource) {
    if (configSource !== DEFAULT_SOURCE) params.set(PARAMS.source, configSource)
  } else {
    if (configSource !== DEFAULT_SOURCE) params.set(PARAMS.configSource, configSource)
    if (faqSource !== DEFAULT_SOURCE) params.set(PARAMS.faqSource, faqSource)
  }

  writeConfigToSearch(overrides, params)
  if (faqEdits.added.length > 0) params.set(PARAMS.faqAdded, encodeFaqEntries(faqEdits.added))
  if (faqEdits.hidden.length > 0) params.set(PARAMS.faqHidden, encodeHidden(faqEdits.hidden))
  return params
}

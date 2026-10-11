import { configFromSearch, validateConfig, type ValidationResult } from './codec'
import { resolveSameOrigin } from './safeUrl'
import { DEFAULT_CONFIG, type AppConfig, type ConfigPatch } from './schema'

/** Query parameter selecting the JSON config file to load. */
export const CONFIG_FILE_PARAM = 'config'
const DEFAULT_CONFIG_FILE = 'config.json'

export interface LoadedConfig {
  /** Defaults merged with the JSON file: the reference the URL is diffed against. */
  base: AppConfig
  config: AppConfig
}

function reportInvalid(source: string, { invalid }: ValidationResult) {
  if (invalid.length > 0) console.warn(`Ignored invalid config values from ${source}:`, invalid)
}

/** Only same-origin files are loaded, so a shared link cannot pull a foreign config. */
async function fetchConfigFile(path: string): Promise<ConfigPatch> {
  const url = resolveSameOrigin(path)
  if (!url) {
    console.warn(`Ignored config file outside this origin: ${path}`)
    return {}
  }
  try {
    const response = await fetch(url, { cache: 'no-cache' })
    if (!response.ok) return {}
    const result = validateConfig(await response.json())
    reportInvalid(path, result)
    return result.config
  } catch {
    return {}
  }
}

/** Resolution order: defaults, then the JSON file, then URL parameters. */
export async function loadConfig(search: string): Promise<LoadedConfig> {
  const params = new URLSearchParams(search)
  const file = params.get(CONFIG_FILE_PARAM) ?? DEFAULT_CONFIG_FILE
  const base = { ...DEFAULT_CONFIG, ...(await fetchConfigFile(file)) }
  const fromUrl = configFromSearch(params)
  reportInvalid('URL', fromUrl)
  return { base, config: { ...base, ...fromUrl.config } }
}

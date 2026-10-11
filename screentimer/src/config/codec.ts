import * as v from 'valibot'
import { CONFIG_KEYS, configSchema, type AppConfig, type ConfigKey, type ConfigPatch } from './schema'

export interface ValidationResult {
  config: ConfigPatch
  /** Keys that were present but rejected by the schema. */
  invalid: ConfigKey[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates untrusted input (URL, JSON file) field by field, so one bad value
 * does not discard the rest. Unknown keys are ignored.
 */
export function validateConfig(input: unknown): ValidationResult {
  const result: ValidationResult = { config: {}, invalid: [] }
  if (!isRecord(input)) return result

  const config: Record<string, unknown> = {}
  for (const key of CONFIG_KEYS) {
    if (!Object.hasOwn(input, key)) continue
    const parsed = v.safeParse(configSchema.entries[key], input[key])
    if (parsed.success) config[key] = parsed.output
    else result.invalid.push(key)
  }
  result.config = config as ConfigPatch
  return result
}

export type FieldResult<K extends ConfigKey = ConfigKey> =
  | { ok: true; value: AppConfig[K] }
  | { ok: false; error: string }

/** Validates a single value, e.g. what the user is typing in the config panel. */
export function validateField<K extends ConfigKey>(key: K, raw: unknown): FieldResult<K> {
  const parsed = v.safeParse(configSchema.entries[key], raw)
  return parsed.success
    ? { ok: true, value: parsed.output as AppConfig[K] }
    : { ok: false, error: parsed.issues[0]?.message ?? 'Valeur invalide' }
}

export function sanitizeConfig(input: unknown): ConfigPatch {
  return validateConfig(input).config
}

export function configFromSearch(params: URLSearchParams): ValidationResult {
  return validateConfig(Object.fromEntries(params))
}

/**
 * Writes only the values that differ from `base`, so URLs stay short.
 * Query parameters that are not config keys are kept as they are.
 */
export function configToSearch(
  config: AppConfig,
  base: AppConfig,
  current: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of current) {
    if (!(CONFIG_KEYS as string[]).includes(key)) params.append(key, value)
  }
  for (const key of CONFIG_KEYS) {
    if (config[key] !== base[key]) params.set(key, String(config[key]))
  }
  return params
}

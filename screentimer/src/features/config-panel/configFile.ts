import { validateConfig, type ValidationResult } from '../../config/codec'
import type { AppConfig } from '../../config/schema'

const MAX_FILE_BYTES = 100 * 1024

function fileName(config: AppConfig): string {
  const slug = config.course
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents left by NFD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'screentimer'}.json`
}

export function downloadConfig(config: AppConfig): void {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName(config)
  link.click()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Throws on oversized or malformed files. Invalid fields are reported, not applied. */
export async function readConfigFile(file: File): Promise<ValidationResult> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux')
  return validateConfig(JSON.parse(await file.text()))
}

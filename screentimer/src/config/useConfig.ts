import { useCallback, useEffect, useState } from 'react'
import { configToSearch } from './codec'
import { loadConfig, type LoadedConfig } from './loadConfig'
import { DEFAULT_CONFIG, type AppConfig, type ConfigPatch } from './schema'

function writeToUrl({ config, base }: LoadedConfig) {
  const url = new URL(window.location.href)
  url.search = configToSearch(config, base, url.searchParams).toString()
  window.history.replaceState(null, '', url)
}

export function useConfig() {
  const [state, setState] = useState<LoadedConfig | null>(null)

  useEffect(() => {
    let cancelled = false
    loadConfig(window.location.search).then((loaded) => {
      if (!cancelled) setState(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (state) writeToUrl(state)
  }, [state])

  const update = useCallback((patch: ConfigPatch) => {
    setState((prev) => prev && { ...prev, config: { ...prev.config, ...patch } })
  }, [])

  /** Replaces the whole config, e.g. after importing a JSON file. */
  const replace = useCallback((patch: ConfigPatch) => {
    setState((prev) => prev && { ...prev, config: { ...DEFAULT_CONFIG, ...patch } })
  }, [])

  /** Drops URL overrides and goes back to the JSON file values. */
  const reset = useCallback(() => {
    setState((prev) => prev && { ...prev, config: prev.base })
  }, [])

  const config: AppConfig | null = state?.config ?? null
  return { config, update, replace, reset }
}

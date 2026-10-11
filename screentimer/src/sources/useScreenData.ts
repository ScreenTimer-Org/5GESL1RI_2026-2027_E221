import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CONFIG, type AppConfig, type ConfigKey, type ConfigPatch } from '../config/schema'
import { MAX_FAQ_ENTRIES, type FaqEntry } from '../features/faq/parseFaq'
import { applyFaqEdits, NO_FAQ_EDITS, questionKey } from './faqEdits'
import { readPageState, writePageState, type PageState } from './pageUrl'
import type { SourceSpec } from './sourceSpec'
import { useSource } from './useSource'

const NO_ENTRIES: FaqEntry[] = []

function writeToUrl(state: PageState) {
  const url = new URL(window.location.href)
  url.search = writePageState(state, url.searchParams).toString()
  window.history.replaceState(null, '', url)
}

/**
 * Resolves what the screen shows. Config: defaults, then the config source,
 * then the local overrides. FAQ: the FAQ source minus the hidden questions,
 * plus the added ones. When both sources are the same, it is fetched once.
 */
export function useScreenData() {
  const [page, setPage] = useState(() => readPageState(window.location.search))

  useEffect(() => writeToUrl(page), [page])

  const refreshSeconds = useRef(DEFAULT_CONFIG.refresh)
  const configSource = useSource(page.configSource, refreshSeconds)
  const base = useMemo<AppConfig>(() => ({ ...DEFAULT_CONFIG, ...configSource.doc?.config }), [configSource.doc])
  const config = useMemo<AppConfig>(() => ({ ...base, ...page.overrides }), [base, page.overrides])

  useEffect(() => {
    refreshSeconds.current = config.refresh
  }, [config.refresh])

  // The FAQ is only shown in exam mode: a separate FAQ source is not polled during a break.
  const sharedSource = page.faqSource === page.configSource
  const ownFaqSource = useSource(sharedSource || config.mode !== 'exam' ? '' : page.faqSource, refreshSeconds)
  const faqSource = sharedSource ? configSource : ownFaqSource
  const sourceFaq = faqSource.doc?.faq ?? NO_ENTRIES
  const faq = useMemo(() => applyFaqEdits(sourceFaq, page.faqEdits), [sourceFaq, page.faqEdits])

  // Wait for the config source once, so the screen does not flash the defaults on load.
  const [ready, setReady] = useState(false)
  if (!ready && configSource.settled) setReady(true)

  const actions = useMemo(
    () => ({
      setSources: (configSource: SourceSpec, faqSource: SourceSpec) =>
        setPage((prev) => ({ ...prev, configSource, faqSource })),

      override: (patch: ConfigPatch) =>
        setPage((prev) => ({ ...prev, overrides: { ...prev.overrides, ...patch } })),

      clearOverride: (key: ConfigKey) =>
        setPage((prev) => {
          const overrides = { ...prev.overrides }
          delete overrides[key]
          return { ...prev, overrides }
        }),

      /** Past MAX_FAQ_ENTRIES, the whole list would be rejected when read back from the URL. */
      addFaq: (entry: FaqEntry) =>
        setPage((prev) =>
          prev.faqEdits.added.length >= MAX_FAQ_ENTRIES
            ? prev
            : { ...prev, faqEdits: { ...prev.faqEdits, added: [...prev.faqEdits.added, entry] } },
        ),

      removeAddedFaq: (index: number) =>
        setPage((prev) => ({
          ...prev,
          faqEdits: { ...prev.faqEdits, added: prev.faqEdits.added.filter((_, i) => i !== index) },
        })),

      setFaqHidden: (question: string, hidden: boolean) =>
        setPage((prev) => {
          const key = questionKey(question)
          const others = prev.faqEdits.hidden.filter((k) => k !== key)
          return { ...prev, faqEdits: { ...prev.faqEdits, hidden: hidden ? [...others, key] : others } }
        }),

      /** Drops every local change and goes back to what the sources say. */
      resetLocal: () => setPage((prev) => ({ ...prev, overrides: {}, faqEdits: NO_FAQ_EDITS })),
    }),
    [],
  )

  return {
    ready,
    config,
    /** Config without the local overrides. */
    base,
    faq,
    sourceFaq,
    page,
    configSource,
    faqSource,
    actions,
  }
}

export type ScreenData = ReturnType<typeof useScreenData>
export type ScreenActions = ScreenData['actions']

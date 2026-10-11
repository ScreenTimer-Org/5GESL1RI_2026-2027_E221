import { useMemo, useState } from 'react'
import { useCycle } from '../../hooks/useCycle'
import { FaqList } from '../faq/FaqList'
import { FaqStatus } from '../faq/FaqStatus'
import type { FaqEntry } from '../faq/parseFaq'
import type { FaqState } from '../faq/useEtherpadFaq'
import { useFaqPages } from '../faq/useFaqPages'
import { InstructionList } from '../instructions/InstructionList'
import styles from './InfoPanel.module.css'
import { PageIndicator } from './PageIndicator'

type Page = { kind: 'instructions' } | { kind: 'faq'; entries: FaqEntry[]; number: number; total: number }

interface InfoPanelProps {
  instructions: string[]
  faq: FaqState
  cycleSeconds: number
}

export function InfoPanel({ instructions, faq, cycleSeconds }: InfoPanelProps) {
  const { viewportRef, measureRef, pages: faqPages } = useFaqPages(faq.entries)
  const [paused, setPaused] = useState(false)

  const pages = useMemo<Page[]>(() => {
    const hasInstructions = instructions.length > 0
    const faqContent = faqPages.length > 0 ? faqPages : hasInstructions ? [] : [[]]
    return [
      ...(hasInstructions ? [{ kind: 'instructions' as const }] : []),
      ...faqContent.map((entries, i, all) => ({
        kind: 'faq' as const,
        entries,
        number: i + 1,
        total: all.length,
      })),
    ]
  }, [instructions.length, faqPages])

  const index = useCycle(pages.length, cycleSeconds, paused)
  const page = pages[index]

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {page?.kind === 'faq' ? 'Questions fréquentes' : 'Consignes'}
          {page?.kind === 'faq' && page.total > 1 && (
            <span className={styles.counter}>
              {page.number}/{page.total}
            </span>
          )}
        </h2>
        <div className={styles.headerActions}>
          {page?.kind === 'faq' && <FaqStatus faq={faq} />}
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Reprendre la rotation' : 'Mettre en pause la rotation'}
            title={paused ? 'Reprendre la rotation' : 'Mettre en pause la rotation'}
          >
            {paused ? '▶' : '⏸'}
          </button>
        </div>
      </header>

      <div ref={viewportRef} className={styles.viewport}>
        {page && (
          <div key={index} className={styles.page}>
            {page.kind === 'instructions' ? (
              <InstructionList items={instructions} />
            ) : page.entries.length > 0 ? (
              <FaqList entries={page.entries} />
            ) : (
              <p className={styles.empty}>Aucune question pour le moment.</p>
            )}
          </div>
        )}
        {faq.entries.length > 0 && (
          <div className={styles.measure} aria-hidden>
            <FaqList ref={measureRef} entries={faq.entries} />
          </div>
        )}
      </div>

      {pages.length > 1 && (
        <PageIndicator count={pages.length} index={index} cycleSeconds={cycleSeconds} paused={paused} />
      )}
    </section>
  )
}
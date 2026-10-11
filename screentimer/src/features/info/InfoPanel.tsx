import { useMemo } from 'react'
import { useCycle } from '../../hooks/useCycle'
import type { SourceState } from '../../sources/useSource'
import { FaqList } from '../faq/FaqList'
import { FaqStatus } from '../faq/FaqStatus'
import type { FaqEntry } from '../faq/parseFaq'
import { useFaqPages } from '../faq/useFaqPages'
import { InstructionList } from '../instructions/InstructionList'
import styles from './InfoPanel.module.css'
import { PageIndicator } from './PageIndicator'

type Page = { kind: 'instructions' } | { kind: 'faq'; entries: FaqEntry[]; number: number; total: number }

interface InfoPanelProps {
  instructions: string[]
  faq: FaqEntry[]
  faqStatus: SourceState
  cycleSeconds: number
}

/**
 * Rotates between the instructions and as many FAQ pages as needed to fit.
 * An empty FAQ is hidden, unless there are no instructions: the panel then
 * shows the FAQ's empty state instead of nothing.
 */
export function InfoPanel({ instructions, faq, faqStatus, cycleSeconds }: InfoPanelProps) {
  const { viewportRef, measureRef, pages: faqPages } = useFaqPages(faq)

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

  const index = useCycle(pages.length, cycleSeconds)
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
        {page?.kind === 'faq' && <FaqStatus status={faqStatus} />}
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
        {faq.length > 0 && (
          <div className={styles.measure} aria-hidden>
            <FaqList ref={measureRef} entries={faq} />
          </div>
        )}
      </div>

      {pages.length > 1 && <PageIndicator count={pages.length} index={index} cycleSeconds={cycleSeconds} />}
    </section>
  )
}

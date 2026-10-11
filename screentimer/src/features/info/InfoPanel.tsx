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

interface InfoPanelProps {
  instructions: string[]
  faq: FaqState
  cycleSeconds: number
}

export function InfoPanel({ instructions, faq, cycleSeconds }: InfoPanelProps) {
  return (
    <div className={styles.split}>
      <InstructionsPanel instructions={instructions} />
      <FaqPanel faq={faq} cycleSeconds={cycleSeconds} />
    </div>
  )
}

function InstructionsPanel({ instructions }: { instructions: string[] }) {
  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Consignes</h2>
      </header>
      <div className={styles.viewport}>
        {instructions.length > 0 ? (
          <InstructionList items={instructions} />
        ) : (
          <p className={styles.empty}>Aucune consigne.</p>
        )}
      </div>
    </section>
  )
}

function FaqPanel({ faq, cycleSeconds }: { faq: FaqState; cycleSeconds: number }) {
  const { viewportRef, measureRef, pages: faqPages } = useFaqPages(faq.entries)
  const [paused, setPaused] = useState(false)

  const pages = useMemo<FaqEntry[][]>(
    () => (faqPages.length > 0 ? faqPages : [[]]),
    [faqPages],
  )

  const index = useCycle(pages.length, cycleSeconds, paused)
  const entries = pages[index] ?? []

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Questions fréquentes
          {pages.length > 1 && (
            <span className={styles.counter}>
              {index + 1}/{pages.length}
            </span>
          )}
        </h2>
        <div className={styles.headerActions}>
          <FaqStatus faq={faq} />
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
        <div key={index} className={styles.page}>
          {entries.length > 0 ? (
            <FaqList entries={entries} />
          ) : (
            <p className={styles.empty}>Aucune question pour le moment.</p>
          )}
        </div>
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
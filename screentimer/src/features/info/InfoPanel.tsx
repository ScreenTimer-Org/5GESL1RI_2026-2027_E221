import { useMemo, useState } from 'react'
import { useCycle } from '../../hooks/useCycle'
import type { SourceState } from '../../sources/useSource'
import { FaqList } from '../faq/FaqList'
import { FaqStatus } from '../faq/FaqStatus'
import type { FaqEntry } from '../faq/parseFaq'
import { useFaqPages } from '../faq/useFaqPages'
import { InstructionList } from '../instructions/InstructionList'
import styles from './InfoPanel.module.css'
import { PageIndicator } from './PageIndicator'

interface InfoPanelProps {
  instructions: string[]
  faq: FaqEntry[]
  faqStatus: SourceState
  cycleSeconds: number
}

/** Instructions and FAQ side by side. The FAQ rotates through as many pages as needed to fit. */
export function InfoPanel({ instructions, faq, faqStatus, cycleSeconds }: InfoPanelProps) {
  return (
    <div className={styles.split}>
      <InstructionsPanel instructions={instructions} />
      <FaqPanel faq={faq} status={faqStatus} cycleSeconds={cycleSeconds} />
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

interface FaqPanelProps {
  faq: FaqEntry[]
  status: SourceState
  cycleSeconds: number
}

function FaqPanel({ faq, status, cycleSeconds }: FaqPanelProps) {
  const { viewportRef, measureRef, pages: faqPages } = useFaqPages(faq)
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
          <FaqStatus status={status} />
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
        {faq.length > 0 && (
          <div className={styles.measure} aria-hidden>
            <FaqList ref={measureRef} entries={faq} />
          </div>
        )}
      </div>

      {pages.length > 1 && (
        <PageIndicator count={pages.length} index={index} cycleSeconds={cycleSeconds} paused={paused} />
      )}
    </section>
  )
}

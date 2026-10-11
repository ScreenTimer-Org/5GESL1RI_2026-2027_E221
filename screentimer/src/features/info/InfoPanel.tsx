import { useMemo, useState, type ReactNode } from 'react'
import { useCycle } from '../../hooks/useCycle'
import { usePages } from '../../hooks/usePages'
import type { SourceState } from '../../sources/useSource'
import { FaqList } from '../faq/FaqList'
import { FaqStatus } from '../faq/FaqStatus'
import type { FaqEntry } from '../faq/parseFaq'
import { InstructionList } from '../instructions/InstructionList'
import type { InstructionRow } from '../instructions/toInstructionRows'
import styles from './InfoPanel.module.css'
import { PageIndicator } from './PageIndicator'

interface InfoPanelProps {
  instructions: InstructionRow[]
  faq: FaqEntry[]
  faqStatus: SourceState
  cycleSeconds: number
}

/** Instructions and FAQ side by side, each split into as many pages as needed to fit. */
export function InfoPanel({ instructions, faq, faqStatus, cycleSeconds }: InfoPanelProps) {
  return (
    <div className={styles.split}>
      <PagedPanel
        title="Consignes"
        items={instructions}
        renderList={(rows) => <InstructionList rows={rows} />}
        empty="Aucune consigne."
        cycleSeconds={cycleSeconds}
      />
      <PagedPanel
        title="Questions fréquentes"
        items={faq}
        renderList={(entries) => <FaqList entries={entries} />}
        empty="Aucune question pour le moment."
        cycleSeconds={cycleSeconds}
        status={<FaqStatus status={faqStatus} />}
      />
    </div>
  )
}

interface PagedPanelProps<T> {
  title: string
  items: readonly T[]
  /** A list whose children are the given items, one each: they are measured to split the pages. */
  renderList: (items: readonly T[]) => ReactNode
  empty: string
  cycleSeconds: number
  status?: ReactNode
}

/** Rotates through the pages every `cycleSeconds`, unless paused on this screen. */
function PagedPanel<T>({ title, items, renderList, empty, cycleSeconds, status }: PagedPanelProps<T>) {
  const { viewportRef, measureRef, pages: fitted } = usePages(items)
  const [paused, setPaused] = useState(false)

  // An empty list still gets one page, which shows the `empty` message.
  const pages = useMemo<(readonly T[])[]>(() => (fitted.length > 0 ? fitted : [[]]), [fitted])
  const index = useCycle(pages.length, cycleSeconds, paused)
  const page = pages[index] ?? []
  const rotating = pages.length > 1
  const pauseLabel = `${paused ? 'Reprendre' : 'Mettre en pause'} la rotation : ${title}`

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {title}
          {rotating && (
            <span className={styles.counter}>
              {index + 1}/{pages.length}
            </span>
          )}
        </h2>
        <div className={styles.headerActions}>
          {status}
          {rotating && (
            <button
              type="button"
              className={styles.pauseButton}
              onClick={() => setPaused((p) => !p)}
              aria-label={pauseLabel}
              title={pauseLabel}
            >
              {paused ? '▶' : '⏸'}
            </button>
          )}
        </div>
      </header>

      <div ref={viewportRef} className={styles.viewport}>
        <div key={index} className={styles.page}>
          {page.length > 0 ? renderList(page) : <p className={styles.empty}>{empty}</p>}
        </div>
        {items.length > 0 && (
          <div ref={measureRef} className={styles.measure} aria-hidden>
            {renderList(items)}
          </div>
        )}
      </div>

      {rotating && <PageIndicator count={pages.length} index={index} cycleSeconds={cycleSeconds} paused={paused} />}
    </section>
  )
}

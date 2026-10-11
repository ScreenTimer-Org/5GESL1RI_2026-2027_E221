import type { Ref } from 'react'
import { MarkdownBlocks, MarkdownInline } from '../../markdown/Markdown'
import styles from './FaqList.module.css'
import type { FaqEntry } from './parseFaq'

interface FaqListProps {
  entries: FaqEntry[]
  ref?: Ref<HTMLDListElement>
}

export function FaqList({ entries, ref }: FaqListProps) {
  return (
    <dl ref={ref} className={styles.list}>
      {entries.map((entry, index) => (
        <div key={index} className={styles.entry}>
          <dt className={styles.question}>
            <MarkdownInline text={entry.question} />
          </dt>
          {entry.answer && (
            <dd className={styles.answer}>
              <MarkdownBlocks text={entry.answer} firstHeading={4} />
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

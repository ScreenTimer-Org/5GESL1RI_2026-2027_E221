import type { Ref } from 'react'
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
          <dt className={styles.question}>{entry.question}</dt>
          {entry.answer && <dd className={styles.answer}>{entry.answer}</dd>}
        </div>
      ))}
    </dl>
  )
}

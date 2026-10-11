import { MarkdownBlocks, MarkdownInline } from '../../markdown/Markdown'
import styles from './FaqList.module.css'
import type { FaqEntry } from './parseFaq'

/** One child per entry, as the pagination measures them. */
export function FaqList({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <dl className={styles.list}>
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

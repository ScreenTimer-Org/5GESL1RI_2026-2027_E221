import { Inline, MarkdownHeading } from '../../markdown/Markdown'
import styles from './InstructionList.module.css'
import type { InstructionRow } from './toInstructionRows'

/**
 * One child per row, as the pagination measures them. Each row is its own
 * list starting at the row's number, so a group split over two pages keeps
 * its numbering.
 */
export function InstructionList({ rows }: { rows: readonly InstructionRow[] }) {
  return (
    <div className={styles.rows}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row} data-heading={row.heading !== null}>
          {row.heading && (
            <MarkdownHeading level={row.heading.level} firstHeading={3}>
              {row.heading.children}
            </MarkdownHeading>
          )}
          {row.item && (
            <ol className={styles.list} start={row.number}>
              <li>
                <Inline nodes={row.item} />
              </li>
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}

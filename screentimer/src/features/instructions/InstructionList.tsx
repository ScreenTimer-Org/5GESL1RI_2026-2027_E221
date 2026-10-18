import { Inline, MarkdownHeading } from '../../markdown/Markdown'
import styles from './InstructionList.module.css'
import type { InstructionContent, InstructionRow } from './toInstructionRows'

/**
 * One child per row, as the pagination measures them. Each list item is its
 * own list starting at the item's number, so a list split over two pages
 * keeps its numbering.
 */
export function InstructionList({ rows }: { rows: readonly InstructionRow[] }) {
  return (
    <div className={styles.rows}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row} data-spacing={spacing(row)}>
          {row.heading && (
            <MarkdownHeading level={row.heading.level} firstHeading={3}>
              {row.heading.children}
            </MarkdownHeading>
          )}
          {row.content && <Content content={row.content} />}
        </div>
      ))}
    </div>
  )
}

/** Space before the row, as padding so that the pagination measures it. */
function spacing(row: InstructionRow): 'heading' | 'block' | 'none' {
  if (row.heading) return 'heading'
  return row.content?.type === 'line' && !row.content.first ? 'none' : 'block'
}

function Content({ content }: { content: InstructionContent }) {
  if (content.type === 'line') {
    return (
      <p className={styles.line}>
        <Inline nodes={content.children} />
      </p>
    )
  }
  const item = (
    <li>
      <Inline nodes={content.children} />
    </li>
  )
  return content.ordered ? (
    <ol className={styles.list} start={content.number}>
      {item}
    </ol>
  ) : (
    <ul className={styles.list}>{item}</ul>
  )
}

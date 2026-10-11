import { Inline, MarkdownHeading } from '../../markdown/Markdown'
import styles from './InstructionList.module.css'
import type { InstructionGroup } from './toInstructionGroups'

export function InstructionList({ groups }: { groups: InstructionGroup[] }) {
  return (
    <div className={styles.groups}>
      {groups.map((group, index) => (
        <section key={index}>
          {group.heading && (
            <MarkdownHeading level={group.heading.level} firstHeading={3}>
              {group.heading.children}
            </MarkdownHeading>
          )}
          {group.items.length > 0 && (
            <ol className={styles.list}>
              {group.items.map((item, i) => (
                <li key={i}>
                  <Inline nodes={item} />
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}

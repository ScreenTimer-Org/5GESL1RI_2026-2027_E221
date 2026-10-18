import { parseBlocks, type HeadingLevel, type InlineNode } from '../../markdown/parseMarkdown'

/** One line of a paragraph, or one list item. */
export type InstructionContent =
  | {
      type: 'line'
      children: InlineNode[]
      /** First line of its paragraph: the others follow it without spacing. */
      first: boolean
    }
  | {
      type: 'item'
      children: InlineNode[]
      ordered: boolean
      /** Number of the item in its list: it carries on across pages. */
      number: number
    }

/** The unit the instructions panel is split into pages by. */
export interface InstructionRow {
  /**
   * Set on the first row after a heading. A heading is kept with the line
   * or item that follows it, so a page never ends on a heading.
   */
  heading: { level: HeadingLevel; children: InlineNode[] } | null
  /** Null for a heading followed by nothing else. */
  content: InstructionContent | null
}

/** The Markdown of the instructions, as rows of one paragraph line or list item each. */
export function toInstructionRows(text: string): InstructionRow[] {
  const rows: InstructionRow[] = []
  let heading: InstructionRow['heading'] = null

  const push = (content: InstructionContent) => {
    rows.push({ heading, content })
    heading = null
  }

  for (const block of parseBlocks(text)) {
    if (block.type === 'heading') {
      if (heading) rows.push({ heading, content: null })
      heading = block
    } else if (block.type === 'paragraph') {
      block.lines.forEach((children, i) => push({ type: 'line', children, first: i === 0 }))
    } else {
      block.items.forEach((children, i) =>
        push({ type: 'item', children, ordered: block.ordered, number: block.start + i }),
      )
    }
  }
  if (heading) rows.push({ heading, content: null })
  return rows
}

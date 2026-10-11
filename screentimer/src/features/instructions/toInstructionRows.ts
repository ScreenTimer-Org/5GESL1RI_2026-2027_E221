import { parseBlocks, type HeadingLevel, type InlineNode } from '../../markdown/parseMarkdown'

/** One instruction, the unit the instructions panel is split into pages by. */
export interface InstructionRow {
  /**
   * Set on the first row of a group. A heading is kept with its first
   * instruction, so a page never ends on a heading.
   */
  heading: { level: HeadingLevel; children: InlineNode[] } | null
  /** Null for a heading followed by no instruction. */
  item: InlineNode[] | null
  /** Number of the instruction within its group, from 1: it carries on across pages. */
  number: number
}

/** One instruction per non-empty line. A `# heading` line starts a new group, numbered from 1 again. */
export function toInstructionRows(text: string): InstructionRow[] {
  const rows: InstructionRow[] = []
  let heading: InstructionRow['heading'] = null
  let number = 0

  for (const block of parseBlocks(text)) {
    if (block.type === 'heading') {
      if (heading) rows.push({ heading, item: null, number: 0 })
      heading = block
      number = 0
      continue
    }
    for (const line of block.lines) {
      number += 1
      rows.push({ heading, item: line, number })
      heading = null
    }
  }
  if (heading) rows.push({ heading, item: null, number: 0 })
  return rows
}

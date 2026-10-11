import { parseBlocks, type HeadingLevel, type InlineNode } from '../../markdown/parseMarkdown'

export interface InstructionGroup {
  heading: { level: HeadingLevel; children: InlineNode[] } | null
  /** One instruction per non-empty line. */
  items: InlineNode[][]
}

/** A `# heading` line starts a new group, numbered from 1 again. */
export function toInstructionGroups(text: string): InstructionGroup[] {
  const groups: InstructionGroup[] = []
  for (const block of parseBlocks(text)) {
    if (block.type === 'heading') {
      groups.push({ heading: block, items: [] })
    } else {
      if (groups.length === 0) groups.push({ heading: null, items: [] })
      groups[groups.length - 1].items.push(...block.lines)
    }
  }
  return groups
}

/**
 * Minimal Markdown subset for text from untrusted sources (pads, links):
 * `# headings` (levels 1 to 3), `**bold**`, `*italic*`, `***both***` and
 * `\` escapes. Anything else stays plain text. The result is a tree of
 * plain strings, never HTML, so it can only ever be rendered as text.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }

export type HeadingLevel = 1 | 2 | 3

export type BlockNode =
  | { type: 'heading'; level: HeadingLevel; children: InlineNode[] }
  /** Consecutive non-empty lines; an empty line starts a new paragraph. */
  | { type: 'paragraph'; lines: InlineNode[][] }

/** `####` and deeper are rendered as level 3, so a typo does not hide the line. */
const HEADING = /^(#{1,6})[ \t]+(.*)$/
const ESCAPABLE = new Set(['\\', '*', '#'])
const STAR = '*'

function starRun(src: string, at: number): number {
  let end = at
  while (src[end] === STAR) end++
  return end - at
}

/**
 * Index of the run of exactly `size` stars closing a span that opens at
 * `from`, or -1. Like CommonMark, a closer cannot follow whitespace and the
 * span cannot be empty.
 */
function findCloser(src: string, from: number, size: number): number {
  let i = from
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src[i] !== STAR) {
      i++
      continue
    }
    const run = starRun(src, i)
    if (run === size && i > from && !/\s/.test(src[i - 1])) return i
    i += run
  }
  return -1
}

function wrap(size: number, children: InlineNode[]): InlineNode {
  if (size === 1) return { type: 'em', children }
  if (size === 2) return { type: 'strong', children }
  return { type: 'strong', children: [{ type: 'em', children }] }
}

export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let text = ''
  // Once no closer of a size is found, none exists further on either: keeps the scan linear.
  const unclosed = new Set<number>()

  const flush = () => {
    if (text) nodes.push({ type: 'text', text })
    text = ''
  }

  let i = 0
  while (i < src.length) {
    const char = src[i]
    if (char === '\\' && ESCAPABLE.has(src[i + 1])) {
      text += src[i + 1]
      i += 2
      continue
    }
    if (char !== STAR) {
      text += char
      i++
      continue
    }

    const size = starRun(src, i)
    const opensSpan = size <= 3 && !unclosed.has(size) && i + size < src.length && !/\s/.test(src[i + size])
    const close = opensSpan ? findCloser(src, i + size, size) : -1
    if (close === -1) {
      if (opensSpan) unclosed.add(size)
      text += src.slice(i, i + size)
      i += size
      continue
    }
    flush()
    nodes.push(wrap(size, parseInline(src.slice(i + size, close))))
    i = close + size
  }
  flush()
  return nodes
}

export function parseBlocks(src: string): BlockNode[] {
  const blocks: BlockNode[] = []
  let paragraph: InlineNode[][] | null = null

  for (const raw of src.split('\n')) {
    const line = raw.trim()
    const heading = HEADING.exec(line)
    if (!line || heading) paragraph = null
    if (heading) {
      const level = Math.min(heading[1].length, 3) as HeadingLevel
      blocks.push({ type: 'heading', level, children: parseInline(heading[2].trim()) })
    } else if (line) {
      if (!paragraph) {
        paragraph = []
        blocks.push({ type: 'paragraph', lines: paragraph })
      }
      paragraph.push(parseInline(line))
    }
  }
  return blocks
}

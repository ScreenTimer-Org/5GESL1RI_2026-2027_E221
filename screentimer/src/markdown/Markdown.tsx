import { Fragment, useMemo } from 'react'
import styles from './Markdown.module.css'
import { parseBlocks, parseInline, type HeadingLevel, type InlineNode } from './parseMarkdown'

/** Only React elements and text nodes: Markdown never reaches the page as HTML. */
export function Inline({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) => {
    if (node.type === 'text') return <Fragment key={index}>{node.text}</Fragment>
    const Tag = node.type === 'strong' ? 'strong' : 'em'
    return (
      <Tag key={index}>
        <Inline nodes={node.children} />
      </Tag>
    )
  })
}

/** Bold and italic only, e.g. a FAQ question. */
export function MarkdownInline({ text }: { text: string }) {
  const nodes = useMemo(() => parseInline(text), [text])
  return <Inline nodes={nodes} />
}

const HEADING_TAGS = ['h3', 'h4', 'h5', 'h6'] as const

/**
 * `# Title` maps to `<h{firstHeading}>`, so headings stay below the panel
 * title in the document outline.
 */
export function MarkdownHeading({ level, children, firstHeading }: {
  level: HeadingLevel
  children: InlineNode[]
  firstHeading: 3 | 4
}) {
  const Tag = HEADING_TAGS[firstHeading - 3 + level - 1]
  return (
    <Tag className={styles.heading} data-level={level}>
      <Inline nodes={children} />
    </Tag>
  )
}

/** Headings, paragraphs and lists, e.g. a FAQ answer. Line breaks are kept. */
export function MarkdownBlocks({ text, firstHeading }: { text: string; firstHeading: 3 | 4 }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      return (
        <MarkdownHeading key={index} level={block.level} firstHeading={firstHeading}>
          {block.children}
        </MarkdownHeading>
      )
    }
    if (block.type === 'list') {
      const items = block.items.map((item, i) => (
        <li key={i}>
          <Inline nodes={item} />
        </li>
      ))
      return block.ordered ? (
        <ol key={index} className={styles.list} start={block.start}>
          {items}
        </ol>
      ) : (
        <ul key={index} className={styles.list}>
          {items}
        </ul>
      )
    }
    return (
      <p key={index} className={styles.paragraph}>
        {block.lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            <Inline nodes={line} />
          </Fragment>
        ))}
      </p>
    )
  })
}

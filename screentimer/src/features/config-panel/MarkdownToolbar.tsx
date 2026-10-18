import { useLayoutEffect, useRef, type RefObject } from 'react'
import styles from './ConfigPanel.module.css'

type TextField = HTMLInputElement | HTMLTextAreaElement

interface TextEdit {
  value: string
  start: number
  end: number
}

interface MarkdownToolbarProps {
  target: RefObject<TextField | null>
  /** Receives the edited text, like a change event would. */
  onEdit: (value: string) => void
  /** Off for single-line fields such as a FAQ question. */
  headings?: boolean
}

/** Inserts the Markdown syntax of `src/markdown/parseMarkdown.ts` around the selection. */
export function MarkdownToolbar({ target, onEdit, headings = false }: MarkdownToolbarProps) {
  const pendingSelection = useRef<TextEdit | null>(null)

  // The field is controlled, so React moves the caret to the end when it writes the
  // new value. The toolbar re-renders with its parent: put the selection back after that.
  useLayoutEffect(() => {
    const field = target.current
    const edit = pendingSelection.current
    if (!field || !edit || field.value !== edit.value) return
    pendingSelection.current = null
    field.focus()
    field.setSelectionRange(edit.start, edit.end)
  })

  const apply = (edit: (value: string, start: number, end: number) => TextEdit) => {
    const field = target.current
    if (!field) return
    const result = edit(field.value, field.selectionStart ?? 0, field.selectionEnd ?? 0)
    pendingSelection.current = result
    onEdit(result.value)
  }

  return (
    // preventDefault on mousedown keeps the focus, and so the selection, in the field.
    <div className={styles.toolbar} onMouseDown={(e) => e.preventDefault()}>
      {headings && (
        <button type="button" onClick={() => apply(toggleHeading)} title="Titre (# en début de ligne)" aria-label="Titre">
          T
        </button>
      )}
      <button type="button" onClick={() => apply(toggleWrap('**'))} title="Gras (**texte**)" aria-label="Gras">
        <strong>G</strong>
      </button>
      <button type="button" onClick={() => apply(toggleWrap('*'))} title="Italique (*texte*)" aria-label="Italique">
        <em>I</em>
      </button>
    </div>
  )
}

function countStars(value: string, from: number, step: 1 | -1): number {
  let count = 0
  for (let i = step === 1 ? from : from - 1; value[i] === '*'; i += step) count++
  return count
}

/** Whether `text` (trimmed) is entirely wrapped in `size` stars; `***` counts as both bold and italic. */
function isWrapped(text: string, size: number): boolean {
  const before = countStars(text, 0, 1)
  const after = countStars(text, text.length, -1)
  return text.length > 2 * before && ((before === size && after === size) || (before === 3 && after === 3))
}

function wrapLine(line: string, marker: string): string {
  const content = line.trim()
  if (!content) return line
  const at = line.indexOf(content)
  return line.slice(0, at) + marker + content + marker + line.slice(at + content.length)
}

function unwrapLine(line: string, size: number): string {
  const content = line.trim()
  if (!content) return line
  const at = line.indexOf(content)
  return line.slice(0, at) + content.slice(size, -size) + line.slice(at + content.length)
}

/**
 * Wraps the selection in `marker`, or unwraps it when it already is.
 * `***` counts as both bold and italic, so each button removes its own part.
 * Markdown spans stop at line ends, so a selection over several lines is
 * wrapped line by line.
 */
function toggleWrap(marker: string) {
  const size = marker.length
  return (value: string, start: number, end: number): TextEdit => {
    const selected = value.slice(start, end)
    if (selected.includes('\n')) {
      const lines = selected.split('\n')
      const filled = lines.filter((line) => line.trim())
      const unwrap = filled.length > 0 && filled.every((line) => isWrapped(line.trim(), size))
      const edited = lines.map((line) => (unwrap ? unwrapLine(line, size) : wrapLine(line, marker))).join('\n')
      return { value: value.slice(0, start) + edited + value.slice(end), start, end: start + edited.length }
    }

    const before = countStars(value, start, -1)
    const after = countStars(value, end, 1)
    if ((before === size && after === size) || (before === 3 && after === 3)) {
      return {
        value: value.slice(0, start - size) + selected + value.slice(end + size),
        start: start - size,
        end: end - size,
      }
    }
    // A closing marker cannot follow a space: keep the selection's outer spaces outside.
    while (start < end && /\s/.test(value[start])) start++
    while (end > start && /\s/.test(value[end - 1])) end--
    return {
      value: value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end),
      start: start + size,
      end: end + size,
    }
  }
}

const HEADING_PREFIX = /^#{1,6}[ \t]+/

/**
 * Adds `# ` to every selected line, or removes the heading marks when they
 * all have one. Blank lines are left alone: `# ` alone would show as a "#".
 */
function toggleHeading(value: string, start: number, end: number): TextEdit {
  const from = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end)
  const to = lineEnd === -1 ? value.length : lineEnd
  const lines = value.slice(from, to).split('\n')
  const filled = lines.filter((line) => line.trim())
  const allHeadings = filled.length > 0 && filled.every((line) => HEADING_PREFIX.test(line.trim()))
  const edited = lines
    .map((line) => {
      if (!line.trim()) return line
      if (allHeadings) return line.replace(/^(\s*)#{1,6}[ \t]+/, '$1')
      return HEADING_PREFIX.test(line.trim()) ? line : `# ${line.trimStart()}`
    })
    .join('\n')
  return { value: value.slice(0, from) + edited + value.slice(to), start: from, end: from + edited.length }
}

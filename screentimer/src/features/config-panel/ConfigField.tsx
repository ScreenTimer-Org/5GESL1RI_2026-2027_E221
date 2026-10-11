import { useId, useRef, useState, type ChangeEvent } from 'react'
import type { FieldDef, FieldKind } from '../../config/schema'
import styles from './ConfigPanel.module.css'
import { MarkdownToolbar } from './MarkdownToolbar'

interface ConfigFieldProps {
  field: FieldDef
  value: string | number
  /** Value from the config source, when this field overrides it. */
  sourceValue?: string | number
  /** Validates and applies the raw input; returns an error message when rejected. */
  onChange: (raw: string) => string | null
  /** Drops the override and goes back to the source value. */
  onReset: () => void
}

/**
 * Keeps a local draft so the user can type through transient invalid states
 * (empty number, half-typed link). Only valid values reach the config.
 */
export function ConfigField({ field, value, sourceValue, onChange, onReset }: ConfigFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [draft, setDraft] = useState(String(value))
  const [synced, setSynced] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  if (value !== synced) {
    setSynced(value)
    setDraft(String(value))
    setError(null)
  }

  const apply = (raw: string) => {
    setDraft(raw)
    setError(onChange(raw))
  }

  const inputProps = {
    id,
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => apply(e.target.value),
    'aria-invalid': error !== null,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className={styles.field} data-wide={WIDE_KINDS.includes(field.kind)}>
      <div className={styles.fieldHeader}>
        <label htmlFor={id}>{field.label}</label>
        <div className={styles.fieldTools}>
          {field.kind === 'markdown' && <MarkdownToolbar target={textarea} onEdit={apply} headings />}
          {sourceValue !== undefined && (
            <button
              type="button"
              className={styles.reset}
              onClick={onReset}
              title={`Modifié sur cet écran. Valeur de la source : ${formatSourceValue(sourceValue)}`}
              aria-label={`Rétablir la valeur de la source pour ${field.label}`}
            >
              modifié ↺
            </button>
          )}
        </div>
      </div>
      {field.kind === 'select' ? (
        <select {...inputProps}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.kind === 'textarea' || field.kind === 'markdown' ? (
        <textarea {...inputProps} ref={textarea} rows={5} />
      ) : (
        <input {...inputProps} {...INPUT_ATTRIBUTES[field.kind]} min={field.min} max={field.max} />
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

function formatSourceValue(value: string | number): string {
  const text = String(value)
  if (text === '') return '(vide)'
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

const WIDE_KINDS: FieldKind[] = ['textarea', 'markdown', 'url']

const INPUT_ATTRIBUTES = {
  text: { type: 'text' },
  url: { type: 'url', inputMode: 'url', spellCheck: false, placeholder: 'https://…' },
  number: { type: 'number' },
  time: { type: 'time', step: 1 },
} as const

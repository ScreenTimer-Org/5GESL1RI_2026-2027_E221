import { useId, useState, type ChangeEvent } from 'react'
import type { FieldDef } from '../../config/schema'
import styles from './ConfigPanel.module.css'

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

  if (value !== synced) {
    setSynced(value)
    setDraft(String(value))
    setError(null)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft(e.target.value)
    setError(onChange(e.target.value))
  }

  const inputProps = {
    id,
    value: draft,
    onChange: handleChange,
    'aria-invalid': error !== null,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className={styles.field} data-wide={field.kind === 'textarea' || field.kind === 'url'}>
      <div className={styles.fieldHeader}>
        <label htmlFor={id}>{field.label}</label>
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
      {field.kind === 'select' ? (
        <select {...inputProps}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea {...inputProps} rows={5} />
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

const INPUT_ATTRIBUTES = {
  text: { type: 'text' },
  url: { type: 'url', inputMode: 'url', spellCheck: false, placeholder: 'https://…' },
  number: { type: 'number' },
  time: { type: 'time', step: 1 },
} as const

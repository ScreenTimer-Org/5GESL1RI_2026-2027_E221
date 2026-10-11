import { useEffect } from 'react'
import { validateField } from '../../config/codec'
import { CONFIG_FIELDS, type AppConfig, type ConfigKey, type ConfigPatch } from '../../config/schema'
import { ConfigActions } from './ConfigActions'
import { ConfigField } from './ConfigField'
import styles from './ConfigPanel.module.css'

interface ConfigPanelProps {
  config: AppConfig
  onChange: (patch: ConfigPatch) => void
  onReplace: (patch: ConfigPatch) => void
  onReset: () => void
  onClose: () => void
}

export function ConfigPanel({ config, onChange, onReplace, onReset, onClose }: ConfigPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const changeField = (key: ConfigKey, raw: string): string | null => {
    const result = validateField(key, raw)
    if (!result.ok) return result.error
    onChange({ [key]: result.value })
    return null
  }

  return (
    <aside className={styles.panel} aria-label="Configuration">
      <header className={styles.header}>
        <h2>Configuration</h2>
        <button type="button" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </header>

      <ConfigActions config={config} onChange={onChange} onReplace={onReplace} onReset={onReset} />

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        {CONFIG_FIELDS.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(raw) => changeField(field.key, raw)}
          />
        ))}
      </form>
    </aside>
  )
}

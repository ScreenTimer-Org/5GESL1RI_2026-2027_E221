import { useEffect } from 'react'
import { validateField } from '../../config/codec'
import { CONFIG_FIELDS, type ConfigKey } from '../../config/schema'
import type { ScreenData } from '../../sources/useScreenData'
import { ConfigActions } from './ConfigActions'
import { ConfigField } from './ConfigField'
import styles from './ConfigPanel.module.css'
import { FaqEditor } from './FaqEditor'
import { SourcesSection } from './SourcesSection'

interface ConfigPanelProps {
  data: ScreenData
  onClose: () => void
}

export function ConfigPanel({ data, onClose }: ConfigPanelProps) {
  const { config, base, page, actions } = data

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
    actions.override({ [key]: result.value })
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

      <ConfigActions data={data} />

      <SourcesSection data={data} />

      <section className={styles.section}>
        <h3>Réglages</h3>
        <p className={styles.hint}>Les valeurs modifiées ici remplacent celles de la source sur cet écran.</p>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          {CONFIG_FIELDS.map((field) => (
            <ConfigField
              key={field.key}
              field={field}
              value={config[field.key]}
              sourceValue={Object.hasOwn(page.overrides, field.key) ? base[field.key] : undefined}
              onChange={(raw) => changeField(field.key, raw)}
              onReset={() => actions.clearOverride(field.key)}
            />
          ))}
        </form>
      </section>

      <FaqEditor data={data} />
    </aside>
  )
}

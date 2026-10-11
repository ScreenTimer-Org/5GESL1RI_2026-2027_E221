import { useRef, useState, type ChangeEvent } from 'react'
import type { AppConfig, ConfigPatch } from '../../config/schema'
import { toTimeOfDay } from '../../utils/time'
import { newWeeklyFramapadUrl } from '../faq/framapad'
import styles from './ConfigPanel.module.css'
import { downloadConfig, readConfigFile } from './configFile'

interface ConfigActionsProps {
  config: AppConfig
  onChange: (patch: ConfigPatch) => void
  onReplace: (patch: ConfigPatch) => void
  onReset: () => void
}

export function ConfigActions({ config, onChange, onReplace, onReset }: ConfigActionsProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { config: imported, invalid } = await readConfigFile(file)
      onReplace(imported)
      setMessage(invalid.length > 0 ? `Importé. Champs invalides ignorés : ${invalid.join(', ')}` : 'Configuration importée')
    } catch {
      setMessage('Fichier JSON invalide')
    }
  }

  /** Opening the link is what makes Framapad create the pad. */
  const createFramapad = () => {
    const pad = newWeeklyFramapadUrl()
    onChange({ pad })
    window.open(pad, '_blank', 'noopener,noreferrer')
    setMessage('Pad créé pour une semaine')
  }

  const copyLink = async () => {
    setMessage((await copyText(window.location.href)) ? 'Lien copié' : 'Copie impossible')
  }

  return (
    <div className={styles.actions}>
      <div className={styles.buttons}>
        <button type="button" data-primary onClick={() => onChange({ start: toTimeOfDay(new Date()) })}>
          Démarrer maintenant
        </button>
        <button type="button" onClick={() => onChange({ start: '' })} disabled={!config.start}>
          Arrêter
        </button>
      </div>
      <div className={styles.buttons}>
        <button type="button" onClick={() => downloadConfig(config)}>
          Exporter JSON
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Importer JSON
        </button>
        <button type="button" onClick={createFramapad}>
          Nouveau Framapad (1 semaine)
        </button>
        <button type="button" onClick={copyLink}>
          Copier le lien
        </button>
        <button type="button" onClick={onReset}>
          Réinitialiser
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importFile} />
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

import { useState } from 'react'
import { serializeDocument } from '../../sources/document'
import { parseSource } from '../../sources/sourceSpec'
import type { ScreenData } from '../../sources/useScreenData'
import { toTimeOfDay } from '../../utils/time'
import styles from './ConfigPanel.module.css'
import { copyText, downloadText, fileName } from './download'

export function ConfigActions({ data }: { data: ScreenData }) {
  const { config, faq, page, actions } = data
  const [message, setMessage] = useState('')

  const hasLocalChanges =
    Object.keys(page.overrides).length > 0 || page.faqEdits.added.length > 0 || page.faqEdits.hidden.length > 0
  const usesUpload = [page.configSource, page.faqSource].some((spec) => parseSource(spec).kind === 'upload')

  const copyLink = async () => {
    if (!(await copyText(window.location.href))) setMessage('Copie impossible')
    else setMessage(usesUpload ? 'Lien copié, sans le fichier importé (il reste sur cet appareil)' : 'Lien copié')
  }

  /** What the screen shows, ready to be pasted into a pad or served as a file. */
  const copyJson = async () => {
    setMessage((await copyText(serializeDocument(config, faq))) ? 'JSON copié' : 'Copie impossible')
  }

  return (
    <div className={styles.actions}>
      <div className={styles.buttons}>
        <button type="button" data-primary onClick={() => actions.override({ start: toTimeOfDay(new Date()) })}>
          Démarrer maintenant
        </button>
        <button type="button" onClick={() => actions.override({ start: '' })} disabled={!config.start}>
          Arrêter
        </button>
      </div>
      <div className={styles.buttons}>
        <button type="button" onClick={copyLink}>
          Copier le lien
        </button>
        <button type="button" onClick={() => downloadText(serializeDocument(config, faq), fileName(config.course))}>
          Exporter JSON
        </button>
        <button type="button" onClick={copyJson}>
          Copier JSON
        </button>
        <button type="button" onClick={actions.resetLocal} disabled={!hasLocalChanges}>
          Annuler les modifications locales
        </button>
      </div>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  )
}

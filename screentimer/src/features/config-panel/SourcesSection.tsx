import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { MAX_DOCUMENT_LENGTH, parseDocument, type SourceDocument } from '../../sources/document'
import { formatSource, isPadLink, parseSource, type Source, type SourceSpec } from '../../sources/sourceSpec'
import { saveUpload, useUpload } from '../../sources/uploads'
import type { ScreenData } from '../../sources/useScreenData'
import type { SourceState } from '../../sources/useSource'
import { formatClock } from '../../utils/time'
import { newWeeklyFramapadUrl } from '../faq/framapad'
import styles from './ConfigPanel.module.css'

export function SourcesSection({ data }: { data: ScreenData }) {
  const { page, configSource, faqSource, actions } = data
  const [linked, setLinked] = useState(page.configSource === page.faqSource)

  const toggleLinked = (e: ChangeEvent<HTMLInputElement>) => {
    setLinked(e.target.checked)
    if (e.target.checked) actions.setSources(page.configSource, page.configSource)
  }

  return (
    <section className={styles.section}>
      <h3>Sources</h3>
      <p className={styles.hint}>
        Pad Etherpad / Framapad, lien vers un fichier .json ou .txt, ou fichier importé, au format{' '}
        <code>{'{ "config": {…}, "faq": […] }'}</code>. Les deux clés sont facultatives.
      </p>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={linked} onChange={toggleLinked} />
        Même source pour la configuration et la FAQ
      </label>
      {linked ? (
        <SourcePicker
          label="Configuration et FAQ"
          slot="shared"
          spec={page.configSource}
          status={configSource}
          onChange={(spec) => actions.setSources(spec, spec)}
        />
      ) : (
        <>
          <SourcePicker
            label="Configuration"
            slot="config"
            spec={page.configSource}
            status={configSource}
            onChange={(spec) => actions.setSources(spec, page.faqSource)}
          />
          <SourcePicker
            label="FAQ"
            slot="faq"
            spec={page.faqSource}
            status={faqSource}
            onChange={(spec) => actions.setSources(page.configSource, spec)}
          />
        </>
      )}
    </section>
  )
}

type Kind = Source['kind']

interface SourcePickerProps {
  label: string
  /** Where a file imported from this picker is stored. */
  slot: string
  spec: SourceSpec
  status: SourceState
  onChange: (spec: SourceSpec) => void
}

/** A link only applies once submitted, so typing it does not fetch one URL per keystroke. */
function SourcePicker({ label, slot, spec, status, onChange }: SourcePickerProps) {
  const id = useId()
  const source = parseSource(spec)
  const [kind, setKind] = useState<Kind>(source.kind)
  const [link, setLink] = useState(source.kind === 'link' ? source.url : '')
  const [synced, setSynced] = useState(spec)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const ownUpload = useUpload(slot)
  const shownUpload = useUpload(source.kind === 'upload' ? source.slot : '')

  if (spec !== synced) {
    setSynced(spec)
    setKind(source.kind)
    setLink(source.kind === 'link' ? source.url : '')
  }

  const uploadSpec = formatSource({ kind: 'upload', slot })

  const selectKind = (next: Kind) => {
    setKind(next)
    setMessage('')
    if (next === 'none') onChange('')
    else if (next === 'upload' && ownUpload) onChange(uploadSpec)
  }

  const applyLink = (e: FormEvent) => {
    e.preventDefault()
    const next = parseSource(link)
    if (next.kind !== 'link') {
      setMessage('Lien http(s) ou chemin relatif attendu')
      return
    }
    setMessage('')
    onChange(next.url)
  }

  /** Opening the link is what makes Framapad create the pad. */
  const createFramapad = () => {
    const pad = newWeeklyFramapadUrl()
    setLink(pad)
    onChange(pad)
    window.open(pad, '_blank', 'noopener,noreferrer')
    setMessage('Pad créé pour une semaine. Remplacez son texte par le JSON (bouton « Copier JSON »).')
  }

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = file.size <= MAX_DOCUMENT_LENGTH * 4 ? await file.text() : ''
    if (!parseDocument(text)) {
      setMessage('Fichier invalide : JSON { "config": …, "faq": … } attendu (200 000 caractères maximum)')
      return
    }
    try {
      saveUpload(slot, { name: file.name, text, savedAt: new Date().toISOString() })
    } catch {
      setMessage('Enregistrement impossible : stockage du navigateur plein ou désactivé')
      return
    }
    setMessage('')
    onChange(uploadSpec)
  }

  return (
    <div className={styles.source}>
      <div className={styles.field}>
        <label htmlFor={id}>{label}</label>
        <select id={id} value={kind} onChange={(e) => selectKind(e.target.value as Kind)}>
          <option value="none">Lien de cette page uniquement</option>
          <option value="link">Pad ou lien vers un fichier</option>
          <option value="upload">Fichier importé</option>
        </select>
      </div>

      {kind === 'link' && (
        <form className={styles.inline} onSubmit={applyLink}>
          <input
            type="url"
            inputMode="url"
            spellCheck={false}
            placeholder="https://…"
            aria-label={`Lien de la source : ${label}`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button type="submit" disabled={source.kind === 'link' && link === source.url}>
            Charger
          </button>
          <button type="button" onClick={createFramapad}>
            Nouveau Framapad
          </button>
        </form>
      )}

      {kind === 'upload' && (
        <div className={styles.inline}>
          <span className={styles.fileName}>{shownUpload?.name ?? 'Aucun fichier'}</span>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Importer un fichier
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json,text/plain,.txt" hidden onChange={importFile} />
        </div>
      )}

      {kind === source.kind && (
        <p className={styles.message} data-error={status.error ? '' : undefined} role="status">
          {describeStatus(source, status)}
        </p>
      )}
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  )
}

function describeStatus(source: Source, status: SourceState): string {
  if (source.kind === 'none') return 'Seuls les réglages et questions ajoutés sur cet écran sont utilisés.'
  if (!status.settled) return 'Chargement…'
  const kept = status.doc ? ', dernière version valide conservée' : ''
  switch (status.error) {
    case 'network':
      return `Source injoignable${kept}`
    case 'format':
      return `JSON invalide${kept}`
    case 'missing':
      return 'Fichier absent de cet appareil : importez-le à nouveau'
  }
  // A pad that has not been polled yet (FAQ during a break) has no document.
  if (!status.doc) return source.kind === 'link' && isPadLink(source.url) ? 'Pad (lu via /export/txt)' : ''
  const pad = source.kind === 'link' && isPadLink(source.url) ? 'Pad · ' : ''
  const time = status.updatedAt ? ` · ${formatClock(status.updatedAt)}` : ''
  return `${pad}${describeDocument(status.doc)}${time}`
}

function describeDocument(doc: SourceDocument): string {
  const settings = Object.keys(doc.config).length
  const parts = [
    settings > 0 && `${settings} réglage${settings > 1 ? 's' : ''}`,
    doc.faq && `${doc.faq.length} question${doc.faq.length > 1 ? 's' : ''}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Ni réglage ni FAQ'
}

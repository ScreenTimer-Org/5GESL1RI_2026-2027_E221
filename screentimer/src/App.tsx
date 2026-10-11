import { useCallback, useEffect, useState } from 'react'
import { useConfig } from './config/useConfig'
import { ConfigPanel } from './features/config-panel/ConfigPanel'
import panelStyles from './features/config-panel/ConfigPanel.module.css'
import { Screen } from './features/screen/Screen'

export default function App() {
  const { config, update, replace, reset } = useConfig()
  const [panelOpen, setPanelOpen] = useState(false)
  const closePanel = useCallback(() => setPanelOpen(false), [])

  useEffect(() => {
    if (config) document.title = [config.course, config.room].filter(Boolean).join(' · ') || 'Screentimer'
  }, [config])

  if (!config) return null

  return (
    <>
      <Screen config={config} />
      {panelOpen ? (
        <ConfigPanel config={config} onChange={update} onReplace={replace} onReset={reset} onClose={closePanel} />
      ) : (
        <button
          type="button"
          className={panelStyles.toggle}
          onClick={() => setPanelOpen(true)}
          aria-label="Ouvrir la configuration"
          title="Configuration"
        >
          ⚙
        </button>
      )}
    </>
  )
}

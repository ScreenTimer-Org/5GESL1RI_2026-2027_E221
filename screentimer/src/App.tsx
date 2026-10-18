import { useCallback, useEffect, useState } from 'react'
import { ConfigPanel } from './features/config-panel/ConfigPanel'
import panelStyles from './features/config-panel/ConfigPanel.module.css'
import { Screen } from './features/screen/Screen'
import { useScreenData } from './sources/useScreenData'

export default function App() {
  const data = useScreenData()
  const { ready, config } = data
  const [panelOpen, setPanelOpen] = useState(false)
  const closePanel = useCallback(() => setPanelOpen(false), [])

  useEffect(() => {
    if (ready) document.title = [config.course, config.room].filter(Boolean).join(' · ') || 'Screentimer'
  }, [ready, config.course, config.room])

  if (!ready) return null

  return (
    <>
      <Screen config={config} faq={data.faq} faqStatus={data.faqSource} />
      {panelOpen ? (
        <ConfigPanel data={data} onClose={closePanel} />
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

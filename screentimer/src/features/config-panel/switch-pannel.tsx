// Permet de passer d'une vue avec 1 panel à une vue avec 2 panels

import { useState } from 'react'
import { ConfigPanel } from './features/config-panel/ConfigPanel'
import { SecondPanel } from './features/second-panel/SecondPanel'

export default function App() {
    const [twoPanels, setTwoPanels] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setTwoPanels(!twoPanels)}
            >
                {twoPanels ? 'Afficher 1 panel' : 'Afficher 2 panels'}
            </button>

            {!twoPanels ? (
                <ConfigPanel />
            ) : (
                <div className="panelsContainer">
                    <ConfigPanel />
                    <SecondPanel />
                </div>
            )}
        </>
    )
}
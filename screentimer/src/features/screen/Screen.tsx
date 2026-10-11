import { useMemo } from 'react'
import type { AppConfig } from '../../config/schema'
import type { SourceState } from '../../sources/useSource'
import type { FaqEntry } from '../faq/parseFaq'
import { InfoPanel } from '../info/InfoPanel'
import { toInstructionItems } from '../instructions/toInstructionItems'
import { TimerPanel } from '../timer/TimerPanel'
import { Clock } from './Clock'
import { Logo } from './Logo'
import styles from './Screen.module.css'

interface ScreenProps {
  config: AppConfig
  faq: FaqEntry[]
  faqStatus: SourceState
}

/** Components that tick (Clock, TimerPanel) own their clock, so the info panel is not re-rendered every second. */
export function Screen({ config, faq, faqStatus }: ScreenProps) {
  const isExam = config.mode === 'exam'
  const instructions = useMemo(() => toInstructionItems(config.instructions), [config.instructions])

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <Logo src={config.logo} />
        <Clock />
      </header>

      <main className={styles.main} data-layout={isExam ? 'split' : 'single'}>
        <TimerPanel config={config} />
        {isExam && <InfoPanel instructions={instructions} faq={faq} faqStatus={faqStatus} cycleSeconds={config.cycle} />}
      </main>
    </div>
  )
}

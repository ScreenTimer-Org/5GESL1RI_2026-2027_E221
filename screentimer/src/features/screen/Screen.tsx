import { useMemo } from 'react'
import type { AppConfig } from '../../config/schema'
import type { SourceState } from '../../sources/useSource'
import type { FaqEntry } from '../faq/parseFaq'
import { InfoPanel } from '../info/InfoPanel'
import { toInstructionRows } from '../instructions/toInstructionRows'
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
  const instructions = useMemo(() => toInstructionRows(config.instructions), [config.instructions])

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <Logo src={config.logo} />
        <div className={styles.topbarCenter}>{isExam && <TimerPanel config={config} size="compact" />}</div>
        <Clock />
      </header>

      {/* An exam needs room for the instructions and the FAQ; a break only shows the timer, in large. */}
      <main className={styles.main}>
        {isExam ? (
          <InfoPanel
            instructions={instructions}
            faq={faq}
            faqStatus={faqStatus}
            cycleSeconds={config.cycle}
            faqAlert={config.faqAlert}
          />
        ) : (
          <TimerPanel config={config} size="large" />
        )}
      </main>
    </div>
  )
}

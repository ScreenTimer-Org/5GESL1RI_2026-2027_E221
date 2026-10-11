import { useMemo } from 'react'
import type { AppConfig } from '../../config/schema'
import { useEtherpadFaq } from '../faq/useEtherpadFaq'
import { InfoPanel } from '../info/InfoPanel'
import { toInstructionItems } from '../instructions/toInstructionItems'
import { TimerPanel } from '../timer/TimerPanel'
import { Clock } from './Clock'
import { Logo } from './Logo'
import styles from './Screen.module.css'

/** Components that tick (Clock, TimerPanel) own their clock, so the info panel is not re-rendered every second. */
export function Screen({ config }: { config: AppConfig }) {
  const isExam = config.mode === 'exam'
  const faq = useEtherpadFaq(isExam ? config.pad : '', config.faqRefresh)
  const instructions = useMemo(() => toInstructionItems(config.instructions), [config.instructions])

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <Logo src={config.logo} />
        <TimerPanel config={config} />
        <Clock />
      </header>

      <main className={styles.main}>
        {isExam && <InfoPanel instructions={instructions} faq={faq} cycleSeconds={config.cycle} />}
      </main>
    </div>
  )
}
import type { AppConfig } from '../../config/schema'
import { useNow } from '../../hooks/useNow'
import { formatClock, formatDuration } from '../../utils/time'
import { computeTimer, type TimerState } from './computeTimer'
import styles from './TimerPanel.module.css'

export function TimerPanel({ config }: { config: AppConfig }) {
  const now = useNow()
  const timer = computeTimer(config, now)
  const canLeave = timer.leaveAt !== null && now >= timer.leaveAt

  return (
    <section className={styles.panel} data-status={timer.status}>
      <div className={styles.heading}>
        <h1 className={styles.course}>
          {config.course || (config.mode === 'break' ? 'Pause' : 'Examen')}
        </h1>
        {config.room && <p className={styles.room}>Salle {config.room}</p>}
      </div>

      <p className={styles.countdown} role="timer" aria-live="off">
        {formatDuration(timer.remainingMs)}
      </p>

      <div className={styles.meta}>
        <StatusLine timer={timer} />
        {timer.endsAt && (
          <span className={styles.metaItem}>
            {config.mode === 'break' ? 'Reprise' : 'Fin'} à {formatClock(timer.endsAt)}
          </span>
        )}
        {config.mode === 'exam' && timer.leaveAt && (
          <span className={styles.leave} data-allowed={canLeave}>
            {canLeave ? 'Sortie autorisée' : `Sortie à ${formatClock(timer.leaveAt)}`}
          </span>
        )}
      </div>
    </section>
  )
}

function statusLabel({ status, startsAt }: TimerState): string | null {
  switch (status) {
    case 'idle':
      return 'En attente'
    case 'scheduled':
      return startsAt && `Début à ${formatClock(startsAt)}`
    case 'warning':
      return 'Dernières minutes'
    case 'finished':
      return 'Temps écoulé'
    default:
      return null
  }
}

function StatusLine({ timer }: { timer: TimerState }) {
  const label = statusLabel(timer)
  return label ? <span className={styles.status}>{label}</span> : null
}
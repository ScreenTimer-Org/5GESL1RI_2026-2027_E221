import { useNow } from '../../hooks/useNow'
import { formatClock } from '../../utils/time'
import styles from './Screen.module.css'

export function Clock() {
  const now = useNow()
  return <time className={styles.clock}>{formatClock(now)}</time>
}

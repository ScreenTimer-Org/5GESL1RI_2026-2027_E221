import type { SourceError, SourceState } from '../../sources/useSource'
import { formatClock } from '../../utils/time'
import styles from './FaqList.module.css'

const ERROR_MESSAGES: Record<SourceError, string> = {
  network: 'Mise à jour de la source impossible',
  format: 'Source en cours de modification (JSON invalide)',
  missing: 'Fichier importé absent de cet appareil',
}

export function FaqStatus({ status }: { status: SourceState }) {
  if (status.error) {
    return (
      <p className={styles.status} data-error>
        {ERROR_MESSAGES[status.error]}
      </p>
    )
  }
  return status.updatedAt && <p className={styles.status}>Mise à jour à {formatClock(status.updatedAt)}</p>
}

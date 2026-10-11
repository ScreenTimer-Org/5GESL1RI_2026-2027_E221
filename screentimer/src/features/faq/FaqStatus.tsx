import { formatClock } from '../../utils/time'
import styles from './FaqList.module.css'
import type { FaqError, FaqState } from './useEtherpadFaq'

const ERROR_MESSAGES: Record<FaqError, string> = {
  network: 'Mise à jour de la FAQ impossible',
  format: 'FAQ en cours de modification (JSON invalide)',
}

export function FaqStatus({ faq }: { faq: FaqState }) {
  if (faq.error) {
    return (
      <p className={styles.status} data-error>
        {ERROR_MESSAGES[faq.error]}
      </p>
    )
  }
  return faq.updatedAt && <p className={styles.status}>Mise à jour à {formatClock(faq.updatedAt)}</p>
}

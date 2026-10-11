import styles from './PageIndicator.module.css'

interface PageIndicatorProps {
  count: number
  index: number
  cycleSeconds: number
  paused?: boolean
}

/** One segment per page; the active one fills up until the next rotation. */
export function PageIndicator({ count, index, cycleSeconds, paused = false }: PageIndicatorProps) {
  return (
    <div className={styles.indicator} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={styles.segment} data-state={i < index ? 'done' : i === index ? 'active' : 'todo'}>
          {i === index && !paused && (
            <span key={index} className={styles.fill} style={{ animationDuration: `${cycleSeconds}s` }} />
          )}
        </span>
      ))}
    </div>
  )
}
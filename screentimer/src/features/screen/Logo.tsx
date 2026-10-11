import { useState } from 'react'
import { isSafeUrl } from '../../config/safeUrl'
import styles from './Screen.module.css'

/**
 * External logo loaded through <img> only: an image (even an SVG) loaded this
 * way cannot run scripts. The referrer is not sent to the logo host, and a
 * broken link is hidden instead of showing a broken image.
 */
export function Logo({ src }: { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || !isSafeUrl(src) || failedSrc === src) return <span />

  return (
    <img
      className={styles.logo}
      src={src}
      alt="Logo de l'établissement"
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  )
}

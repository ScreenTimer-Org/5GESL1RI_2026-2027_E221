/** Framapad instance whose pads are deleted after one week of inactivity. */
const WEEKLY_INSTANCE = 'https://hebdo.framapad.org'

/** 32 symbols: `byte & 31` picks one without modulo bias. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
const NAME_LENGTH = 16

/** Anyone with the link can edit the pad, so the name must not be guessable. */
function randomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NAME_LENGTH))
  return Array.from(bytes, (byte) => ALPHABET[byte & 31]).join('')
}

/**
 * Builds a link the way framapad.org does (random name + hour-based suffix).
 * The pad itself is created by Framapad the first time the link is opened.
 */
export function newWeeklyFramapadUrl(): string {
  const suffix = Math.trunc(Date.now() / 3_600_000).toString(36)
  return `${WEEKLY_INSTANCE}/p/${randomName()}-${suffix}`
}

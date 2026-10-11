const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

export const MINUTE_MS = 60_000

export function isTimeOfDay(value: string): boolean {
  return TIME_OF_DAY.test(value)
}

/** Resolves `HH:MM[:SS]` to a Date on the same day as `reference`. */
export function parseTimeOfDay(value: string, reference: Date): Date | null {
  const match = TIME_OF_DAY.exec(value)
  if (!match) return null
  const [, hours, minutes, seconds = '0'] = match
  const date = new Date(reference)
  date.setHours(Number(hours), Number(minutes), Number(seconds), 0)
  return date
}

export function toTimeOfDay(date: Date): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

/** Formats a duration as `H:MM:SS`, or `MM:SS` under one hour. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

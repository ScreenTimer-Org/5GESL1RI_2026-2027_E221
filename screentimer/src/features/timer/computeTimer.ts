import type { AppConfig } from '../../config/schema'
import { MINUTE_MS, parseTimeOfDay } from '../../utils/time'

export type TimerStatus = 'idle' | 'scheduled' | 'running' | 'warning' | 'finished'

export interface TimerState {
  status: TimerStatus
  remainingMs: number
  startsAt: Date | null
  endsAt: Date | null
  leaveAt: Date | null
}

type TimerConfig = Pick<AppConfig, 'start' | 'duration' | 'minStay' | 'warning'>

const HALF_DAY_MS = 12 * 60 * MINUTE_MS

/** A start time far in the future means it began yesterday (exam crossing midnight). */
function resolveStart(start: string, now: Date): Date | null {
  const date = parseTimeOfDay(start, now)
  if (date && date.getTime() - now.getTime() > HALF_DAY_MS) date.setDate(date.getDate() - 1)
  return date
}

/** Derives the timer state from the config alone, so every client agrees. */
export function computeTimer(config: TimerConfig, now: Date): TimerState {
  const durationMs = config.duration * MINUTE_MS
  const startsAt = resolveStart(config.start, now)

  if (!startsAt) {
    return { status: 'idle', remainingMs: durationMs, startsAt: null, endsAt: null, leaveAt: null }
  }

  const endsAt = new Date(startsAt.getTime() + durationMs)
  const leaveAt = new Date(startsAt.getTime() + config.minStay * MINUTE_MS)
  const dates = { startsAt, endsAt, leaveAt }

  if (now < startsAt) return { status: 'scheduled', remainingMs: durationMs, ...dates }

  const remainingMs = Math.max(0, endsAt.getTime() - now.getTime())
  const status: TimerStatus =
    remainingMs === 0
      ? 'finished'
      : remainingMs <= config.warning * MINUTE_MS
        ? 'warning'
        : 'running'

  return { status, remainingMs, ...dates }
}

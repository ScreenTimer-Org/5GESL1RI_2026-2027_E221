import * as v from 'valibot'
import { isTimeOfDay } from '../utils/time'
import { isSafeUrl } from './safeUrl'

export const MODES = ['exam', 'break'] as const

interface Bounds {
  min: number
  max: number
}

export const LIMITS = {
  duration: { min: 1, max: 24 * 60 },
  minStay: { min: 0, max: 24 * 60 },
  warning: { min: 0, max: 24 * 60 },
  faqRefresh: { min: 60, max: 3600 },
  cycle: { min: 3, max: 600 },
} satisfies Record<string, Bounds>

/** Integer within bounds. Numeric strings (URL params, form inputs) are accepted. */
const integer = ({ min, max }: Bounds) =>
  v.pipe(
    v.union(
      [v.number(), v.pipe(v.string(), v.trim(), v.nonEmpty(), v.transform(Number))],
      'Nombre attendu',
    ),
    v.number('Nombre attendu'),
    v.integer('Nombre entier attendu'),
    v.minValue(min, `Minimum ${min}`),
    v.maxValue(max, `Maximum ${max}`),
  )

const text = (max: number) => v.pipe(v.string(), v.maxLength(max, `${max} caractères maximum`))

const url = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(2048, 'Lien trop long'),
  v.check((value) => value === '' || isSafeUrl(value), 'Lien http(s) ou chemin relatif attendu'),
)

const timeOfDay = v.pipe(
  v.string(),
  v.check((value) => value === '' || isTimeOfDay(value), 'Format HH:MM attendu'),
)

/**
 * Single source of truth for the screen. Every key is also the name of its
 * URL query parameter and of its property in the JSON config file.
 */
export const configSchema = v.object({
  mode: v.picklist(MODES, 'Mode inconnu'),
  course: text(120),
  room: text(60),
  /** School logo, http(s) link or path relative to the page. */
  logo: url,
  /** Exam or break duration, in minutes. */
  duration: integer(LIMITS.duration),
  /** Start time of day, `HH:MM` or `HH:MM:SS`. Empty means not started. */
  start: timeOfDay,
  /** Minutes after the start before students may leave the room. */
  minStay: integer(LIMITS.minStay),
  /** Minutes before the end when the timer switches to its warning state. */
  warning: integer(LIMITS.warning),
  /** One instruction per line. */
  instructions: text(5000),
  /** Etherpad pad URL used as the shared FAQ source. */
  pad: url,
  /** FAQ polling interval, in seconds. */
  faqRefresh: integer(LIMITS.faqRefresh),
  /** Time each instructions / FAQ page stays on screen, in seconds. */
  cycle: integer(LIMITS.cycle),
})

export type AppConfig = v.InferOutput<typeof configSchema>
export type ConfigKey = keyof AppConfig
export type ConfigPatch = Partial<AppConfig>
export type Mode = AppConfig['mode']

export const CONFIG_KEYS = Object.keys(configSchema.entries) as ConfigKey[]

export const DEFAULT_CONFIG: AppConfig = {
  mode: 'exam',
  course: '',
  room: '',
  logo: 'logo.png',
  duration: 120,
  start: '',
  minStay: 30,
  warning: 10,
  instructions: '',
  pad: '',
  faqRefresh: 60,
  cycle: 15,
}

export type FieldKind = 'text' | 'url' | 'textarea' | 'number' | 'time' | 'select'

export interface FieldDef {
  key: ConfigKey
  label: string
  kind: FieldKind
  options?: readonly { value: string; label: string }[]
  min?: number
  max?: number
}

/** Config panel form layout. */
export const CONFIG_FIELDS: readonly FieldDef[] = [
  {
    key: 'mode',
    label: 'Mode',
    kind: 'select',
    options: [
      { value: 'exam', label: 'Examen' },
      { value: 'break', label: 'Pause' },
    ],
  },
  { key: 'duration', label: 'Durée (min)', kind: 'number', ...LIMITS.duration },
  { key: 'course', label: 'Cours', kind: 'text' },
  { key: 'room', label: 'Salle', kind: 'text' },
  { key: 'start', label: 'Heure de début', kind: 'time' },
  { key: 'minStay', label: 'Sortie autorisée après (min)', kind: 'number', ...LIMITS.minStay },
  { key: 'warning', label: 'Alerte de fin (min)', kind: 'number', ...LIMITS.warning },
  { key: 'cycle', label: 'Rotation des pages (s)', kind: 'number', ...LIMITS.cycle },
  { key: 'logo', label: 'Logo (lien)', kind: 'url' },
  { key: 'instructions', label: 'Consignes (une par ligne)', kind: 'textarea' },
  { key: 'pad', label: 'FAQ Etherpad (lien)', kind: 'url' },
  { key: 'faqRefresh', label: 'Rafraîchissement FAQ (s)', kind: 'number', ...LIMITS.faqRefresh },
]

import * as v from 'valibot'
import { stripUnsafeChars } from '../utils/safeText'
import { isTimeOfDay } from '../utils/time'
import { isSafeUrl } from './safeUrl'

export const MODES = ['exam', 'break'] as const

/** How the screen signals a change of the FAQ. */
export const FAQ_ALERTS = ['off', 'visual', 'sound', 'both'] as const

interface Bounds {
  min: number
  max: number
}

export const LIMITS = {
  duration: { min: 1, max: 24 * 60 },
  minStay: { min: 0, max: 24 * 60 },
  warning: { min: 0, max: 24 * 60 },
  refresh: { min: 60, max: 3600 },
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

/** Config texts can come from a pad: they get the same cleaning as the FAQ. */
const text = (max: number) =>
  v.pipe(v.string(), v.transform(stripUnsafeChars), v.maxLength(max, `${max} caractères maximum`))

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
 * URL query parameter and of its property in the `config` object of a source.
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
  /** Markdown: headings, paragraphs and lists (see README). */
  instructions: text(5000),
  /** Polling interval of the config and FAQ sources, in seconds. */
  refresh: integer(LIMITS.refresh),
  /** Time each instructions / FAQ page stays on screen, in seconds. */
  cycle: integer(LIMITS.cycle),
  /** Alert shown and/or played when the FAQ changes. */
  faqAlert: v.picklist(FAQ_ALERTS, 'Alerte inconnue'),
})

export type AppConfig = v.InferOutput<typeof configSchema>
export type ConfigKey = keyof AppConfig
export type ConfigPatch = Partial<AppConfig>
export type Mode = AppConfig['mode']
export type FaqAlert = AppConfig['faqAlert']

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
  refresh: 60,
  cycle: 15,
  faqAlert: 'visual',
}

/** `markdown`: a textarea with the Markdown toolbar. */
export type FieldKind = 'text' | 'url' | 'textarea' | 'markdown' | 'number' | 'time' | 'select'

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
  {
    key: 'faqAlert',
    label: 'Alerte FAQ modifiée',
    kind: 'select',
    options: [
      { value: 'off', label: 'Aucune' },
      { value: 'visual', label: 'Visuelle' },
      { value: 'sound', label: 'Sonore' },
      { value: 'both', label: 'Visuelle et sonore' },
    ],
  },
  { key: 'logo', label: 'Logo (lien)', kind: 'url' },
  { key: 'instructions', label: 'Consignes (Markdown)', kind: 'markdown' },
  { key: 'refresh', label: 'Rafraîchissement des sources (s)', kind: 'number', ...LIMITS.refresh },
]

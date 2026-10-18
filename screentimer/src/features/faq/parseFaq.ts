import * as v from 'valibot'
import { stripUnsafeChars } from '../../utils/safeText'

export const MAX_FAQ_ENTRIES = 200
const MAX_FIELD_LENGTH = 2_000

function clean(text: string): string {
  const trimmed = stripUnsafeChars(text).trim()
  return trimmed.length > MAX_FIELD_LENGTH ? `${trimmed.slice(0, MAX_FIELD_LENGTH)}…` : trimmed
}

const text = v.pipe(v.string(), v.transform(clean))

const faqEntrySchema = v.strictObject({ question: v.pipe(text, v.nonEmpty()), answer: text })

/** The only accepted format: `[{ "question": "…", "answer": "…" }]`. */
const faqSchema = v.pipe(v.array(faqEntrySchema), v.maxLength(MAX_FAQ_ENTRIES))

export type FaqEntry = v.InferOutput<typeof faqEntrySchema>

/**
 * Returns null when `data` is not a valid FAQ list (e.g. a teacher is
 * mid-edit), so the caller can keep the last valid one. The result is plain
 * text and must be rendered as text only.
 */
export function validateFaq(data: unknown): FaqEntry[] | null {
  const result = v.safeParse(faqSchema, data)
  return result.success ? result.output : null
}

/** Validates a question typed in the config panel. */
export function validateFaqEntry(question: string, answer: string): FaqEntry | null {
  const result = v.safeParse(faqEntrySchema, { question, answer })
  return result.success ? result.output : null
}

import * as v from 'valibot'

const MAX_TEXT_LENGTH = 200_000
const MAX_ENTRIES = 200
const MAX_FIELD_LENGTH = 2_000

/**
 * Control characters (except tab and newline) and Unicode bidi overrides,
 * which could visually reorder or hide text on screen.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g

function clean(text: string): string {
  const trimmed = text.replace(UNSAFE_CHARS, '').trim()
  return trimmed.length > MAX_FIELD_LENGTH ? `${trimmed.slice(0, MAX_FIELD_LENGTH)}…` : trimmed
}

const text = v.pipe(v.string(), v.transform(clean))

/** The only accepted format: `[{ "question": "…", "answer": "…" }]`. */
const faqSchema = v.pipe(
  v.array(v.strictObject({ question: v.pipe(text, v.nonEmpty()), answer: text })),
  v.maxLength(MAX_ENTRIES),
)

export type FaqEntry = v.InferOutput<typeof faqSchema>[number]

/**
 * Returns null when the pad is not a valid FAQ (e.g. a teacher is mid-edit),
 * so the caller can keep the last valid one. The result is plain text and
 * must be rendered as text only.
 */
export function parseFaq(raw: string): FaqEntry[] | null {
  let data: unknown
  try {
    data = JSON.parse(raw.slice(0, MAX_TEXT_LENGTH))
  } catch {
    return null
  }
  const result = v.safeParse(faqSchema, data)
  return result.success ? result.output : null
}

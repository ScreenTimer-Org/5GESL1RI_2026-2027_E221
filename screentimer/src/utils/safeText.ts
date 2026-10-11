/**
 * Control characters (except tab and newline) and Unicode bidi overrides,
 * which could visually reorder or hide text on screen.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g

/** For text from untrusted sources (pads, links, URL), before it is shown on screen. */
export function stripUnsafeChars(text: string): string {
  return text.replace(UNSAFE_CHARS, '')
}

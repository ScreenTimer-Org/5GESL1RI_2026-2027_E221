/** One instruction per non-empty line. */
export function toInstructionItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

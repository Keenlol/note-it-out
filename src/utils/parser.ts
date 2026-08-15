// The parser. Deliberately tiny: a note is freeform prose, and the only thing
// the app reads out of it is `#tags`. Everything else — frequency counts, the
// tag × mood readout — derives from this one function.
//
// A tag can sit anywhere in a line, including mid-sentence:
//   "rough call with dad, ended up #crying"
// so the note and the count are the same keystroke.

export interface TagRef {
  name: string    // normalized (lowercase, no '#')
  raw: string     // as typed, without '#'
  start: number   // index of '#' within the line
  end: number     // exclusive
}

export interface ParsedLine {
  raw: string
  tags: TagRef[]
}

// Tag body: starts with a letter, then letters/digits/_/- . Unicode-aware so
// non-Latin tags work. Trailing '-' and '_' are trimmed off by normalizeTag.
const TAG_RE = /#(\p{L}[\p{L}\p{N}_-]*)/gu

/** Lowercase and strip trailing separators — "#Gym", "#gym-" → "gym". */
export function normalizeTag(name: string): string {
  return name.replace(/^#/, '').replace(/[-_]+$/, '').toLowerCase()
}

export function parseLine(line: string): ParsedLine {
  const tags: TagRef[] = []
  TAG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(line)) !== null) {
    const raw = m[1].replace(/[-_]+$/, '')
    if (!raw) continue
    tags.push({
      name: raw.toLowerCase(),
      raw,
      start: m.index,
      end: m.index + 1 + raw.length,
    })
  }
  return { raw: line, tags }
}

export function parseDoc(text: string): ParsedLine[] {
  return text.split('\n').map(parseLine)
}

/** Distinct normalized tag names in a block of text. */
export function tagsInText(text: string): Set<string> {
  const out = new Set<string>()
  for (const line of parseDoc(text)) {
    for (const t of line.tags) out.add(t.name)
  }
  return out
}

/** Every tag occurrence in a block of text, in document order (with duplicates). */
export function tagRefsInText(text: string): TagRef[] {
  return parseDoc(text).flatMap(l => l.tags)
}

/**
 * The tag currently under the cursor, for autocomplete. Returns null unless the
 * cursor sits at the end of a `#word` token — mid-token edits don't suggest,
 * since the ghost would be appended in the wrong place.
 */
export function activeTagFragment(text: string, cursor: number): { start: number; frag: string } | null {
  if (cursor > text.length) return null
  // Cursor must be at a token boundary: next char ends the tag.
  const next = text[cursor]
  if (next !== undefined && /[\p{L}\p{N}_-]/u.test(next)) return null

  let i = cursor - 1
  while (i >= 0 && /[\p{L}\p{N}_-]/u.test(text[i])) i--
  if (i < 0 || text[i] !== '#') return null

  const frag = text.slice(i + 1, cursor)
  // Bare '#' is a valid (empty) fragment — it means "show me everything".
  if (frag.length > 0 && !/^\p{L}/u.test(frag)) return null
  return { start: i, frag: frag.toLowerCase() }
}

/** Zero-based index of the line containing `cursor`. */
export function lineIndexAt(text: string, cursor: number): number {
  let count = 0
  for (let i = 0; i < cursor && i < text.length; i++) {
    if (text[i] === '\n') count++
  }
  return count
}

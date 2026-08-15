import type { DayData } from './storage'
import { parseDoc, tagsInText } from './parser'

// Tags are counted **per day**, not per occurrence: mentioning #crying twice in
// one day is still one day. "On how many days did this happen" is the number
// that means something for these, and it removes a whole class of counting
// ambiguity (no `x2` syntax, no dedup rules).

/** Below this many rated days with a tag, the mood delta is too noisy to show. */
export const MIN_MOOD_DAYS = 5

export interface TagStat {
  name: string          // normalized
  display: string       // most recent casing as typed
  days: number          // days containing the tag
  firstDate: string
  lastDate: string
  moodDays: number      // of those days, how many have a mood
  moodAvg: number | null
  /**
   * moodAvg minus the average mood of rated days *without* this tag.
   * null when there isn't enough data on either side to mean anything.
   */
  delta: number | null
}

export interface TagDay {
  date: string
  mood: number | null
  lines: string[]       // only the lines that mention the tag
}

/**
 * Build the tag catalog from every stored day.
 * `days` is expected newest-first (as returned by getAllDays).
 */
export function buildTagCatalog(days: DayData[]): TagStat[] {
  const acc = new Map<string, {
    display: string
    dates: string[]
    moods: number[]
  }>()

  // Which rated days carry which tags, for the baseline comparison below.
  const ratedDays: { mood: number; tags: Set<string> }[] = []

  for (const day of days) {
    const seen = new Map<string, string>()   // normalized -> raw casing
    for (const line of parseDoc(day.rawText)) {
      for (const t of line.tags) {
        if (!seen.has(t.name)) seen.set(t.name, t.raw)
      }
    }
    if (day.mood !== null) {
      ratedDays.push({ mood: day.mood, tags: new Set(seen.keys()) })
    }
    for (const [name, raw] of seen) {
      let entry = acc.get(name)
      if (!entry) {
        // days is newest-first, so the first casing seen is the most recent one.
        entry = { display: raw, dates: [], moods: [] }
        acc.set(name, entry)
      }
      entry.dates.push(day.date)
      if (day.mood !== null) entry.moods.push(day.mood)
    }
  }

  const out: TagStat[] = []
  for (const [name, entry] of acc) {
    const sorted = [...entry.dates].sort()
    const moodAvg = entry.moods.length > 0 ? mean(entry.moods) : null

    // Baseline = rated days that do NOT carry this tag. Comparing against the
    // overall average would include the tagged days themselves, which shrinks
    // every delta toward zero and shrinks it most for the commonest tags.
    const without = ratedDays.filter(d => !d.tags.has(name)).map(d => d.mood)
    const delta =
      moodAvg !== null &&
      entry.moods.length >= MIN_MOOD_DAYS &&
      without.length >= MIN_MOOD_DAYS
        ? moodAvg - mean(without)
        : null

    out.push({
      name,
      display: entry.display,
      days: entry.dates.length,
      firstDate: sorted[0],
      lastDate: sorted[sorted.length - 1],
      moodDays: entry.moods.length,
      moodAvg,
      delta,
    })
  }
  return out
}

/** Days mentioning `name`, newest first, with only the matching lines. */
export function getTagDays(name: string, days: DayData[]): TagDay[] {
  const out: TagDay[] = []
  for (const day of days) {
    const lines = parseDoc(day.rawText)
      .filter(l => l.tags.some(t => t.name === name))
      .map(l => l.raw.trim())
    if (lines.length > 0) out.push({ date: day.date, mood: day.mood, lines })
  }
  return out
}

/** Every distinct tag seen anywhere, with day counts — used for autocomplete ranking. */
export function tagFrequency(days: DayData[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const day of days) {
    for (const name of tagsInText(day.rawText)) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return counts
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

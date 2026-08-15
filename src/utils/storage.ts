// One record per day, holding both the note text and the day's mood.
// Keeping them together (rather than in two key spaces) means export, import
// and "is this day empty" are single lookups.

export interface DayData {
  date: string
  rawText: string
  mood: number | null   // index into MOOD_LEVELS; null = not rated
  savedAt: number
}

export const PREFIX = 'day_'

export function dateToKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return dateToKey(new Date())
}

/** Shift a YYYY-MM-DD key by whole days. */
export function offsetDate(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return dateToKey(date)
}

export function loadDay(date: string): DayData | null {
  const item = localStorage.getItem(PREFIX + date)
  if (!item) return null
  try {
    const parsed = JSON.parse(item) as Partial<DayData>
    return {
      date,
      rawText: parsed.rawText ?? '',
      mood: typeof parsed.mood === 'number' ? parsed.mood : null,
      savedAt: parsed.savedAt ?? 0,
    }
  } catch {
    // Corrupt entry (failed import, manual edit, truncated write) — skip it
    // rather than crashing every aggregation that scans all days.
    return null
  }
}

/** A day with no text and no mood is deleted rather than stored empty. */
function write(day: DayData): void {
  if (day.rawText.trim() === '' && day.mood === null) {
    localStorage.removeItem(PREFIX + day.date)
    return
  }
  localStorage.setItem(PREFIX + day.date, JSON.stringify(day))
}

export function saveDayText(date: string, rawText: string): void {
  const existing = loadDay(date)
  write({ date, rawText, mood: existing?.mood ?? null, savedAt: Date.now() })
}

export function saveDayMood(date: string, mood: number | null): void {
  const existing = loadDay(date)
  write({ date, rawText: existing?.rawText ?? '', mood, savedAt: Date.now() })
}

export function deleteDay(date: string): void {
  localStorage.removeItem(PREFIX + date)
}

export function getAllDayKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length))
  }
  return keys.sort()
}

/** Every stored day, newest first. */
export function getAllDays(): DayData[] {
  const out: DayData[] = []
  for (const key of getAllDayKeys()) {
    const day = loadDay(key)
    if (day) out.push(day)
  }
  return out.reverse()
}

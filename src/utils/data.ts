import { PREFIX, getAllDays, deleteDay, type DayData } from './storage'
import { buildTagCatalog, MIN_MOOD_DAYS } from './tags'
import { MOOD_LEVELS, MOOD_MAX, moodLabel } from './mood'

export const EXPORT_APP = 'note-it-out'
/** 1 = the 5-step mood scale; 2 = the 7-step scale. See applyImport. */
export const EXPORT_VERSION = 2

export interface ExportFile {
  app: string
  version: number
  exportedAt: string
  days: DayData[]
}

export interface DataStats {
  bytes: number
  days: number
  ratedDays: number
  lines: number
  tags: number
}

export function getStats(): DataStats {
  const days = getAllDays()
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    // UTF-16 in practice, but the useful number here is "how much of my quota",
    // and quotas are counted in these units by every browser that reports one.
    bytes += key.length + (localStorage.getItem(key)?.length ?? 0)
  }
  const lines = days.reduce(
    (n, d) => n + d.rawText.split('\n').filter(l => l.trim() !== '').length,
    0,
  )
  return {
    bytes: bytes * 2,
    days: days.length,
    ratedDays: days.filter(d => d.mood !== null).length,
    lines,
    tags: buildTagCatalog(days).length,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function buildExport(): ExportFile {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    days: getAllDays(),
  }
}

/** Human- and LLM-readable report of everything logged. */
export function buildMarkdown(): string {
  const days = getAllDays()          // newest first
  const catalog = buildTagCatalog(days).sort((a, b) => b.days - a.days)
  const rated = days.filter(d => d.mood !== null)
  const avg = rated.length > 0
    ? rated.reduce((n, d) => n + (d.mood ?? 0), 0) / rated.length
    : null

  const out: string[] = []
  out.push('# note-it-out export')
  out.push('')
  out.push(`Exported ${new Date().toLocaleDateString('en-CA')}. ${days.length} days logged, ${rated.length} rated.`)
  if (avg !== null) {
    out.push(`Average mood ${avg.toFixed(2)} of ${MOOD_LEVELS.length - 1} (${moodLabel(Math.round(avg))}).`)
  }
  out.push('')
  out.push(`Mood scale: ${MOOD_LEVELS.map(l => `${l.value} = ${l.label}`).join(', ')}.`)
  out.push('')

  if (catalog.length > 0) {
    out.push('## Tags')
    out.push('')
    out.push('| Tag | Days | Avg mood | vs. untagged days |')
    out.push('| --- | ---: | ---: | ---: |')
    for (const t of catalog) {
      const avgCell = t.moodAvg !== null ? t.moodAvg.toFixed(2) : '—'
      const deltaCell = t.delta !== null
        ? `${t.delta >= 0 ? '+' : ''}${t.delta.toFixed(2)}`
        : `— (needs ${MIN_MOOD_DAYS})`
      out.push(`| #${t.display} | ${t.days} | ${avgCell} | ${deltaCell} |`)
    }
    out.push('')
  }

  out.push('## Days')
  out.push('')
  for (const day of days) {
    const mood = day.mood !== null ? ` — ${moodLabel(day.mood)} (${day.mood})` : ''
    out.push(`### ${day.date}${mood}`)
    out.push('')
    const body = day.rawText.trim()
    out.push(body === '' ? '_(mood only, no note)_' : body)
    out.push('')
  }

  return out.join('\n')
}

export function download(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next frame — revoking synchronously can cancel the download
  // in some browsers before it has read the blob.
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

export function exportFilename(ext: string): string {
  return `note-it-out-${new Date().toLocaleDateString('en-CA')}.${ext}`
}

/** Throws with a readable message if the file isn't a note-it-out export. */
export function parseImport(text: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  const file = data as Partial<ExportFile>
  if (file.app !== EXPORT_APP) {
    throw new Error("That file isn't a note-it-out export.")
  }
  if (!Array.isArray(file.days)) {
    throw new Error('That export has no days in it.')
  }
  for (const day of file.days) {
    if (typeof day?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      throw new Error('That export contains a day with a bad date.')
    }
  }
  return {
    app: EXPORT_APP,
    // No version field at all predates versioning, so it's the oldest format.
    version: file.version ?? 1,
    exportedAt: file.exportedAt ?? '',
    days: file.days,
  }
}

/**
 * Writes imported days over any existing record for the same date.
 *
 * A version-1 file was written on the 5-step scale, whose steps are the middle
 * five of the current seven — so its moods shift up by one, the same move
 * migrateMoodScale makes to local days.
 */
export function applyImport(file: ExportFile): number {
  let written = 0
  const shift = file.version < 2 ? 1 : 0
  for (const day of file.days) {
    const record: DayData = {
      date: day.date,
      rawText: typeof day.rawText === 'string' ? day.rawText : '',
      mood: typeof day.mood === 'number' ? Math.min(MOOD_MAX, day.mood + shift) : null,
      savedAt: typeof day.savedAt === 'number' ? day.savedAt : Date.now(),
    }
    if (record.rawText.trim() === '' && record.mood === null) continue
    localStorage.setItem(PREFIX + record.date, JSON.stringify(record))
    written++
  }
  return written
}

/** Removes every logged day. Settings (theme, sheet height) are left alone. */
export function clearAllDays(): void {
  for (const day of getAllDays()) deleteDay(day.date)
}

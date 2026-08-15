// Geometry of the heatmap's paged 21-week windows. Set 0 is the today-anchored
// window; each further set is the 21 weeks before the previous one.

export const WEEKS = 21
const DAY_MS = 86_400_000

/** First (Sunday) column of the today-anchored window, at local midnight. */
export function windowStart(weekOffset = 0): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - (WEEKS - 1) * 7 - today.getDay() - weekOffset * 7)
  return start
}

/**
 * Which paged window (as a weekOffset, a multiple of WEEKS) contains `dateStr`.
 * Returns 0 for today / recent dates and for null.
 */
export function weekOffsetForDate(dateStr: string | null): number {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  const dateWeekStart = new Date(date)
  dateWeekStart.setDate(date.getDate() - date.getDay())

  const weeksBefore = Math.round((windowStart().getTime() - dateWeekStart.getTime()) / (7 * DAY_MS))
  if (weeksBefore <= 0) return 0
  return (Math.floor((weeksBefore - 1) / WEEKS) + 1) * WEEKS
}

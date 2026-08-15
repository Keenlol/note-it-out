import { todayKey, offsetDate } from './storage'

function toDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Today", "Yesterday", or e.g. "Sat, 15 Aug". Adds the year for other years. */
export function formatDisplayDate(key: string): string {
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === offsetDate(today, -1)) return 'Yesterday'

  const date = toDate(key)
  const sameYear = date.getFullYear() === toDate(today).getFullYear()
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Compact form for dense lists: "15 Aug" / "15 Aug 25". */
export function formatShortDate(key: string): string {
  const date = toDate(key)
  const sameYear = date.getFullYear() === toDate(todayKey()).getFullYear()
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: '2-digit' }),
  })
}

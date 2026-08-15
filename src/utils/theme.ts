// Theme resolution. Light-first: this is an app you use sitting down at the end
// of a day, not standing in a dim gym, so warm paper is the default.
//
// 'auto' switches on clock time rather than the OS setting — the point is that
// the app knows what time it is, which the OS scheme doesn't tell us.

export type ThemePref = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

/** Dark from 19:00 up to (not including) 06:00. */
export const DARK_FROM_HOUR = 19
export const DARK_UNTIL_HOUR = 6

// Must match --bg in index.css for each theme, or the browser chrome and the
// PWA splash will disagree with the page.
const CHROME_COLOR: Record<ResolvedTheme, string> = {
  light: '#faf7f2',
  dark: '#14120f',
}

export function resolveTheme(pref: ThemePref, now: Date = new Date()): ResolvedTheme {
  if (pref !== 'auto') return pref
  const h = now.getHours()
  return h >= DARK_FROM_HOUR || h < DARK_UNTIL_HOUR ? 'dark' : 'light'
}

export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved

  // index.html ships two media-scoped <meta name="theme-color"> tags so the very
  // first paint is right before JS runs. Once we have an explicit choice those
  // would win for the wrong scheme (the first *matching* tag wins), so replace
  // the whole set with a single unconditional tag.
  for (const el of document.querySelectorAll('meta[name="theme-color"]')) el.remove()
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = CHROME_COLOR[resolved]
  document.head.appendChild(meta)
}

/** ms until the next auto light/dark flip, for scheduling a re-resolve. */
export function msUntilNextFlip(now: Date = new Date()): number {
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  const h = now.getHours()
  const targetHour = h >= DARK_FROM_HOUR ? 24 + DARK_UNTIL_HOUR
    : h < DARK_UNTIL_HOUR ? DARK_UNTIL_HOUR
    : DARK_FROM_HOUR
  next.setHours(targetHour)
  return Math.max(60_000, next.getTime() - now.getTime())
}

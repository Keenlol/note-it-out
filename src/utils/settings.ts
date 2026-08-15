import type { ThemePref } from './theme'

const THEME_KEY = 'setting_theme'
const SHEET_HEIGHT_KEY = 'setting_sheet_height'

export function getSavedTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'light'
}

export function saveTheme(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref)
}

export function getSavedSheetHeight(): number | undefined {
  const v = localStorage.getItem(SHEET_HEIGHT_KEY)
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function saveSheetHeight(px: number): void {
  localStorage.setItem(SHEET_HEIGHT_KEY, String(Math.round(px)))
}

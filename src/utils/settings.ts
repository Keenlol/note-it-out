import type { ThemePref } from './theme'

const THEME_KEY = 'setting_theme'

export function getSavedTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'light'
}

export function saveTheme(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref)
}

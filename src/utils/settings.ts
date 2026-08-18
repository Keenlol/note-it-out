import type { ThemePref } from './theme'

const THEME_KEY = 'setting_theme'
const HAPTICS_KEY = 'setting_haptics'

export function getSavedTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'light'
}

export function saveTheme(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref)
}

/** Haptic detents on the mood slider. On by default — the detent is part of
 *  how the slider is meant to feel, and it no-ops on hardware without a motor
 *  anyway. Only an explicit 'off' turns it off. */
export function getSavedHaptics(): boolean {
  return localStorage.getItem(HAPTICS_KEY) !== 'off'
}

export function saveHaptics(on: boolean): void {
  localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off')
}

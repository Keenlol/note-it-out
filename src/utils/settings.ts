import type { ThemePref } from './theme'
import type { FeedbackPref } from './feedback'

const THEME_KEY = 'setting_theme'
const FEEDBACK_KEY = 'setting_feedback'
const HAPTICS_KEY = 'setting_haptics'   // the older on/off switch, read once below

export function getSavedTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'light'
}

export function saveTheme(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref)
}

/** How the mood slider marks a band crossing. Vibrate by default — the detent
 *  is part of how the slider is meant to feel, and it no-ops on hardware
 *  without a motor. Falls back to whatever the older haptics switch said, so an
 *  install that had turned it off stays off. */
export function getSavedFeedback(): FeedbackPref {
  const v = localStorage.getItem(FEEDBACK_KEY)
  if (v === 'vibrate' || v === 'click' || v === 'off') return v
  return localStorage.getItem(HAPTICS_KEY) === 'off' ? 'off' : 'vibrate'
}

export function saveFeedback(pref: FeedbackPref): void {
  localStorage.setItem(FEEDBACK_KEY, pref)
}

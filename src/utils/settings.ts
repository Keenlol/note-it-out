import type { ThemePref } from './theme'
import type { FeedbackPref } from './feedback'
import type { LockGrace } from './lock'

const THEME_KEY = 'setting_theme'
const FEEDBACK_KEY = 'setting_feedback'
const HAPTICS_KEY = 'setting_haptics'   // the older on/off switch, read once below
const LOCK_GRACE_KEY = 'setting_lock_grace'

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

/** How long the app may sit in the background before it locks again. Read
 *  at the moment it matters (see LockGate), never cached. */
export function getSavedLockGrace(): LockGrace {
  const v = localStorage.getItem(LOCK_GRACE_KEY)
  return v === 'now' || v === '1m' || v === '5m' ? v : '1m'
}

export function saveLockGrace(pref: LockGrace): void {
  localStorage.setItem(LOCK_GRACE_KEY, pref)
}

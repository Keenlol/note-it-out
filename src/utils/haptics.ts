/**
 * The one haptic in the app: the detent the mood slider gives when the thumb
 * crosses into the next colour. There is deliberately no vocabulary of pulses —
 * one event is worth feeling, and a phone that buzzes at everything is a phone
 * you turn off.
 */

/** The pulse, in ms. Short enough to read as a click rather than a buzz, but
 *  not so short that the motor rounds it away — under roughly 10ms many Android
 *  devices never spin up far enough to be felt at all. */
export const DETENT_MS = 12

/** False where the browser has no vibrate at all (iOS). Settings hides the
 *  toggle on those, since a control that provably cannot do anything is worse
 *  than no control. */
export const CAN_VIBRATE = typeof navigator !== 'undefined' && 'vibrate' in navigator

/** One detent, if haptics are on. No-ops on hardware without a motor. */
export function detent(enabled: boolean): void {
  if (enabled) navigator.vibrate?.(DETENT_MS)
}

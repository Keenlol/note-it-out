/**
 * The one piece of feedback in the app: the detent the mood slider gives when
 * the thumb crosses into the next colour. There is deliberately no vocabulary
 * of pulses and beeps — one event is worth marking, and a device that reacts to
 * everything is one you switch off.
 *
 * Two ways to deliver it, and the choice is the user's rather than sniffed.
 * Feature detection can't make it: `navigator.vibrate` exists in desktop Chrome
 * and Firefox and quietly does nothing there, and there is no macOS API at all
 * that lets a web page drive the trackpad's haptic engine. The person holding
 * the device knows what it is; settings asks them.
 */

export type FeedbackPref = 'vibrate' | 'click' | 'off'

/** ms. Long enough that a modern LRA actuator spins up — under ~15ms many
 *  Android phones deliver a pulse you cannot feel — short enough to stay a
 *  click rather than a buzz. */
const DETENT_MS = 20

let ctx: AudioContext | null = null

/** A wooden tick. Not a UI beep: full attack, gone in 18ms, quiet enough to sit
 *  under a fingertip rather than announce itself. */
function click(): void {
  try {
    // Built on the first detent, which always happens inside a pointer event —
    // an AudioContext constructed outside a gesture starts suspended.
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1180, t)
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.02)
  } catch {
    /* no audio output, or the context was refused — silence is an acceptable
       outcome for a detent, and never worth an error. */
  }
}

/** One detent, in whichever language the user picked. */
export function detent(pref: FeedbackPref): void {
  if (pref === 'vibrate') navigator.vibrate?.(DETENT_MS)
  else if (pref === 'click') click()
}

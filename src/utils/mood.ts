// The mood scale. One axis, bad → good, five discrete steps.
//
// Five (not a continuous slider) because the palette caps the useful
// resolution: past ~7 shades, two cells in the heatmap are indistinguishable,
// so a finer scale would record a precision you can't see or reproduce.
//
// Labels are deliberately physical/plain rather than evaluative or clinical —
// they describe a state, they don't grade a day. They surface only while the
// thumb is down; the colour is the permanent readout.

export interface MoodLevel {
  value: number
  label: string
}

export const MOOD_LEVELS: MoodLevel[] = [
  { value: 0, label: 'rough' },
  { value: 1, label: 'low' },
  { value: 2, label: 'okay' },
  { value: 3, label: 'good' },
  { value: 4, label: 'great' },
]

export const MOOD_COUNT = MOOD_LEVELS.length
export const MOOD_MAX = MOOD_COUNT - 1
export const MOOD_NEUTRAL = Math.floor(MOOD_MAX / 2)

export function moodLabel(value: number | null): string {
  if (value === null) return ''
  return MOOD_LEVELS[clampMood(value)]?.label ?? ''
}

export function clampMood(value: number): number {
  return Math.max(0, Math.min(MOOD_MAX, Math.round(value)))
}

/** CSS colour for a mood step — resolves against the active theme. */
export function moodColor(value: number): string {
  return `var(--mood-${clampMood(value)})`
}

/**
 * Colour for a fractional mood (e.g. an average). Blends the two neighbouring
 * steps in the ramp via colour-mix so averages read as points on the same scale.
 */
export function moodColorMix(value: number): string {
  const v = Math.max(0, Math.min(MOOD_MAX, value))
  const lo = Math.floor(v)
  const hi = Math.min(MOOD_MAX, lo + 1)
  if (lo === hi) return `var(--mood-${lo})`
  const pct = Math.round((v - lo) * 100)
  return `color-mix(in oklab, var(--mood-${hi}) ${pct}%, var(--mood-${lo}))`
}

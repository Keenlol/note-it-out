// The mood scale. One axis, bad → good, seven discrete steps.
//
// Seven (not a continuous slider) because the palette caps the useful
// resolution: past ~7 shades, two cells in the heatmap are indistinguishable,
// so a finer scale would record a precision you can't see or reproduce. This is
// the ceiling — don't add an eighth.
//
// It was five until the ends were extended outward: `bleak` and `bright` widen
// the range without disturbing the five in the middle, so a day that used to
// read `great` still reads `great` (see migrateMoodScale in storage.ts). The
// neutral step stays dead centre, which is the point of an odd-length scale.
//
// Labels are deliberately physical/plain rather than evaluative or clinical —
// they describe a state, they don't grade a day. They surface only while the
// thumb is down; the colour is the permanent readout.

export interface MoodLevel {
  value: number
  label: string
}

export const MOOD_LEVELS: MoodLevel[] = [
  { value: 0, label: 'bleak' },
  { value: 1, label: 'rough' },
  { value: 2, label: 'low' },
  { value: 3, label: 'okay' },
  { value: 4, label: 'good' },
  { value: 5, label: 'great' },
  { value: 6, label: 'bright' },
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

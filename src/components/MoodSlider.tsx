import { useEffect, useRef, useState } from 'react'
import {
  MOOD_COUNT, MOOD_LEVELS, MOOD_MAX, clampMood, moodColor, moodColorMix, moodLabel,
} from '../utils/mood'
import { detent, type FeedbackPref } from '../utils/feedback'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  /** How to mark each band edge — a buzz, a click, or nothing. A settings
   *  choice, not a capability check; see utils/feedback.ts. */
  feedback?: FeedbackPref
  /** Fires on the finger going down and coming up again. `onChange` already
   *  reports the value per band edge; this reports whether the gesture is
   *  still in progress, for anything downstream that shouldn't redraw until
   *  it ends — the day's quote holds still on it rather than flashing every
   *  pool it crosses on the way past. */
  onDraggingChange?: (dragging: boolean) => void
}

// How long the label lingers after you let go.
const LABEL_LINGER_MS = 900

/** How close the thumb may get to either end of the track while dragging.
 *  Past that the finger keeps going and the thumb stops, the way a physical
 *  slider hits its travel limit. */
const THUMB_STOP = 13

/** How far past either end of the track (px) the finger has to pull — beyond
 *  the thumb's own travel limit — before releasing clears the mood. Pointer
 *  capture keeps delivering clientY out there, past the element's own box, so
 *  this reads as pulling the thumb clean off the rail rather than a tap near
 *  an edge band. */
const CLEAR_DISTANCE = 56

/**
 * The day's mood, as one discrete vertical rail down the right edge.
 *
 * Vertical because the app is used one-handed on a phone: the rail sits under
 * the thumb, and warm-at-the-top / cool-at-the-bottom is the same reading a
 * thermometer gives you. It is *not* a ranking — see the ramp note in index.css.
 *
 * Two things move at different rates, and that is the whole feel of it: the
 * *value* quantises the instant you cross a band (label + haptic detent), while
 * the *thumb* tracks the finger continuously and only springs onto the grid when
 * you let go. Snapping the pixels mid-drag would break the illusion that you are
 * holding an object.
 *
 * The label is deliberately transient — the colour is the permanent readout, and
 * a permanently visible grade would make the day feel scored.
 *
 * It does *not* fade out and back when you swipe to another day, the way the
 * note does. The note's text is replaced, so a crossfade is honest there; the
 * rail is the same seven bands either side of the swipe, and blinking it out
 * made the right edge flicker on every page turn. The thumb carries the change
 * instead — it springs to the new day's band and cross-fades its colour.
 */
export function MoodSlider({ value, onChange, feedback = 'vibrate', onDraggingChange }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastIndex = useRef<number | null>(null)
  const armed = useRef(false)
  const linger = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [labelVisible, setLabelVisible] = useState(false)
  // Live thumb position as a % from the top; null whenever the finger is up.
  const [dragPct, setDragPct] = useState<number | null>(null)
  // Mirrors `armed` for render — true once the drag has passed CLEAR_DISTANCE
  // past either end of the track.
  const [clearArmed, setClearArmed] = useState(false)

  useEffect(() => () => clearTimeout(linger.current), [])

  /** Reads the pointer as a band (the value), a position (the thumb), and how
   *  far past either end of the track it's travelled (0 while inside it). */
  function readPointer(clientY: number): { band: number; pct: number; overshoot: number } | null {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0) return null
    const fromTop = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    // Top of the rail is the warm end, so the band index counts from the bottom.
    const band = Math.max(0, Math.min(MOOD_MAX, Math.floor((1 - fromTop) * MOOD_COUNT)))
    const stop = (THUMB_STOP / rect.height) * 100
    const pct = Math.max(stop, Math.min(100 - stop, fromTop * 100))
    const overshoot = clientY < rect.top ? rect.top - clientY
      : clientY > rect.bottom ? clientY - rect.bottom
      : 0
    return { band, pct, overshoot }
  }

  function commit(index: number) {
    if (lastIndex.current !== index) {
      lastIndex.current = index
      // A detent every time the thumb crosses into the next colour — the value
      // quantises there, so that is where the hand should be told.
      detent(feedback)
    }
    onChange(index)
  }

  function showLabel() {
    clearTimeout(linger.current)
    setLabelVisible(true)
  }

  function hideLabelSoon() {
    clearTimeout(linger.current)
    linger.current = setTimeout(() => setLabelVisible(false), LABEL_LINGER_MS)
  }

  function track(clientY: number) {
    const at = readPointer(clientY)
    if (!at) return
    const isArmed = at.overshoot > CLEAR_DISTANCE
    if (isArmed !== armed.current) {
      armed.current = isArmed
      setClearArmed(isArmed)
      // Arming (or backing off) the clear gesture is a threshold crossing
      // just like a band edge — same single feedback event, no second kind.
      detent(feedback)
    }
    setDragPct(at.pct)
    // Once armed the band is about to be thrown away; stop moving it so the
    // last real value stays put underneath the "clear" label.
    if (!isArmed) commit(at.band)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    onDraggingChange?.(true)
    lastIndex.current = value
    armed.current = false
    setClearArmed(false)
    e.currentTarget.setPointerCapture(e.pointerId)
    showLabel()
    track(e.clientY)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    track(e.clientY)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = false
    onDraggingChange?.(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
    if (armed.current) onChange(null)
    armed.current = false
    setClearArmed(false)
    setDragPct(null)          // hands the thumb back to the spring
    hideLabelSoon()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clampMood((value ?? -1) + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clampMood((value ?? MOOD_MAX + 1) - 1)
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      onChange(null)
      return
    }
    if (next === null) return
    e.preventDefault()
    onChange(next)
    showLabel()
    hideLabelSoon()
  }

  const isSet = value !== null
  const isDragging = dragPct !== null

  // The thumb outlives the value it shows: it stays mounted on a day with no
  // mood and only fades (CSS). So while it's invisible it holds the last band
  // it stood on rather than snapping to 0 — otherwise clearing a mood, or
  // swiping onto a blank day, would slide it to the cold end and flip it blue
  // on the way out.
  const lastSet = useRef(0)
  if (value !== null) lastSet.current = value
  const shown = value ?? lastSet.current

  // At rest the thumb sits on the *middle* of its band, not at the end of the
  // track: a step is a stretch of the ramp, so its centre is where it belongs.
  const restPct = (1 - (shown + 0.5) / MOOD_COUNT) * 100
  const pct = dragPct ?? restPct

  // Mid-drag the thumb carries the blended colour of where it actually is, so
  // it reads as a point sliding along the ramp rather than a chip that flips.
  const thumbColor = isDragging
    ? moodColorMix(Math.max(0, Math.min(MOOD_MAX, (1 - pct / 100) * MOOD_COUNT - 0.5)))
    : moodColor(shown)

  return (
    <div
      className="mood-column"
      // The page swipes to change day; a drag on the rail is never that.
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      <div
        className={`mood-slider${isSet ? ' set' : ''}${isDragging ? ' dragging' : ''}${clearArmed ? ' clearing' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Mood for this day"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={MOOD_MAX}
        aria-valuenow={value ?? undefined}
        aria-valuetext={clearArmed ? 'release to clear' : isSet ? moodLabel(value) : 'not set'}
      >
        {/* Warm end at the top, so the array runs backwards down the track. */}
        <div className="mood-track" aria-hidden="true">
          {[...MOOD_LEVELS].reverse().map(l => (
            <span key={l.value} className="mood-step" style={{ background: moodColor(l.value) }} />
          ))}
        </div>

        <div className="mood-rail" ref={railRef} aria-hidden="true">
          <div className="mood-thumb" style={{ top: `${pct}%`, background: thumbColor }} />
          <div
            className={`mood-label${labelVisible && (isSet || clearArmed) ? ' visible' : ''}`}
            style={{ top: `${pct}%` }}
          >
            {clearArmed ? 'clear' : moodLabel(value)}
          </div>
        </div>
      </div>
    </div>
  )
}

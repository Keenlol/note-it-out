import { useEffect, useRef, useState } from 'react'
import {
  MOOD_COUNT, MOOD_LEVELS, MOOD_MAX, clampMood, moodColor, moodColorMix, moodLabel,
} from '../utils/mood'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  /** Opacity for the day-change fade. The mood belongs to the day it labels. */
  fade?: number
}

// How long the label lingers after you let go.
const LABEL_LINGER_MS = 900

/** How close the thumb may get to either end of the track while dragging.
 *  Past that the finger keeps going and the thumb stops, the way a physical
 *  slider hits its travel limit. */
const THUMB_STOP = 13

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
 */
export function MoodSlider({ value, onChange, fade = 1 }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastIndex = useRef<number | null>(null)
  const linger = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [labelVisible, setLabelVisible] = useState(false)
  // Live thumb position as a % from the top; null whenever the finger is up.
  const [dragPct, setDragPct] = useState<number | null>(null)

  useEffect(() => () => clearTimeout(linger.current), [])

  /** Reads the pointer as both a band (the value) and a position (the thumb). */
  function readPointer(clientY: number): { band: number; pct: number } | null {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0) return null
    const fromTop = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    // Top of the rail is the warm end, so the band index counts from the bottom.
    const band = Math.max(0, Math.min(MOOD_MAX, Math.floor((1 - fromTop) * MOOD_COUNT)))
    const stop = (THUMB_STOP / rect.height) * 100
    return { band, pct: Math.max(stop, Math.min(100 - stop, fromTop * 100)) }
  }

  function commit(index: number) {
    if (lastIndex.current !== index) {
      lastIndex.current = index
      // Discrete steps deserve a detent. No-op where unsupported (iOS).
      navigator.vibrate?.(8)
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
    setDragPct(at.pct)
    commit(at.band)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    lastIndex.current = value
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
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
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

  // At rest the thumb sits on the *middle* of its band, not at the end of the
  // track: a step is a stretch of the ramp, so its centre is where it belongs.
  const restPct = isSet ? (1 - (value + 0.5) / MOOD_COUNT) * 100 : 50
  const pct = dragPct ?? restPct

  // Mid-drag the thumb carries the blended colour of where it actually is, so
  // it reads as a point sliding along the ramp rather than a chip that flips.
  const thumbColor = isDragging
    ? moodColorMix(Math.max(0, Math.min(MOOD_MAX, (1 - pct / 100) * MOOD_COUNT - 0.5)))
    : moodColor(value ?? 0)

  return (
    <div
      className="mood-column"
      style={{ opacity: fade }}
      // The page swipes to change day; a drag on the rail is never that.
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      <div
        className={`mood-slider${isSet ? ' set' : ''}${isDragging ? ' dragging' : ''}`}
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
        aria-valuetext={isSet ? moodLabel(value) : 'not set'}
      >
        {/* Warm end at the top, so the array runs backwards down the track. */}
        <div className="mood-track" aria-hidden="true">
          {[...MOOD_LEVELS].reverse().map(l => (
            <span key={l.value} className="mood-step" style={{ background: moodColor(l.value) }} />
          ))}
        </div>

        <div className="mood-rail" ref={railRef} aria-hidden="true">
          {isSet && (
            <div className="mood-thumb" style={{ top: `${pct}%`, background: thumbColor }} />
          )}
          <div
            className={`mood-label${labelVisible && isSet ? ' visible' : ''}`}
            style={{ top: `${pct}%` }}
          >
            {moodLabel(value)}
          </div>
        </div>
      </div>
    </div>
  )
}

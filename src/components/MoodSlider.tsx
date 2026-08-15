import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { MOOD_LEVELS, MOOD_MAX, clampMood, moodColor, moodLabel } from '../utils/mood'
import { tap } from '../utils/tap'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
}

// How long the label lingers after you let go.
const LABEL_LINGER_MS = 900

/**
 * The day's mood, as one discrete slider.
 *
 * The label is deliberately transient — it appears under your thumb while you
 * drag and fades on release. You navigate by finding the word that fits, not by
 * reasoning about a number; afterwards the colour is the readout.
 */
export function MoodSlider({ value, onChange }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastIndex = useRef<number | null>(null)
  const linger = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [labelVisible, setLabelVisible] = useState(false)

  useEffect(() => () => clearTimeout(linger.current), [])

  function indexFromClientX(clientX: number): number {
    const rail = railRef.current
    if (!rail) return 0
    const rect = rail.getBoundingClientRect()
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    return clampMood(Math.max(0, Math.min(1, ratio)) * MOOD_MAX)
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

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    lastIndex.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
    showLabel()
    commit(indexFromClientX(e.clientX))
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    commit(indexFromClientX(e.clientX))
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
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

  const pct = value === null ? 50 : (value / MOOD_MAX) * 100
  const isSet = value !== null

  return (
    <div className="mood-row">
      <div
        className={`mood-slider${isSet ? ' set' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Mood for this day"
        aria-valuemin={0}
        aria-valuemax={MOOD_MAX}
        aria-valuenow={value ?? undefined}
        aria-valuetext={isSet ? moodLabel(value) : 'not set'}
      >
        <div className="mood-track" aria-hidden="true">
          {MOOD_LEVELS.map(l => (
            <span key={l.value} className="mood-step" style={{ background: moodColor(l.value) }} />
          ))}
        </div>

        <div className="mood-rail" ref={railRef} aria-hidden="true">
          {isSet && (
            <div
              className="mood-thumb"
              style={{ left: `${pct}%`, background: moodColor(value) }}
            />
          )}
          <div
            className={`mood-label${labelVisible && isSet ? ' visible' : ''}`}
            style={{ left: `${pct}%` }}
          >
            {moodLabel(value)}
          </div>
        </div>

        {!isSet && <span className="mood-hint">slide to set how the day felt</span>}
      </div>

      <button
        className={`mood-clear${isSet ? ' visible' : ''}`}
        onPointerDown={tap}
        onClick={() => onChange(null)}
        aria-label="Clear mood"
        tabIndex={isSet ? 0 : -1}
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </div>
  )
}

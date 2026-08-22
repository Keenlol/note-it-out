import { useLayoutEffect, useRef, useState } from 'react'
import { tap } from '../utils/tap'

export interface SegOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Segments hug their labels — equal thirds would give "Most" the same room as
 * "Recent" and read as a grid rather than as words. That means the pill can't
 * be derived from the option count, so it is measured off the active button and
 * driven in pixels. Nothing moves until the first measurement lands.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const activeIndex = options.findIndex(o => o.value === value)
  const ref = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const btn = el.querySelectorAll('button')[activeIndex]
      if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth })
    }
    measure()
    // The control lives in a panel that resizes with the viewport; re-measure
    // rather than trust the width it happened to mount at.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeIndex, options])

  return (
    <div className="seg-control" ref={ref}>
      {/* Sliding indicator — measured, so it fits the word it's under */}
      <div
        className={`seg-indicator${pill ? '' : ' unmeasured'}`}
        style={pill ? { transform: `translateX(${pill.x}px)`, width: pill.w } : undefined}
        aria-hidden="true"
      />
      {options.map(opt => (
        <button
          key={opt.value}
          className={`seg-btn${value === opt.value ? ' active' : ''}`}
          onPointerDown={tap}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

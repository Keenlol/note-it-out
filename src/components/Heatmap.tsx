import { useMemo } from 'react'
import { dateToKey, getAllDays, todayKey } from '../utils/storage'
import { moodColor } from '../utils/mood'
import { tap } from '../utils/tap'
import { WEEKS, windowStart } from '../utils/window'

interface Cell {
  date: string | null   // null = future
  mood: number | null
  hasText: boolean
  isToday: boolean
}

interface Props {
  onDayClick: (date: string) => void
  selectedDate: string | null
  dataVersion: number    // increments on every save, forcing the memo to re-run
  weekOffset?: number    // shift the window this many weeks into the past
  /**
   * The day currently being edited, applied over the memoized grid at render
   * time. Dragging the mood slider repaints its cell immediately without
   * re-reading (and re-parsing) every stored day on each step.
   */
  liveDay?: { date: string; mood: number | null; hasText: boolean }
  /**
   * When set, only these days are drawn — every other day renders exactly as an
   * untouched one. Applied at render time, next to `liveDay` and for the same
   * reason: expanding a tag must not re-read and re-parse every stored day.
   */
  filterDates?: Set<string> | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A month label is ~3 columns wide, so two labels closer than this overlap.
// The window can start mid-month, which puts the first label right next to the
// following month's — drop the crowded one rather than let them collide.
const MIN_LABEL_GAP_COLS = 3

/**
 * Three cell states, and they must stay distinguishable:
 *   mood set      → the temperature colour
 *   note, no mood → a faint fill (something happened here)
 *   nothing       → the page, showing through the ruling
 * A blank day is genuinely blank, not a failure — so "empty" reads as absence,
 * never as the low end of the scale. Every cell paints an opaque background:
 * the grid's own colour is the rule between them, and a transparent cell would
 * let that flood the square.
 */
function cellStyle(cell: Cell): React.CSSProperties {
  if (cell.date === null) return { background: 'var(--bg)' }
  if (cell.mood !== null) return { background: moodColor(cell.mood) }
  if (cell.hasText) return { background: 'var(--cell-noted)' }
  return { background: 'var(--bg)' }
}

export function Heatmap({
  onDayClick, selectedDate, dataVersion, weekOffset = 0, liveDay, filterDates,
}: Props) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = todayKey()

    const byDate = new Map(getAllDays().map(d => [d.date, d]))
    const start = windowStart(weekOffset)

    const cols: Cell[][] = []
    const labels: { col: number; label: string }[] = []
    let lastMonth = -1

    for (let w = 0; w < WEEKS; w++) {
      const col: Cell[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        const dateStr = dateToKey(date)
        const isFuture = date > today

        const isFirstOfMonth = date.getDate() === 1
        const isFirstWeek = w === 0 && d === 0
        if (!isFuture && (isFirstOfMonth || isFirstWeek) && date.getMonth() !== lastMonth) {
          const prev = labels[labels.length - 1]
          if (!prev || w - prev.col >= MIN_LABEL_GAP_COLS) {
            // Append a 2-digit year for past years so older windows read "Jan 25".
            const label = date.getFullYear() === today.getFullYear()
              ? MONTHS[date.getMonth()]
              : `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
            labels.push({ col: w, label })
          }
          lastMonth = date.getMonth()
        }

        const day = isFuture ? undefined : byDate.get(dateStr)
        col.push({
          date: isFuture ? null : dateStr,
          mood: day?.mood ?? null,
          hasText: (day?.rawText.trim() ?? '') !== '',
          isToday: dateStr === todayStr,
        })
      }
      cols.push(col)
    }

    return { weeks: cols, monthLabels: labels }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, weekOffset])

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-grid">
        {weeks.map((col, w) => (
          <div key={w} className="heatmap-col">
            {col.map((raw, d) => {
              const live = liveDay && raw.date === liveDay.date
                ? { ...raw, mood: liveDay.mood, hasText: liveDay.hasText }
                : raw
              // Filtered out: keep the cell, drop everything it had to say.
              const cell = filterDates && live.date !== null && !filterDates.has(live.date)
                ? { ...live, mood: null, hasText: false }
                : live
              // Only an explicit selection — a past day. Today is never it:
              // selectedDate is null whenever you're on today, and today's own
              // shape already says where you are.
              const selected = cell.date !== null && cell.date === selectedDate
              return (
                <div
                  key={d}
                  onPointerDown={tap}
                  className={
                    'heatmap-cell'
                    + (selected ? ' selected' : '')
                    + (cell.isToday ? ' today' : '')
                    + (cell.date === null ? ' future' : '')
                  }
                  style={cellStyle(cell)}
                  onClick={() => { if (cell.date) onDayClick(cell.date) }}
                  title={cell.date ?? undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-months">
        {monthLabels.map(({ col, label }) => (
          <span key={`${col}-${label}`} style={{ gridColumn: col + 1 }} className="month-label">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

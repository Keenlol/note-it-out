import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SheetClose } from './SheetClose'
import { SegmentedControl, type SegOption } from './SegmentedControl'
import { getAllDays } from '../utils/storage'
import { buildTagCatalog, getTagDays, type TagStat } from '../utils/tags'
import { moodColorMix, MOOD_MAX } from '../utils/mood'
import { formatShortDate } from '../utils/format'
import { tap } from '../utils/tap'

type Sort = 'most' | 'recent' | 'mood'

const SORTS: SegOption<Sort>[] = [
  { value: 'most', label: 'Most' },
  { value: 'recent', label: 'Recent' },
  { value: 'mood', label: 'Mood' },
]

interface Props {
  open: boolean
  onClose: () => void
  dataVersion: number
  onDayClick: (date: string) => void
  /** The days an expanded tag covers, for the heatmap to filter down to.
   *  null whenever nothing is expanded (or the sheet is shut). */
  onFilterDays: (dates: string[] | null) => void
}

function sortTags(tags: TagStat[], sort: Sort): TagStat[] {
  const out = [...tags]
  switch (sort) {
    case 'most':
      out.sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
      break
    case 'recent':
      out.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name))
      break
    case 'mood':
      // Tags without a trustworthy delta sink below those that have one.
      out.sort((a, b) => {
        if (a.delta === null && b.delta === null) return b.days - a.days
        if (a.delta === null) return 1
        if (b.delta === null) return -1
        return b.delta - a.delta
      })
      break
  }
  return out
}

export function TagSheet({
  open, onClose, dataVersion, onDayClick, onFilterDays,
}: Props) {
  const [sort, setSort] = useState<Sort>('most')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const days = useMemo(() => getAllDays(), [dataVersion])
  const catalog = useMemo(() => buildTagCatalog(days), [days])

  const visible = useMemo(() => {
    const q = query.trim().replace(/^#/, '').toLowerCase()
    const filtered = q === '' ? catalog : catalog.filter(t => t.name.includes(q))
    return sortTags(filtered, sort)
  }, [catalog, sort, query])

  const expandedDays = useMemo(
    () => (expanded ? getTagDays(expanded, days) : []),
    [expanded, days],
  )

  // Expanding a tag turns the graph above into a view of *that tag*: the days
  // carrying it keep their colour, everything else goes blank. The list and the
  // graph are then the same answer at two scales. Gated on `open` as well, so a
  // shut sheet never leaves the graph filtered behind it.
  useEffect(() => {
    onFilterDays(open && expanded ? expandedDays.map(d => d.date) : null)
    return () => onFilterDays(null)
  }, [open, expanded, expandedDays, onFilterDays])

  return (
    <div className={`sheet${open ? ' open' : ''}`}>
      <SheetClose onClose={onClose} />

      <div className="sheet-header">
        <div className="sheet-title-row">
          <span className="sheet-title">Tags</span>
          <SegmentedControl options={SORTS} value={sort} onChange={setSort} />
        </div>
        <div className="sheet-search">
          <Search size={14} strokeWidth={2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a tag"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {query !== '' && (
            <button className="sheet-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={13} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      <div className="sheet-body">
        {visible.length === 0 && (
          <p className="sheet-empty">
            {catalog.length === 0
              ? 'No tags yet. Put a #tag anywhere in a note — mid-sentence is fine — and it starts counting days here.'
              : 'No tag matches that.'}
          </p>
        )}

        {visible.map(t => {
          const isOpen = expanded === t.name
          const rated = t.moodAvg !== null
          return (
            <div key={t.name} className="tag-item-wrap">
              <div
                className="tag-item"
                // The tag's own colour, for the dot and the name it sits in
                // front of. Only set when there is something to average.
                data-rated={rated ? '' : undefined}
                style={rated
                  ? ({ '--row-mood': moodColorMix(t.moodAvg as number) } as React.CSSProperties)
                  : undefined}
                onPointerDown={tap}
                onClick={() => setExpanded(isOpen ? null : t.name)}
              >
                <span className="tag-dot" aria-hidden="true" />
                <span className="tag-name">#{t.display}</span>

                {t.delta !== null && (
                  <span className={`tag-delta${t.delta >= 0 ? ' up' : ' down'}`}>
                    {t.delta >= 0 ? '+' : '−'}{Math.abs(t.delta).toFixed(1)}
                  </span>
                )}
                <span className="tag-count">
                  {t.days}{t.days === 1 ? ' day' : ' days'}
                </span>
                <span className="tag-score">
                  {rated
                    ? <>{(t.moodAvg as number).toFixed(1)}<em>/{MOOD_MAX}</em></>
                    : <em>—</em>}
                </span>
              </div>

              {isOpen && (
                <div className="tag-days">
                  {expandedDays.map(d => (
                    <button
                      key={d.date}
                      className="tag-day"
                      onPointerDown={tap}
                      onClick={() => onDayClick(d.date)}
                    >
                      <span className="tag-day-head">
                        <span
                          className="tag-day-dot"
                          style={d.mood !== null
                            ? { background: moodColorMix(d.mood) }
                            : { background: 'transparent', borderColor: 'var(--line)' }}
                          aria-hidden="true"
                        />
                        <span className="tag-day-date">{formatShortDate(d.date)}</span>
                      </span>
                      {d.lines.map((line, i) => (
                        <span key={i} className="tag-day-line">{line}</span>
                      ))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

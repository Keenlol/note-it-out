import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SheetClose } from './SheetClose'
import { SegmentedControl, type SegOption } from './SegmentedControl'
import { getAllDays } from '../utils/storage'
import { buildTagCatalog, getTagDays, MIN_MOOD_DAYS, type TagStat } from '../utils/tags'
import { moodColorMix, moodLabel, MOOD_MAX } from '../utils/mood'
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
  open, onClose, dataVersion, onDayClick,
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
          return (
            <div key={t.name} className="tag-item-wrap">
              <div
                className="tag-item"
                onPointerDown={tap}
                onClick={() => setExpanded(isOpen ? null : t.name)}
              >
                <span className="tag-name">#{t.display}</span>
                <span className="tag-count">
                  {t.days} {t.days === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div className="tag-inner">
                {t.moodAvg !== null ? (
                  <div className="tag-mood">
                    <span
                      className="tag-mood-dot"
                      style={{ background: moodColorMix(t.moodAvg) }}
                      aria-hidden="true"
                    />
                    <span className="tag-mood-text">
                      averages <strong>{moodLabel(Math.round(t.moodAvg))}</strong>
                      {' '}({t.moodAvg.toFixed(1)}/{MOOD_MAX}) over {t.moodDays} rated
                      {' '}{t.moodDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                ) : (
                  <div className="tag-mood">
                    <span className="tag-mood-text">no rated days yet</span>
                  </div>
                )}

                {t.delta !== null ? (
                  <div className={`tag-delta${t.delta >= 0 ? ' up' : ' down'}`}>
                    {t.delta >= 0 ? '+' : '−'}{Math.abs(t.delta).toFixed(2)}
                    <span className="tag-delta-label">vs. days without it</span>
                  </div>
                ) : (
                  <div className="tag-delta muted">
                    <span className="tag-delta-label">
                      needs {MIN_MOOD_DAYS} rated days on each side to compare
                    </span>
                  </div>
                )}
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

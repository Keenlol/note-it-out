import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Hash, Settings, X } from 'lucide-react'
import { Heatmap } from './components/Heatmap'
import { Editor, type Suggestion } from './components/Editor'
import { MoodSlider } from './components/MoodSlider'
import { TagSheet } from './components/TagSheet'
import { SettingsSheet } from './components/SettingsSheet'
import {
  getAllDays, loadDay, offsetDate, saveDayMood, saveDayText, todayKey,
} from './utils/storage'
import { activeTagFragment, lineIndexAt } from './utils/parser'
import { tagFrequency } from './utils/tags'
import { formatDisplayDate } from './utils/format'
import { weekOffsetForDate } from './utils/window'
import { getSavedSheetHeight, getSavedTheme, saveSheetHeight, saveTheme } from './utils/settings'
import { applyTheme, msUntilNextFlip, resolveTheme, type ThemePref } from './utils/theme'
import { tap } from './utils/tap'

const SAVE_DELAY = 400
const SAVED_FLASH_MS = 1200
const SHEET_TOP_GAP = 60
const MIN_SHEET_HEIGHT = 220
/** How many tags the ghost block lists before giving up on being helpful. */
const MAX_TAG_OPTIONS = 8

const PLACEHOLDER = `what happened, what you did, what you wish you'd done

put a #tag anywhere to start counting it`

export function App() {
  // ── Day being viewed. null means today. ────────────────────────────────
  const [viewDate, setViewDate] = useState<string | null>(null)
  const currentDate = viewDate ?? todayKey()

  const [text, setText] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [cursor, setCursor] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)

  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sheetHeight, setSheetHeight] = useState<number | undefined>(() => getSavedSheetHeight())

  const [themePref, setThemePref] = useState<ThemePref>(() => getSavedTheme())

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const heatmapRef = useRef<HTMLDivElement>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const versionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<{ date: string; text: string } | null>(null)
  const loadedDate = useRef<string | null>(null)

  const bumpVersion = useCallback(() => setDataVersion(v => v + 1), [])

  // ── Saving ──────────────────────────────────────────────────────────────
  // A pending edit is always tagged with the day it belongs to, so switching
  // days (or backgrounding the app) can never land today's text on yesterday.

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = undefined
    }
    const p = pending.current
    if (!p) return
    pending.current = null
    saveDayText(p.date, p.text)
    bumpVersion()
  }, [bumpVersion])

  const handleTextChange = (next: string) => {
    setText(next)
    const date = currentDate
    pending.current = { date, text: next }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined
      pending.current = null
      saveDayText(date, next)
      bumpVersion()
      setSavedFlash(true)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS)
    }, SAVE_DELAY)
  }

  const handleMoodChange = (next: number | null) => {
    setMood(next)
    saveDayMood(currentDate, next)
    // The heatmap repaints the live cell from `liveDay` without waiting for
    // this, so the aggregate refresh can lag behind a drag without stutter.
    clearTimeout(versionTimer.current)
    versionTimer.current = setTimeout(bumpVersion, SAVE_DELAY)
  }

  // Persist before the tab is hidden or torn down — on iOS a PWA can be frozen
  // without ever firing unload, and pagehide is the reliable last call.
  useEffect(() => {
    const onHide = () => flushSave()
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushSave() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      flushSave()
    }
  }, [flushSave])

  useEffect(() => () => {
    clearTimeout(flashTimer.current)
    clearTimeout(versionTimer.current)
  }, [])

  // ── Loading the viewed day ──────────────────────────────────────────────
  useEffect(() => {
    if (loadedDate.current === currentDate) return
    flushSave()                       // commit the day we're leaving
    const day = loadDay(currentDate)
    loadedDate.current = currentDate
    setText(day?.rawText ?? '')
    setMood(day?.mood ?? null)
    setCursor(0)
  }, [currentDate, reloadToken, flushSave])

  // ── Theme ───────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(resolveTheme(themePref))
    if (themePref !== 'auto') return
    // Re-resolve at the next boundary so a session left open crosses over.
    const id = setTimeout(() => applyTheme(resolveTheme('auto')), msUntilNextFlip())
    return () => clearTimeout(id)
  }, [themePref])

  const handleThemeChange = (pref: ThemePref) => {
    setThemePref(pref)
    saveTheme(pref)
  }

  // ── Tag autocomplete ────────────────────────────────────────────────────
  const knownTags = useMemo(() => {
    const counts = tagFrequency(getAllDays())
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name)
  }, [dataVersion])

  const suggestion: Suggestion | null = useMemo(() => {
    const frag = activeTagFragment(text, cursor)
    if (!frag) return null
    const lineIndex = lineIndexAt(text, cursor)
    const matches = knownTags.filter(t => t.startsWith(frag.frag) && t !== frag.frag)

    if (matches.length === 0) return null
    // Bare '#' or an ambiguous prefix: list what's available, but stay out of
    // the way — Enter still inserts a newline.
    if (matches.length > 1 || frag.frag === '') {
      return { lineIndex, suffix: '', options: matches.slice(0, MAX_TAG_OPTIONS), isHint: true }
    }
    return { lineIndex, suffix: matches[0].slice(frag.frag.length) }
  }, [text, cursor, knownTags])

  const acceptSuggestion = () => {
    if (!suggestion?.suffix) return
    const ta = textareaRef.current
    const pos = ta?.selectionStart ?? cursor
    const next = text.slice(0, pos) + suggestion.suffix + text.slice(pos)
    handleTextChange(next)
    const caret = pos + suggestion.suffix.length
    setCursor(caret)
    requestAnimationFrame(() => {
      ta?.focus()
      ta?.setSelectionRange(caret, caret)
    })
  }

  // ── Frame geometry ──────────────────────────────────────────────────────
  // The keyboard-free viewport height, for anything on the right-hand axis.
  // With `interactive-widget=resizes-content` a software keyboard shortens the
  // layout viewport, so sizing the rail off 100dvh makes it shrink and pull the
  // dock up while you type. Hold the tallest height seen at this width instead:
  // the keyboard only ever shrinks it, and a rotation changes the width, which
  // resets the measurement.
  useEffect(() => {
    let width = 0
    let tallest = 0
    const update = () => {
      const w = window.visualViewport?.width ?? window.innerWidth
      const h = window.visualViewport?.height ?? window.innerHeight
      if (w !== width) { width = w; tallest = 0 }
      if (h <= tallest) return
      tallest = h
      document.documentElement.style.setProperty('--vh-stable', `${h}px`)
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  // ── Sheets ──────────────────────────────────────────────────────────────
  const anySheetOpen = tagSheetOpen || settingsOpen
  const manualHeight = useRef(getSavedSheetHeight() !== undefined)
  const latestHeight = useRef<number | undefined>(getSavedSheetHeight())

  const clampSheetHeight = (px: number): number => {
    const vh = window.visualViewport?.height ?? window.innerHeight
    return Math.round(Math.max(MIN_SHEET_HEIGHT, Math.min(px, vh - SHEET_TOP_GAP)))
  }

  // Default the sheet to exactly the space under the heatmap, so opening one
  // never covers the grid. A manual drag opts out of this for good.
  useEffect(() => {
    const el = heatmapRef.current
    if (!el) return
    const update = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight
      // Where the two columns start, in document coords so scrolling can't
      // skew it. The mood rail sizes itself off this: its length depends on
      // where it begins, which no CSS length can express.
      document.documentElement.style.setProperty(
        '--content-top', `${el.getBoundingClientRect().bottom + window.scrollY}px`,
      )
      if (manualHeight.current) {
        setSheetHeight(h => (h === undefined ? h : clampSheetHeight(h)))
        return
      }
      setSheetHeight(vh - el.getBoundingClientRect().bottom)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  const handleSheetResize = (px: number) => {
    manualHeight.current = true
    const clamped = clampSheetHeight(px)
    latestHeight.current = clamped
    setSheetHeight(clamped)
  }

  const handleSheetResizeEnd = () => {
    if (latestHeight.current !== undefined) saveSheetHeight(latestHeight.current)
  }

  const closeSheets = () => { setTagSheetOpen(false); setSettingsOpen(false) }

  const openTagSheet = () => {
    if (tagSheetOpen) { setTagSheetOpen(false); return }
    setSettingsOpen(false)
    setTagSheetOpen(true)
  }

  const openSettings = () => {
    if (settingsOpen) { setSettingsOpen(false); return }
    setTagSheetOpen(false)
    setSettingsOpen(true)
  }

  // ── Day navigation ──────────────────────────────────────────────────────
  const navigateDay = (dir: -1 | 1) => {
    const next = offsetDate(currentDate, dir)
    if (next > todayKey()) return
    setViewDate(next === todayKey() ? null : next)
  }

  const goToDate = (date: string) => {
    setViewDate(date === todayKey() ? null : date)
    closeSheets()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only when nothing is focused — never steal arrows from the textarea.
      if (document.activeElement && document.activeElement !== document.body) return
      if (e.key === 'ArrowLeft') navigateDay(-1)
      else if (e.key === 'ArrowRight') navigateDay(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // navigateDay closes over currentDate, so the listener is rebound per day.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  // Swipe left/right across the note area to change day.
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [swiping, setSwiping] = useState(false)
  const [titleStyle, setTitleStyle] = useState<React.CSSProperties>({})
  const [noteOpacity, setNoteOpacity] = useState(1)

  useEffect(() => () => clearTimeout(swipeTimer.current), [])

  const handleTouchStart = (e: React.TouchEvent) => {
    clearTimeout(swipeTimer.current)
    if (swiping) {
      setSwiping(false)
      setTitleStyle({})
      setNoteOpacity(1)
    }
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swiping) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      setTitleStyle({ transform: `translateX(${dx * 0.45}px)` })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const snapBack = () => {
      setTitleStyle({ transform: 'translateX(0)', transition: 'transform 0.15s ease' })
      swipeTimer.current = setTimeout(() => setTitleStyle({}), 160)
    }

    if (swiping || Math.abs(dx) <= 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) {
      snapBack()
      return
    }

    const navDir: -1 | 1 = dx > 0 ? -1 : 1
    const dir: 1 | -1 = dx > 0 ? 1 : -1        // visual direction of the gesture
    if (offsetDate(currentDate, navDir) > todayKey()) {
      snapBack()
      return
    }

    setSwiping(true)
    setTitleStyle({
      transform: `translateX(${dir * 120}px)`,
      opacity: 0,
      transition: 'transform 0.08s ease, opacity 0.07s ease',
    })
    setNoteOpacity(0)

    swipeTimer.current = setTimeout(() => {
      navigateDay(navDir)
      setTitleStyle({ transform: `translateX(${-dir * 50}px)`, opacity: 0 })
      // Two RAF hops so the browser paints the "from" state before transitioning.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTitleStyle({
          transform: 'translateX(0)',
          opacity: 1,
          transition: 'transform 0.08s ease, opacity 0.08s ease',
        })
        setNoteOpacity(1)
      }))
      swipeTimer.current = setTimeout(() => {
        setTitleStyle({})
        setSwiping(false)
      }, 100)
    }, 90)
  }

  const isPast = viewDate !== null

  return (
    <div className="app">
      <div ref={heatmapRef}>
        <Heatmap
          onDayClick={goToDate}
          selectedDate={viewDate}
          dataVersion={dataVersion}
          weekOffset={weekOffsetForDate(viewDate)}
          liveDay={{ date: currentDate, mood, hasText: text.trim() !== '' }}
        />
      </div>

      {/* Two columns: the day on the left, the mood rail down the right. The
          rail is a sibling of the title rather than sitting under it, so it
          starts level with the day and directly under the graph. */}
      <div
        className="content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="content-main">
          <div className="title-row">
            <h1 className={`title${isPast ? ' past' : ''}`} style={titleStyle}>
              {formatDisplayDate(currentDate)}
            </h1>
            {isPast && (
              <button className="jump-today" onPointerDown={tap} onClick={() => setViewDate(null)}>
                Today
              </button>
            )}
            <span className={`save-icon${savedFlash ? ' visible' : ''}`} aria-hidden="true">
              <Check size={14} strokeWidth={2.4} />
            </span>
          </div>

          <div className="note-fade" style={{ opacity: noteOpacity }}>
            <Editor
              value={text}
              onChange={handleTextChange}
              onCursorChange={setCursor}
              onAccept={acceptSuggestion}
              suggestion={suggestion}
              placeholder={PLACEHOLDER}
              textareaRef={textareaRef}
            />
          </div>
        </div>

        {/* Note and mood both belong to the day, so both fade on a swipe. */}
        <MoodSlider value={mood} onChange={handleMoodChange} fade={noteOpacity} />
      </div>

      {/* The rail's foot: clear-mood, then the two sheets. Fixed, so it stays
          reachable and stays above an open sheet the way a tab bar does. */}
      <div className="dock">
        <button
          className={`dock-btn dock-clear${mood !== null && !anySheetOpen ? ' visible' : ''}`}
          onPointerDown={tap}
          onClick={() => handleMoodChange(null)}
          aria-label="Clear mood"
          tabIndex={mood !== null && !anySheetOpen ? 0 : -1}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        <button
          className={`dock-btn${tagSheetOpen ? ' active' : ''}`}
          onPointerDown={tap}
          onClick={openTagSheet}
          aria-label="Tags"
        >
          <Hash size={22} strokeWidth={1.8} />
        </button>
        <button
          className={`dock-btn${settingsOpen ? ' active' : ''}`}
          onPointerDown={tap}
          onClick={openSettings}
          aria-label="Settings"
        >
          <Settings size={20} strokeWidth={1.8} />
        </button>
      </div>

      <TagSheet
        open={tagSheetOpen}
        onClose={() => setTagSheetOpen(false)}
        onResize={handleSheetResize}
        onResizeEnd={handleSheetResizeEnd}
        height={sheetHeight}
        dataVersion={dataVersion}
        onDayClick={goToDate}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResize={handleSheetResize}
        onResizeEnd={handleSheetResizeEnd}
        height={sheetHeight}
        dataVersion={dataVersion}
        theme={themePref}
        onThemeChange={handleThemeChange}
        onDataChanged={() => {
          // Imports and wipes replace what's under us — reload the viewed day.
          loadedDate.current = null
          setReloadToken(t => t + 1)
          bumpVersion()
        }}
      />

      {anySheetOpen && <div className="sheet-scrim" onClick={closeSheets} aria-hidden="true" />}
    </div>
  )
}

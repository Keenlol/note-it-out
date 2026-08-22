import { useMemo, useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { SegmentedControl, type SegOption } from './SegmentedControl'
import type { ThemePref } from '../utils/theme'
import { DARK_FROM_HOUR, DARK_UNTIL_HOUR } from '../utils/theme'
import {
  applyImport, buildExport, buildMarkdown, clearAllDays, download,
  exportFilename, formatBytes, getStats, parseImport, type ExportFile,
} from '../utils/data'
import { tap } from '../utils/tap'
import type { FeedbackPref } from '../utils/feedback'

const THEMES: SegOption<ThemePref>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

const FEEDBACK: SegOption<FeedbackPref>[] = [
  { value: 'vibrate', label: 'Vibrate' },
  { value: 'click', label: 'Click' },
  { value: 'off', label: 'Off' },
]


type ConfirmState =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'import'; file: ExportFile; name: string }
  | { kind: 'error'; message: string }

interface Props {
  open: boolean
  dataVersion: number
  theme: ThemePref
  onThemeChange: (pref: ThemePref) => void
  feedback: FeedbackPref
  onFeedbackChange: (pref: FeedbackPref) => void
  onDataChanged: () => void
}

function hour12(h: number): string {
  const suffix = h >= 12 ? 'pm' : 'am'
  const base = h % 12 === 0 ? 12 : h % 12
  return `${base}${suffix}`
}

export function SettingsSheet({
  open, dataVersion, theme, onThemeChange, feedback, onFeedbackChange, onDataChanged,
}: Props) {
  const [confirm, setConfirm] = useState<ConfirmState>({ kind: 'none' })
  const fileRef = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => getStats(), [dataVersion])

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''      // let the same file be picked again after a cancel
    if (!file) return
    try {
      const parsed = parseImport(await file.text())
      setConfirm({ kind: 'import', file: parsed, name: file.name })
    } catch (err) {
      setConfirm({ kind: 'error', message: err instanceof Error ? err.message : 'Could not read that file.' })
    }
  }

  function doImport() {
    if (confirm.kind !== 'import') return
    applyImport(confirm.file)
    setConfirm({ kind: 'none' })
    onDataChanged()
  }

  function doClear() {
    clearAllDays()
    setConfirm({ kind: 'none' })
    onDataChanged()
  }

  return (
    <div className={`sheet${open ? ' open' : ''}`}>
      <div className="sheet-header">
        <div className="sheet-title-row">
          <span className="sheet-title">Settings</span>
        </div>
      </div>

      <div className="settings-body">
        <div className="settings-section">
          <span className="settings-section-label">Appearance</span>
          <p className="settings-section-hint">
            Auto follows the clock — paper from {hour12(DARK_UNTIL_HOUR)}, dark from {hour12(DARK_FROM_HOUR)}.
          </p>
          <SegmentedControl options={THEMES} value={theme} onChange={onThemeChange} />
        </div>

        <div className="settings-section">
          <span className="settings-section-label">Detent</span>
          <p className="settings-section-hint">
            How the mood slider marks each crossing into the next colour. Vibrate
            needs a phone with a motor and the system's own haptics switched on;
            Click is a sound, for a laptop. Picking one plays it.
          </p>
          <SegmentedControl options={FEEDBACK} value={feedback} onChange={onFeedbackChange} />
        </div>

        <div className="settings-section">
          <span className="settings-section-label">Your data</span>
          <p className="settings-section-hint">
            Everything lives in this browser only. Nothing is uploaded anywhere — which
            also means clearing site data wipes it. Export now and then.
          </p>

          <div className="data-stat-card">
            <div className="data-stat-size">
              <span className="data-stat-size-value">{formatBytes(stats.bytes)}</span>
              <span className="data-stat-size-label">stored</span>
            </div>
            <div className="data-stat-counts">
              <span className="data-stat-count"><strong>{stats.days}</strong> days</span>
              <span className="data-stat-count"><strong>{stats.ratedDays}</strong> rated</span>
              <span className="data-stat-count"><strong>{stats.lines}</strong> lines</span>
              <span className="data-stat-count"><strong>{stats.tags}</strong> tags</span>
            </div>
          </div>

          {confirm.kind === 'none' && (
            <div className="data-actions">
              <button
                className="data-btn"
                onPointerDown={tap}
                onClick={() => download(exportFilename('json'), JSON.stringify(buildExport(), null, 2), 'application/json')}
              >
                <Download size={14} strokeWidth={2} /> Backup
              </button>
              <button
                className="data-btn"
                onPointerDown={tap}
                onClick={() => download(exportFilename('md'), buildMarkdown(), 'text/markdown')}
              >
                <FileText size={14} strokeWidth={2} /> Markdown
              </button>
              <button className="data-btn" onPointerDown={tap} onClick={() => fileRef.current?.click()}>
                <Upload size={14} strokeWidth={2} /> Import
              </button>
              <button
                className="data-btn data-btn-danger"
                onPointerDown={tap}
                onClick={() => setConfirm({ kind: 'clear' })}
              >
                <Trash2 size={14} strokeWidth={2} /> Clear all
              </button>
            </div>
          )}

          {confirm.kind === 'import' && (
            <div className="data-confirm">
              <p className="data-confirm-title">Import {confirm.file.days.length} days?</p>
              <p className="data-confirm-hint">
                From <strong>{confirm.name}</strong>. Any day already in the file will
                overwrite what's stored for that date. Days not in the file are left alone.
              </p>
              <div className="data-confirm-actions">
                <button className="data-btn" onPointerDown={tap} onClick={doImport}>Import</button>
                <button className="data-btn data-btn-ghost" onPointerDown={tap} onClick={() => setConfirm({ kind: 'none' })}>Cancel</button>
              </div>
            </div>
          )}

          {confirm.kind === 'clear' && (
            <div className="data-confirm">
              <p className="data-confirm-title">Delete everything?</p>
              <p className="data-confirm-hint">
                All {stats.days} days — every note and every mood — are removed from this
                browser. There is no undo. Export a backup first if you're unsure.
              </p>
              <div className="data-confirm-actions">
                <button className="data-btn data-btn-danger" onPointerDown={tap} onClick={doClear}>Delete all</button>
                <button className="data-btn data-btn-ghost" onPointerDown={tap} onClick={() => setConfirm({ kind: 'none' })}>Cancel</button>
              </div>
            </div>
          )}

          {confirm.kind === 'error' && (
            <div className="data-confirm">
              <p className="data-confirm-title">Import failed</p>
              <p className="data-confirm-hint">{confirm.message}</p>
              <div className="data-confirm-actions">
                <button className="data-btn data-btn-ghost" onPointerDown={tap} onClick={() => setConfirm({ kind: 'none' })}>OK</button>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFilePicked}
            hidden
          />
        </div>

        <div className="settings-section">
          <span className="settings-section-label">About</span>
          <div className="about-card">
            <div className="about-row">
              <span className="about-key">Version</span>
              <span className="about-val">{__APP_VERSION__}</span>
            </div>
            <div className="about-row">
              <span className="about-key">Built</span>
              <span className="about-val">{__BUILD_DATE__}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

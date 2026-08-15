import { useEffect } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { parseLine } from '../utils/parser'

export interface Suggestion {
  lineIndex: number
  suffix: string       // inline ghost completing the tag being typed
  options?: string[]   // floating list, shown when several tags match
  isHint?: boolean     // true = informational only; don't intercept Enter/Tab
}

interface Props {
  value: string
  onChange: (text: string) => void
  onCursorChange: (pos: number) => void
  onAccept: () => void
  suggestion: Suggestion | null
  placeholder?: string
  readOnly?: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

/** Splits a line into plain and `.tag` spans. */
function renderLine(raw: string): React.ReactNode[] {
  if (raw.length === 0) return []
  const { tags } = parseLine(raw)
  if (tags.length === 0) return [raw]

  const out: React.ReactNode[] = []
  let at = 0
  for (const t of tags) {
    if (t.start > at) out.push(raw.slice(at, t.start))
    out.push(<span key={t.start} className="tag">{raw.slice(t.start, t.end)}</span>)
    at = t.end
  }
  if (at < raw.length) out.push(raw.slice(at))
  return out
}

function renderOverlay(text: string, suggestion: Suggestion | null): React.ReactNode[] {
  const nodes: React.ReactNode[] = []

  text.split('\n').forEach((line, i) => {
    if (i > 0) nodes.push('\n')
    nodes.push(<span key={`l${i}`}>{renderLine(line)}</span>)

    if (suggestion?.lineIndex === i && suggestion.suffix) {
      nodes.push(
        <span key={`g${i}`} className="ghost">
          {suggestion.suffix}
          {!suggestion.isHint && (
            <CornerDownLeft size={12} strokeWidth={2} className="ghost-enter-icon" />
          )}
        </span>
      )
    }
  })

  return nodes
}

export function Editor({
  value, onChange, onCursorChange, onAccept,
  suggestion, placeholder, readOnly, textareaRef,
}: Props) {
  // Auto-resize textarea to content
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [value, textareaRef])

  const reportCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    onCursorChange(e.currentTarget.selectionStart)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const acceptable = suggestion && !suggestion.isHint && suggestion.suffix
    if (e.key === 'Tab') {
      e.preventDefault()
      if (acceptable) onAccept()
      return
    }
    if (e.key === 'Enter' && acceptable) {
      e.preventDefault()
      onAccept()
    }
  }

  return (
    <div className="editor-wrap">
      <div className="editor-overlay" aria-hidden="true">
        {renderOverlay(value, suggestion)}
        {value.endsWith('\n') || value === '' ? '​' : ''}
      </div>

      {/* Tag options: floats below the line being typed, outside normal flow */}
      {suggestion?.options && suggestion.options.length > 0 && (
        <div
          className="ghost ghost-tag-block"
          aria-hidden="true"
          style={{ top: `calc(${suggestion.lineIndex + 1} * var(--editor-lh) * 1em)` }}
        >
          {suggestion.options.map(name => (
            <span key={name} className="ghost-tag-chip">#{name}</span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className={`editor-textarea${readOnly ? ' read-only' : ''}`}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          onCursorChange(e.target.selectionStart)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={reportCursor}
        onMouseUp={reportCursor}
        onSelect={reportCursor}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="sentences"
        autoComplete="off"
        autoCorrect="off"
        placeholder={placeholder}
      />
    </div>
  )
}

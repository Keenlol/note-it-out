import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { FingerprintPattern } from 'lucide-react'
import { LOCK_GRACE_MS, disableLock, isLockEnabled, verifyLock } from '../utils/lock'
import { getSavedLockGrace } from '../utils/settings'
import { clearAllDays } from '../utils/data'
import { tap } from '../utils/tap'

/**
 * Wraps the app and covers it with the lock screen while locked. The app stays
 * mounted underneath — `inert` so nothing in it can take focus or a tap, and
 * `visibility: hidden` so nothing in it paints — rather than being unmounted,
 * so a quick trip to another app and back (inside the grace period) lands on
 * exactly the day, scroll and caret you left.
 *
 * Locking is decided when the app becomes *visible* again, not when it goes
 * hidden: what matters is how long it was away, and only the return knows
 * that. The decision is flushed synchronously inside the event so the note is
 * never painted for a frame before the lock is.
 *
 * Whether the lock is on and how long the grace is are read from storage at
 * that moment, not held in state — settings can change them without this
 * component hearing about it.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(() => isLockEnabled())
  const hiddenAt = useRef<number | null>(null)

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        return
      }
      if (hiddenAt.current === null) return
      const away = Date.now() - hiddenAt.current
      hiddenAt.current = null
      if (!isLockEnabled()) return
      if (away >= LOCK_GRACE_MS[getSavedLockGrace()]) flushSync(() => setLocked(true))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const unlock = useCallback(() => setLocked(false), [])

  return (
    <>
      <div className={`gate${locked ? ' gate-locked' : ''}`} inert={locked}>
        {children}
      </div>
      {locked && <LockScreen onUnlocked={unlock} />}
    </>
  )
}

type Attempt = 'idle' | 'busy' | 'failed'

function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [attempt, setAttempt] = useState<Attempt>('idle')
  const [confirmReset, setConfirmReset] = useState(false)
  const inFlight = useRef(false)

  // One request at a time: the browser rejects a second WebAuthn call while
  // the first is up, and that rejection would read as a failed unlock.
  const tryUnlock = useCallback(async (fromTap: boolean) => {
    if (inFlight.current) return
    inFlight.current = true
    setAttempt('busy')
    const ok = await verifyLock()
    inFlight.current = false
    if (ok) { onUnlocked(); return }
    // The automatic ask can fail for reasons that aren't the user's — a browser
    // that only allows the prompt from a tap — so only a tap earns the message.
    setAttempt(fromTap ? 'failed' : 'idle')
  }, [onUnlocked])

  // Ask the moment the screen is up, the way a banking app does; the glyph is
  // there for a second try, and for browsers that want a gesture first.
  useEffect(() => { void tryUnlock(false) }, [tryUnlock])

  function reset() {
    // The app underneath still holds the day it loaded; a reload is the only
    // honest way to start from nothing.
    clearAllDays()
    disableLock()
    location.reload()
  }

  const caption =
    attempt === 'busy' ? 'Unlocking…'
    : attempt === 'failed' ? 'That didn’t work. Tap to try again.'
    : 'Tap to unlock'

  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Locked">
      <button
        className={`lock-glyph${attempt === 'busy' ? ' busy' : ''}`}
        onPointerDown={tap}
        onClick={() => void tryUnlock(true)}
        aria-label="Unlock"
      >
        <FingerprintPattern size={56} strokeWidth={1.2} />
      </button>
      <p className="lock-caption" aria-live="polite">{caption}</p>

      <div className="lock-foot">
        {confirmReset ? (
          <div className="data-confirm">
            <p className="data-confirm-title">Start over?</p>
            <p className="data-confirm-hint">
              Deletes every note and mood on this device and turns the lock off.
              There is no undo, and no other way in without your screen lock.
            </p>
            <div className="data-confirm-actions">
              <button className="data-btn data-btn-danger" onPointerDown={tap} onClick={reset}>Delete everything</button>
              <button className="data-btn data-btn-ghost" onPointerDown={tap} onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="data-btn data-btn-ghost" onPointerDown={tap} onClick={() => setConfirmReset(true)}>
            Can’t unlock?
          </button>
        )}
      </div>
    </div>
  )
}

import { X } from 'lucide-react'
import { tap } from '../utils/tap'

/**
 * A panel's way out. Panels cover the dock outright, so the button that opened
 * one is hidden while it's open — this stands in for it, on the same --rail-cx
 * line, so the right edge of the app is one column whether a panel is open or
 * not.
 */
export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-bar">
      <button className="sheet-close" onPointerDown={tap} onClick={onClose} aria-label="Close">
        <X size={20} strokeWidth={2} />
      </button>
    </div>
  )
}

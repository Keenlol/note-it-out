import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { getSavedTheme } from './utils/settings'
import { migrateMoodScale } from './utils/storage'
import { applyTheme, resolveTheme } from './utils/theme'

// sw.js is generated at build time (see swPlugin in vite.config.ts), so in dev
// the request falls through to index.html and registration throws on MIME type.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Before first paint, so the app never flashes the wrong scheme.
applyTheme(resolveTheme(getSavedTheme()))

// Before anything reads a day, so nothing renders on the old scale.
migrateMoodScale()

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

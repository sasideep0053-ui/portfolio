import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './animations.css'
import App from './App.tsx'

// ── Scroll-to-top on every page load ──────────────────────────────────────
// Removes any URL hash so the browser won't try to jump to an anchor,
// then forces the viewport to the top at multiple points in the load cycle
// to cover Chrome, Firefox, and Safari bfcache behaviour.

if (location.hash) history.replaceState(null, '', location.pathname + location.search)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' })
scrollTop()
requestAnimationFrame(scrollTop)
window.addEventListener('load', scrollTop, { once: true })

// Safari back-forward cache: pageshow fires even when restored from bfcache
window.addEventListener('pageshow', (e) => {
  if ((e as PageTransitionEvent).persisted) scrollTop()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

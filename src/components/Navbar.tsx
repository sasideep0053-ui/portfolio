import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Palette, Terminal, FlaskConical } from 'lucide-react'
import { useTheme, type ColorTheme, COLOR_THEMES } from '../contexts/ThemeContext'
import { useRouter } from '../contexts/RouterContext'
import { useConsole } from '../contexts/ConsoleContext'
import { RESUME } from '../data/resume'
import DevConsole from './DevConsole'

const COLOR_KEYS = Object.keys(COLOR_THEMES) as ColorTheme[]

const THEME_LOG_LINES = (name: string) => [
  `// switching → ${name}`,
  `loading ${name.toLowerCase().replace(/\s/g, '_')}_assets... [OK]`,
  `injecting color_tokens... [OK]`,
  `mounting theme_engine... [OK]`,
  `transition complete.`,
]

export default function Navbar() {
  const { colorTheme, setColorTheme } = useTheme()
  const { path, navigate } = useRouter()
  const { consoleOpen, setConsoleOpen } = useConsole()
  const isLab = path.startsWith('/lab') || path.startsWith('/components')

  const [scrolled,     setScrolled]    = useState(false)
  const [paletteOpen,  setPaletteOpen] = useState(false)
  const [progress,     setProgress]    = useState(0)
  const [toastLines,   setToastLines]  = useState<string[]>([])
  const [toastVisible, setToastVisible] = useState(false)
  const [controlsSeen, setControlsSeen] = useState(
    () => localStorage.getItem('controlsSeen') === '1'
  )
  const toastTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lineTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const markControlsSeen = () => {
    if (!controlsSeen) {
      localStorage.setItem('controlsSeen', '1')
      setControlsSeen(true)
    }
  }

  const paletteRef    = useRef<HTMLDivElement>(null)
  const consoleBtnRef = useRef<HTMLButtonElement>(null)
  const prevConsoleOpen = useRef(false)

  // Return focus to the console toggle when console closes
  useEffect(() => {
    if (prevConsoleOpen.current && !consoleOpen) {
      consoleBtnRef.current?.focus()
    }
    prevConsoleOpen.current = consoleOpen
  }, [consoleOpen])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? (y / total) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!paletteRef.current?.contains(e.target as Node)) setPaletteOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPaletteOpen(false); setConsoleOpen(false) }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); setConsoleOpen(o => !o) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <nav className={`navbar${(scrolled || isLab) ? ' navbar--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      <div className="container navbar__inner">

        <button
          className="navbar__logo"
          aria-label={isLab ? 'Back to portfolio' : `${RESUME.name} — scroll to top`}
          onClick={() => isLab ? navigate('/') : window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="navbar__logo-avatar" aria-hidden="true">SK</span>
          <span className="navbar__logo-name">{RESUME.name.split(' ')[0]}</span>
        </button>

        <div className="navbar__controls" role="group" aria-label="Display settings">
          {/* Lab link */}
          <button
            className={`locale-btn navbar__lab-btn${isLab ? ' active' : ''}`}
            onClick={() => isLab ? navigate('/') : navigate('/lab')}
            aria-label={isLab ? 'Back to portfolio' : 'Open Lab'}
            data-tooltip={isLab ? 'Back to portfolio' : 'Open engineering lab'}
          >
            <FlaskConical size={14} aria-hidden="true" />
          </button>

          {/* Console toggle */}
          <button
            ref={consoleBtnRef}
            className={`locale-btn${consoleOpen ? ' active' : ''}`}
            onClick={() => setConsoleOpen(o => !o)}
            aria-pressed={consoleOpen}
            aria-label="Toggle system console"
            data-tooltip="Open dev console"
          >
            <Terminal size={14} aria-hidden="true" />
          </button>

          {/* Dev-only: trigger ErrorBoundary */}
          {import.meta.env.DEV && (
            <button
              className="locale-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('dev:error'))}
              title="Trigger ErrorBoundary (dev only)"
              aria-label="Trigger error boundary for testing"
              style={{ color: 'rgba(239,68,68,0.6)', fontSize: '0.75rem' }}
            >
              💥
            </button>
          )}

          {/* Color theme picker */}
          <div className="navbar__locale" ref={paletteRef}>
            <button
              className={`locale-btn${!controlsSeen ? ' locale-btn--attn' : ''}`}
              onClick={() => { setPaletteOpen(o => !o); markControlsSeen() }}
              aria-haspopup="listbox"
              aria-expanded={paletteOpen}
              aria-label={`Color theme: ${COLOR_THEMES[colorTheme].name}`}
              data-tooltip={controlsSeen ? 'Switch color theme' : undefined}
            >
              <Palette size={14} aria-hidden="true" />
              <span
                style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: '50%', background: COLOR_THEMES[colorTheme].accent,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <ChevronDown size={12} aria-hidden="true" className={paletteOpen ? 'rotated' : ''} />
            </button>
            {!isLab && !consoleOpen && !paletteOpen && !controlsSeen && (
              <div className="controls-callout" aria-hidden="true">
                <span className="controls-callout__arrow">↑</span>
                <span>theme — try me</span>
              </div>
            )}
            {paletteOpen && (
              <ul className="locale-dropdown palette-dropdown" role="listbox" aria-label="Select color theme">
                {COLOR_KEYS.map(key => (
                  <li key={key} role="option" aria-selected={key === colorTheme}>
                    <button
                      onClick={() => {
                        setColorTheme(key)
                        setPaletteOpen(false)
                        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
                        if (lineTimerRef.current)  clearInterval(lineTimerRef.current)
                        const lines = THEME_LOG_LINES(COLOR_THEMES[key].name)
                        let idx = 0
                        setToastLines([lines[idx++]])
                        setToastVisible(true)
                        lineTimerRef.current = setInterval(() => {
                          if (idx < lines.length) {
                            setToastLines(prev => [...prev, lines[idx++]])
                          } else {
                            clearInterval(lineTimerRef.current!)
                          }
                        }, 180)
                        toastTimerRef.current = setTimeout(() => {
                          setToastVisible(false)
                          setTimeout(() => setToastLines([]), 400)
                        }, 2400)
                      }}
                      className={key === colorTheme ? 'active' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        style={{
                          display: 'inline-block', width: 12, height: 12,
                          borderRadius: '50%', background: COLOR_THEMES[key].accent,
                          border: key === colorTheme ? '2px solid var(--text)' : '2px solid transparent',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span>{COLOR_THEMES[key].name}</span>
                        {COLOR_THEMES[key].tag && (
                          <span style={{
                            fontSize: '0.625rem', fontFamily: 'monospace',
                            opacity: 0.45, letterSpacing: '0.04em',
                          }}>
                            {COLOR_THEMES[key].tag}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>
    </nav>
    <DevConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    {toastLines.length > 0 && (
      <div className={`theme-toast${toastVisible ? '' : ' theme-toast--out'}`} aria-live="polite" aria-atomic="true">
        {toastLines.map((line, i) => (
          <div key={i} className="theme-toast__line">{line}</div>
        ))}
      </div>
    )}
    </>
  )
}

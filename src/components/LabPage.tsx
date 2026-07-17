import { useState, useEffect, useRef, useCallback } from 'react'
import { FlaskConical, X, ChevronDown } from 'lucide-react'
import { useRouter } from '../contexts/RouterContext'
import { useConsole } from '../contexts/ConsoleContext'
import TelematicsDemo       from './demos/TelematicsDemo'
import SpeechVisualizerDemo from './demos/SpeechVisualizerDemo'
import DroneDemo            from './demos/DroneDemo'
import GaltonDemo           from './demos/GaltonDemo'
import ThreeSceneDemo       from './demos/ThreeSceneDemo'
import RecoDemo             from './demos/RecoDemo'
import RagDemo              from './demos/RagDemo'

type DemoId = 'drive-score' | 'speech' | 'drone' | 'galton' | 'scene' | 'reco' | 'rag'

const SIDEBAR_GROUPS = [
  {
    group: 'Experiments',
    items: [
      { id: 'rag'         as DemoId, label: 'Docs RAG Assistant'    },
      { id: 'speech'      as DemoId, label: 'Speech Visualizer'     },
      { id: 'reco'        as DemoId, label: 'Recommendation Engine' },
      { id: 'drive-score' as DemoId, label: 'Drive Score Simulator' },
      { id: 'drone'       as DemoId, label: 'Drone PID Controller'  },
      { id: 'galton'      as DemoId, label: 'Galton Board'           },
    ],
  },
  {
    group: '3D / WebGL',
    items: [
      { id: 'scene' as DemoId, label: 'Day / Night Scene' },
    ],
  },
]

// ALL_IDS includes only lab demos
const ALL_IDS: DemoId[] = ['rag', 'speech', 'reco', 'drive-score', 'drone', 'galton', 'scene']

const DEMO_META: Record<DemoId, { subtitle: string; context: string }> = {
  'drive-score': {
    subtitle: 'WebSocket · FastAPI · Recharts · Physics Engine',
    context:  'Grounded in telematics risk scoring from early in my career — the G-force physics and actuarial risk report mirror commercial driving insurance platforms.',
  },
  'speech': {
    subtitle: 'Web Audio API · Whisper · Canvas · WebSocket',
    context:  'Built from signal processing research from my electronics engineering background. The pitch detection and Whisper transcription pipeline mirrors audio analytics I have prototyped for enterprise tooling.',
  },
  'drone': {
    subtitle: 'PID Control Theory · Canvas 2D · Physics Engine · WebSocket',
    context:  'Implements a full proportional-integral-derivative control loop with real-time physics simulation — the same class of algorithms used in flight controllers, industrial automation, and autonomous vehicles.',
  },
  'galton': {
    subtitle: 'Binomial Distribution · Central Limit Theorem · Canvas 2D · FastAPI',
    context:  'Visualises how random binary choices converge to a bell curve — the statistical core behind actuarial risk models, A/B testing, and signal processing.',
  },
  'reco': {
    subtitle: 'User-Based Recommendations · KNN · TypeScript',
    context:  'Rate anime to get personalised recommendations computed live in the browser — K-nearest-neighbor collaborative filtering with switchable similarity metrics and explainable "why this was recommended" reasoning.',
  },
  'rag': {
    subtitle: 'RAG · ChromaDB · BM25 · Voyage AI Rerank · Groq · FastAPI SSE',
    context:  'Ask questions about React, TypeScript, Vite, or FastAPI docs and get grounded answers. The live pipeline trace shows every stage as it runs: hybrid vector + keyword retrieval, Reciprocal Rank Fusion, Voyage AI reranking, and confidence-gated Groq LLM generation.',
  },
  'scene': {
    subtitle: 'Three.js · WebGL · GLSL Shaders · Real-time Rendering',
    context:  'A time-aware 3D scene built with raw Three.js — sky gradient and lighting adapt to the actual hour of day using keyframe interpolation and a custom sky-dome GLSL shader.',
  },
}

function getComponent(id: DemoId) {
  switch (id) {
    case 'drive-score': return <TelematicsDemo />
    case 'speech':      return <SpeechVisualizerDemo />
    case 'drone':       return <DroneDemo />
    case 'galton':      return <GaltonDemo />
    case 'reco':        return <RecoDemo />
    case 'rag':         return <RagDemo />
    case 'scene':       return <ThreeSceneDemo />
  }
}

// ── Lab Page ──────────────────────────────────────────────────────────────

function demoFromPath(path: string): DemoId {
  // /lab/galton or /lab/galton?... → 'galton'
  const seg = path.split('?')[0].replace(/^\/lab\/?/, '')
  if (seg && ALL_IDS.includes(seg as DemoId)) return seg as DemoId
  // backward-compat: ?demo=galton
  const q = path.indexOf('?')
  if (q !== -1) {
    const params = new URLSearchParams(path.slice(q))
    const qid = params.get('demo') as DemoId
    if (qid && ALL_IDS.includes(qid)) return qid
  }
  return 'drive-score'
}

export default function LabPage() {
  const { navigate, path } = useRouter()
  const { consoleOpen } = useConsole()

  const [activeId, setActiveId] = useState<DemoId>(() => demoFromPath(path))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const meta = DEMO_META[activeId]

  // Derived once — avoids 4× flatMap calls in render
  const ALL_ITEMS = SIDEBAR_GROUPS.flatMap(g => g.items)
  const activeLabel = ALL_ITEMS.find(i => i.id === activeId)?.label ?? ''

  // Sync active demo when navigating to /lab?demo=X
  useEffect(() => {
    setActiveId(demoFromPath(path))
  }, [path])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Keyboard navigation for sidebar
  const sidebarRef = useRef<HTMLElement>(null)
  const handleSidebarKey = useCallback((e: React.KeyboardEvent, currentId: DemoId) => {
    const idx = ALL_IDS.indexOf(currentId)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = ALL_IDS[(idx + 1) % ALL_IDS.length]
      setActiveId(next)
      navigate(`/lab/${next}`)
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-id="${next}"]`)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = ALL_IDS[(idx - 1 + ALL_IDS.length) % ALL_IDS.length]
      setActiveId(prev)
      navigate(`/lab/${prev}`)
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-id="${prev}"]`)?.focus()
    }
  }, [navigate])

  return (
    <div className="lab-layout">

      {/* ── Mobile nav dropdown (hidden on desktop) ──────────────── */}
      <div className="lab-mobile-nav" ref={dropdownRef}>
        <button
          className={`lab-nav-trigger${dropdownOpen ? ' lab-nav-trigger--open' : ''}`}
          onClick={() => setDropdownOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span>{activeLabel}</span>
          <ChevronDown size={13} className="lab-nav-chevron" />
        </button>
        {dropdownOpen && (
          <div className="lab-nav-dropdown" role="listbox">
            {ALL_ITEMS.map(item => (
              <button
                key={item.id}
                role="option"
                aria-selected={activeId === item.id}
                className={`lab-nav-dropdown__item${activeId === item.id ? ' lab-nav-dropdown__item--active' : ''}`}
                onClick={() => {
                  setActiveId(item.id)
                  navigate(`/lab/${item.id}`)
                  setDropdownOpen(false)
                }}
              >
                <span className="lab-nav-dropdown__dot" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="lab-sidebar"
        aria-label="Demo navigation"
        ref={sidebarRef}
      >

        {/* Logo + close */}
        <div className="lab-logo">
          <FlaskConical size={14} aria-hidden="true" />
          Lab
          <button
            className="lab-close"
            onClick={() => navigate('/')}
            aria-label="Close lab"
            data-tooltip="Close lab"
          >
            <X size={13} />
          </button>
        </div>

        <div className="lab-sidebar__divider" />

        {SIDEBAR_GROUPS.map(({ group, items }) => (
          <div key={group} className="lab-sidebar__group" role="tablist" aria-orientation="vertical" aria-label={group}>
            <div className="lab-sidebar__group-label" aria-hidden="true">{group}</div>
            {items.map(item => (
              <div key={item.id}>
                <button
                  id={`lab-tab-${item.id}`}
                  data-id={item.id}
                  role="tab"
                  aria-selected={activeId === item.id}
                  tabIndex={activeId === item.id ? 0 : -1}
                  className={`lab-sidebar__item${activeId === item.id ? ' lab-sidebar__item--active' : ''}`}
                  onClick={() => {
                    setActiveId(item.id)
                    navigate(`/lab/${item.id}`)
                  }}
                  onKeyDown={e => handleSidebarKey(e, item.id)}
                  aria-label={item.label}
                >
                  <span className="lab-sidebar__dot" aria-hidden="true" />
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <main
        className="lab-main"
        role="tabpanel"
        aria-labelledby={`lab-tab-${activeId}`}
        style={consoleOpen ? { paddingBottom: 260 } : undefined}
        aria-label="Demo content"
      >
        <header className="lab-main__header">
          <h1 className="lab-main__title">
            {activeLabel}
          </h1>
          <div className="lab-main__subtitle">{meta.subtitle}</div>
          <p className="lab-main__context">{meta.context}</p>
        </header>

        <div
          className="lab-main__demo"
          aria-live="polite"
          aria-label={`${activeLabel} demo`}
        >
          {getComponent(activeId)}
        </div>
      </main>

    </div>
  )
}

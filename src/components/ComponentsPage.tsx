import { useState, useEffect, useRef, useCallback } from 'react'
import { Wrench, X } from 'lucide-react'
import { useRouter } from '../contexts/RouterContext'
import { useConsole } from '../contexts/ConsoleContext'
import D3Demo               from './demos/D3Demo'
import D3DrilldownDemo      from './demos/D3DrilldownDemo'
import D3PivotDemo          from './demos/D3PivotDemo'
import D3DonutDemo          from './demos/D3DonutDemo'
import GridLayoutDemo       from './demos/GridLayoutDemo'

type DemoId = 'dataviz' | 'dashboard'
type D3Tab  = 'charts' | 'drilldown' | 'pivot' | 'donut'

interface SidebarItem {
  id:       DemoId
  tab:      D3Tab | null
  label:    string
  subtitle: string
  context:  string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'dataviz', tab: 'charts',
    label:    'Bar & Line Charts',
    subtitle: 'D3.js · Keyboard Nav · WCAG AA',
    context:  'Multi-series bar and line charts built as a reusable primitive at Apple — powering analytics dashboards across internal applications. Full keyboard navigation, ARIA live region updates, and WCAG AA contrast on every theme.',
  },
  {
    id: 'dataviz', tab: 'drilldown',
    label:    'Drill-Down Chart',
    subtitle: 'D3.js · ARIA Live · Breadcrumb',
    context:  'Hierarchical bar chart built for internal reporting at Apple — click any bar to drill into subcategories, with a breadcrumb trail to navigate back up. ARIA live regions announce each drill level so screen reader users follow every transition.',
  },
  {
    id: 'dataviz', tab: 'pivot',
    label:    'Pivot Table',
    subtitle: 'D3.js · ARIA Grid · Sortable',
    context:  'Dynamic pivot table with column sorting and collapsible groups — mirrors the data exploration tools used in Apple internal analytics. Implements ARIA grid pattern with full keyboard navigation across rows, columns, and sort controls.',
  },
  {
    id: 'dataviz', tab: 'donut',
    label:    'Donut Chart',
    subtitle: 'D3.js · ARIA Labels · Arc Tween',
    context:  'Animated donut chart with arc-tween transitions and hover-to-expand segments. Each segment carries a descriptive ARIA label with value and percentage — keyboard users and screen reader users get the same data as mouse users.',
  },
  {
    id: 'dashboard', tab: null,
    label:    'Dashboard Builder',
    subtitle: 'React Grid · Keyboard · Drag & Resize',
    context:  'The drag-and-resize grid pattern powering Report Studio — the dashboard builder I built and maintain at Apple. Panels are keyboard-moveable and resizable, with ARIA roles and live region updates so every layout change is announced.',
  },
]


function demoFromPath(path: string): DemoId {
  const q = path.indexOf('?')
  if (q === -1) return 'dataviz'
  const params = new URLSearchParams(path.slice(q))
  const id = params.get('demo') as DemoId
  return (id && (id === 'dataviz' || id === 'dashboard')) ? id : 'dataviz'
}

function tabFromPath(path: string): D3Tab {
  const q = path.indexOf('?')
  if (q === -1) return 'charts'
  const tab = new URLSearchParams(path.slice(q)).get('tab') as D3Tab
  const valid: D3Tab[] = ['charts', 'drilldown', 'pivot', 'donut']
  return (tab && valid.includes(tab)) ? tab : 'charts'
}

function activeIndexFromPath(path: string): number {
  const id  = demoFromPath(path)
  const tab = tabFromPath(path)
  if (id === 'dashboard') return SIDEBAR_ITEMS.findIndex(s => s.id === 'dashboard')
  const idx = SIDEBAR_ITEMS.findIndex(s => s.id === id && s.tab === tab)
  return idx >= 0 ? idx : 0
}

function D3TabPanel({ tab }: { tab: D3Tab }) {
  return (
    <div>
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 14px' }}>
        {tab === 'charts'    && <D3Demo />}
        {tab === 'drilldown' && <D3DrilldownDemo />}
        {tab === 'pivot'     && <D3PivotDemo />}
        {tab === 'donut'     && <D3DonutDemo />}
      </div>
    </div>
  )
}

export default function ComponentsPage() {
  const { navigate, path } = useRouter()
  const { consoleOpen } = useConsole()

  const [activeIdx, setActiveIdx] = useState<number>(() => activeIndexFromPath(path))

  useEffect(() => { setActiveIdx(activeIndexFromPath(path)) }, [path])

  const item    = SIDEBAR_ITEMS[activeIdx]
  const activeId  = item.id
  const activeTab = item.tab

  const sidebarRef = useRef<HTMLElement>(null)

  const handleSidebarKey = useCallback((e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % SIDEBAR_ITEMS.length
      setActiveIdx(next)
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${next}"]`)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length
      setActiveIdx(prev)
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${prev}"]`)?.focus()
    }
  }, [])

  return (
    <div className="lab-layout">

      <aside className="lab-sidebar" aria-label="Component navigation" ref={sidebarRef}>

        <div className="lab-logo">
          <Wrench size={14} aria-hidden="true" />
          UI Toolkit
          <button
            className="lab-close"
            onClick={() => navigate('/')}
            aria-label="Close"
            title="Back to portfolio"
          >
            <X size={13} />
          </button>
        </div>

        <div className="lab-sidebar__divider" />

        <div className="lab-sidebar__group" role="tablist" aria-orientation="vertical" aria-label="Components">
          <div className="lab-sidebar__group-label" aria-hidden="true">Components</div>
          {SIDEBAR_ITEMS.map((s, idx) => (
            <div key={`${s.id}-${s.tab ?? 'default'}`}>
              <button
                id={`comp-tab-${idx}`}
                data-idx={idx}
                role="tab"
                aria-selected={activeIdx === idx}
                tabIndex={activeIdx === idx ? 0 : -1}
                className={`lab-sidebar__item${activeIdx === idx ? ' lab-sidebar__item--active' : ''}`}
                onClick={() => setActiveIdx(idx)}
                onKeyDown={e => handleSidebarKey(e, idx)}
                aria-label={s.label}
              >
                <span className="lab-sidebar__dot" aria-hidden="true" />
                {s.label}
              </button>
            </div>
          ))}
        </div>

      </aside>

      <main
        className="lab-main"
        role="tabpanel"
        aria-labelledby={`comp-tab-${activeIdx}`}
        style={consoleOpen ? { paddingBottom: 260 } : undefined}
        aria-label="Component demo"
      >
        <header className="lab-main__header">
          <h1 className="lab-main__title">{item.label}</h1>
          <div className="lab-main__subtitle">{item.subtitle}</div>
          <p className="lab-main__context">{item.context}</p>
        </header>

        <div className="lab-main__demo" aria-live="polite">
          {activeId === 'dataviz' && activeTab && (
            <D3TabPanel tab={activeTab} />
          )}
          {activeId === 'dashboard' && <GridLayoutDemo />}
        </div>
      </main>

    </div>
  )
}

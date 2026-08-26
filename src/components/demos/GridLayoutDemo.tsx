import { useState, useEffect, useRef, useCallback } from 'react'
import ReactGridLayout, { type Layout } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { devLog } from '../../lib/devLog'

// ── Static data ────────────────────────────────────────────────────
const SPARKLINE  = [42, 58, 51, 67, 73, 68, 82, 79, 91, 88, 95, 103, 98, 112, 108, 128]
const BARS       = [65, 48, 72, 55, 88, 76, 91, 83]
const BAR_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M']

const TASKS_INIT = [
  { id: 1, text: 'Finalize API schema',  done: true  },
  { id: 2, text: 'Review PR #428',       done: true  },
  { id: 3, text: 'Deploy to staging',    done: false },
  { id: 4, text: 'Performance audit',    done: false },
  { id: 5, text: 'Update design tokens', done: false },
]

const STATUS_ROWS = [
  { name: 'API Gateway',  ok: true,  ms: 42  },
  { name: 'Database',     ok: true,  ms: 8   },
  { name: 'CDN',          ok: true,  ms: 2   },
  { name: 'Auth Service', ok: false, ms: 312 },
]

const FEED = [
  { icon: '🚀', text: 'Deployed v2.4.1',       time: '2m'  },
  { icon: '✅', text: 'All 148 tests passed',   time: '14m' },
  { icon: '🔀', text: 'Merged feature/auth',    time: '1h'  },
  { icon: '🐛', text: 'Fixed #902 memory leak', time: '3h'  },
  { icon: '📦', text: 'Released beta build',    time: '5h'  },
]

const DEFAULT_LAYOUT: Layout = [
  { i: 'revenue',  x: 0, y: 0, w: 5, h: 5, minW: 3, minH: 3 },
  { i: 'users',    x: 5, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'status',   x: 9, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'chart',    x: 5, y: 4, w: 4, h: 7, minW: 3, minH: 3 },
  { i: 'tasks',    x: 0, y: 5, w: 5, h: 6, minW: 2, minH: 3 },
  { i: 'activity', x: 9, y: 5, w: 3, h: 6, minW: 2, minH: 3 },
]

// Tablet: 2-column grid (6 cols)
const TABLET_LAYOUT: Layout = [
  { i: 'revenue',  x: 0, y: 0,  w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'users',    x: 3, y: 0,  w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'status',   x: 0, y: 5,  w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'chart',    x: 3, y: 4,  w: 3, h: 7, minW: 2, minH: 3 },
  { i: 'tasks',    x: 0, y: 10, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'activity', x: 3, y: 11, w: 3, h: 5, minW: 2, minH: 3 },
]

// Mobile: single-column stack (4 cols full width)
const MOBILE_LAYOUT: Layout = [
  { i: 'revenue',  x: 0, y: 0,  w: 4, h: 5, minW: 4, minH: 3 },
  { i: 'users',    x: 0, y: 5,  w: 4, h: 4, minW: 4, minH: 3 },
  { i: 'tasks',    x: 0, y: 9,  w: 4, h: 6, minW: 4, minH: 3 },
  { i: 'status',   x: 0, y: 15, w: 4, h: 5, minW: 4, minH: 3 },
  { i: 'chart',    x: 0, y: 20, w: 4, h: 6, minW: 4, minH: 3 },
  { i: 'activity', x: 0, y: 26, w: 4, h: 6, minW: 4, minH: 3 },
]

function getBreakpoint(w: number) {
  if (w < 480) return 'mobile'
  if (w < 768) return 'tablet'
  return 'desktop'
}

function getColsForBreakpoint(bp: string) {
  if (bp === 'mobile') return 4
  if (bp === 'tablet') return 6
  return 12
}

function getDefaultLayout(bp: string): Layout {
  if (bp === 'mobile') return MOBILE_LAYOUT
  if (bp === 'tablet') return TABLET_LAYOUT
  return DEFAULT_LAYOUT
}

const WIDGET_TITLES: Record<string, string> = {
  revenue: 'Revenue', users: 'Active Users', status: 'System Health',
  chart: 'Weekly Requests', tasks: 'Sprint Tasks', activity: 'Activity',
}

// ── Sub-components ─────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data), max = Math.max(...data)
  const trend = data[data.length - 1] > data[0] ? 'upward' : 'downward'
  const W = 200, H = 36
  const plotW = W - 22          // reserve right space for the label
  const py = (v: number) => H - ((v - min) / (max - min || 1)) * H * 0.78
  const lastPy  = py(data[data.length - 1])
  const labelTop = `${(lastPy / H * 100).toFixed(1)}%`

  const pts  = data.map((v, i) => `${(i / (data.length - 1)) * plotW},${py(v)}`).join(' ')
  const area = 'M' + data.map((v, i) => `${(i / (data.length - 1)) * plotW},${py(v)}`).join('L')
    + ` L${plotW},${H} L0,${H}Z`

  return (
    <div style={{ position: 'relative', width: '100%', height: 36, flexShrink: 0 }}
      tabIndex={0} role="img"
      aria-label={`Revenue sparkline: ${trend} trend over ${data.length} periods, latest ${data[data.length - 1]}K`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <title>Revenue trend sparkline</title>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sg)" />
        <polyline points={pts} fill="none" stroke="var(--accent)"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {/* Label aligned to line endpoint height — outside SVG to avoid distortion */}
      <span aria-hidden="true" style={{
        position: 'absolute', right: 2, top: labelTop,
        transform: 'translateY(-50%)',
        fontSize: '0.625rem', fontWeight: 600, lineHeight: 1,
        color: 'var(--accent)', fontFamily: 'var(--font)',
        pointerEvents: 'none',
      }}>{data[data.length - 1]}K</span>
    </div>
  )
}

function MiniBar({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data)
  const W = data.length * 28, H = 60
  const lastV = data[data.length - 1]
  const lastBarH = (lastV / max) * (H - 14)
  const lastX = (data.length - 1) * 28 + 14  // center x of last bar in viewBox units
  // convert to % for absolute positioning
  const lastLabelLeft = `${(lastX / W * 100).toFixed(1)}%`

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img" tabIndex={0}
        aria-label={`Weekly requests: ${labels.map((l, i) => `${l} ${data[i]}K`).join(', ')}`}
      >
        <title>Weekly requests bar chart</title>
        {data.map((v, i) => {
          const barH   = (v / max) * (H - 14)
          const x      = i * 28 + 3
          const isLast = i === data.length - 1
          return (
            <g key={i}>
              <rect x={x} y={H - barH - 13} width={22} height={barH} rx={3}
                fill={isLast ? 'var(--accent)' : 'var(--accent-mid)'} />
              <text x={x + 11} y={H - 1} textAnchor="middle"
                fontSize={6} fill="var(--text-3)" fontFamily="var(--font)">{labels[i]}</text>
            </g>
          )
        })}
      </svg>
      {/* Latest bar value as HTML label — avoids SVG scaling distortion */}
      <span aria-hidden="true" style={{
        position: 'absolute',
        left: lastLabelLeft,
        bottom: `${(14 + lastBarH) / H * 100 + 2}%`,
        transform: 'translateX(-50%)',
        fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
        color: 'var(--accent)', fontFamily: 'var(--font)',
        pointerEvents: 'none',
      }}>{lastV}K</span>
    </div>
  )
}

// Enter on header → focus first body element · Escape inside body → return to header
function Widget({
  title, children, tabIndex, onFocus, onBlur, onMoveResize, focused,
}: {
  title: string; children: React.ReactNode
  tabIndex?: number; focused?: boolean
  onFocus?: () => void; onBlur?: () => void
  onMoveResize?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef   = useRef<HTMLDivElement>(null)

  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const body = bodyRef.current
      if (!body) return
      const first = body.querySelector<HTMLElement>(
        '[tabindex="0"]:not([disabled]), button:not([disabled]), input:not([disabled]), a[href]'
      )
      if (first) { first.focus(); return }
      body.tabIndex = -1
      body.focus()
    } else {
      onMoveResize?.(e)
    }
  }

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      headerRef.current?.focus()
    }
  }

  return (
    <div className={`rgl-widget${focused ? ' rgl-widget--focused' : ''}`}>
      <div
        ref={headerRef}
        className="rgl-widget__header"
        tabIndex={tabIndex}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleHeaderKeyDown}
        aria-label={`${title} panel — Tab to focus, Enter to read contents, arrow keys to move, Shift+arrows to resize`}
      >
        <span className="rgl-widget__title">{title}</span>
        <span className="rgl-widget__grip" aria-hidden="true">⠿</span>
        <span className="rgl-widget__kbd-hint" aria-hidden="true">
          ↑↓←→ move · ⇧+arrows resize · Enter read
        </span>
      </div>
      <div ref={bodyRef} className="rgl-widget__body" onKeyDown={handleBodyKeyDown}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function GridLayoutDemo() {
  const [gridKey,      setGridKey]      = useState(0)
  const [layout,       setLayout]       = useState<Layout>(DEFAULT_LAYOUT)
  const [tasks,        setTasks]        = useState(TASKS_INIT)
  const [width,        setWidth]        = useState(800)
  const [isDragging,   setIsDragging]   = useState(false)
  const [focusedId,    setFocusedId]    = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const breakpoint = getBreakpoint(width)
  const cols       = getColsForBreakpoint(breakpoint)
  const isMobile   = breakpoint === 'mobile'

  const moveWidget = useCallback((id: string, dx: number, dy: number) => {
    setLayout(prev => prev.map(item => {
      if (item.i !== id) return item
      const newX = Math.max(0, Math.min(12 - item.w, item.x + dx))
      const newY = Math.max(0, item.y + dy)
      if (newX === item.x && newY === item.y) return item
      setAnnouncement(`${WIDGET_TITLES[id] ?? id} moved to column ${newX + 1}, row ${newY + 1}`)
      return { ...item, x: newX, y: newY }
    }))
  }, [])

  const resizeWidget = useCallback((id: string, dw: number, dh: number) => {
    setLayout(prev => prev.map(item => {
      if (item.i !== id) return item
      const newW = Math.max(item.minW ?? 2, Math.min(12 - item.x, item.w + dw))
      const newH = Math.max(item.minH ?? 2, item.h + dh)
      if (newW === item.w && newH === item.h) return item
      setAnnouncement(`${WIDGET_TITLES[id] ?? id} resized to ${newW} columns, ${newH} rows`)
      return { ...item, w: newW, h: newH }
    }))
  }, [])

  const handleWidgetKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.shiftKey) {
      if      (e.key === 'ArrowRight') resizeWidget(id,  1,  0)
      else if (e.key === 'ArrowLeft')  resizeWidget(id, -1,  0)
      else if (e.key === 'ArrowDown')  resizeWidget(id,  0,  1)
      else if (e.key === 'ArrowUp')    resizeWidget(id,  0, -1)
    } else {
      if      (e.key === 'ArrowRight') moveWidget(id,  1,  0)
      else if (e.key === 'ArrowLeft')  moveWidget(id, -1,  0)
      else if (e.key === 'ArrowDown')  moveWidget(id,  0,  1)
      else if (e.key === 'ArrowUp')    moveWidget(id,  0, -1)
    }
  }, [moveWidget, resizeWidget])

  useEffect(() => { setLayout([...DEFAULT_LAYOUT]) }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      // Remounting the grid (via gridKey) while a drag is in-flight tears down
      // react-grid-layout's internal drag state mid-gesture, so its onDragStop
      // fires with a null event object — skip the reset until the drag ends.
      if (isDraggingRef.current) return
      const w = e.contentRect.width
      setWidth(w)
      // Switch layout when crossing breakpoints
      setLayout(getDefaultLayout(getBreakpoint(w)))
      setGridKey(k => k + 1)
    })
    ro.observe(el)
    const initW = el.offsetWidth
    setWidth(initW)
    setLayout(getDefaultLayout(getBreakpoint(initW)))
    return () => ro.disconnect()
  }, [])

  const toggle = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    const task = tasks.find(t => t.id === id)
    if (task) devLog('SYSTEM', `user ${task.done ? 'unchecked' : 'checked'} task → "${task.text}"`)
  }

  const handleReset = () => {
    setLayout(getDefaultLayout(breakpoint))
    setGridKey(k => k + 1)
    devLog('SYSTEM', 'user reset dashboard layout to default')
  }

  const kbdStyle: React.CSSProperties = {
    fontSize: '0.625rem', padding: '1px 4px',
    border: '1px solid var(--border)', borderRadius: 3,
  }

  return (
    <div className={`rgl-demo${isDragging ? ' is-dragging' : ''}`} ref={containerRef}>
      <div className="rgl-demo__bar">
        <span className="rgl-demo__hint">
          <kbd style={kbdStyle}>Tab</kbd> header ·{' '}
          <kbd style={kbdStyle}>Enter</kbd> read contents ·{' '}
          <kbd style={kbdStyle}>↑↓←→</kbd> move ·{' '}
          <kbd style={kbdStyle}>⇧+arrows</kbd> resize ·{' '}
          <kbd style={kbdStyle}>Esc</kbd> back to header
        </span>
        <button className="rgl-demo__reset" onClick={handleReset}>↺ Reset</button>
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <ReactGridLayout
        key={gridKey}
        layout={layout}
        width={width}
        cols={cols}
        rowHeight={36}
        compactType={null}
        margin={[10, 10]}
        containerPadding={[0, 0]}
        onLayoutChange={l => setLayout([...l])}
        onDragStart={() => { setIsDragging(true); isDraggingRef.current = true }}
        onDragStop={(_layout, _oldItem, newItem) => {
          setIsDragging(false)
          isDraggingRef.current = false
          if (!newItem) return
          devLog('SYSTEM', `user dragged widget → "${newItem.i}" to (${newItem.x}, ${newItem.y})`)
        }}
        onResizeStop={(_layout, _oldItem, newItem) => {
          if (!newItem) return
          devLog('SYSTEM', `user resized widget → "${newItem.i}" to ${newItem.w}×${newItem.h}`)
        }}
        draggableHandle=".rgl-widget__header"
        resizeHandles={['se']}
        isDraggable={!isMobile}
        isResizable={!isMobile}
      >
        <div key="revenue">
          <Widget title="Revenue" tabIndex={0}
            focused={focusedId === 'revenue'}
            onFocus={() => setFocusedId('revenue')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'revenue')}
          >
            <div className="rgl-revenue">
              <div>
                <div className="rgl-big-num" tabIndex={0} aria-label="Revenue: $128,450">$128,450</div>
                <span className="rgl-badge up" tabIndex={0} aria-label="Revenue up 14.2% versus last month">↑ 14.2%</span>
                <div className="rgl-sub">vs last month</div>
              </div>
              <Sparkline data={SPARKLINE} />
            </div>
          </Widget>
        </div>

        <div key="users">
          <Widget title="Active Users" tabIndex={0}
            focused={focusedId === 'users'}
            onFocus={() => setFocusedId('users')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'users')}
          >
            <div className="rgl-stat-center">
              <div className="rgl-big-num" tabIndex={0} aria-label="24,821 active users">24,821</div>
              <span className="rgl-badge up" tabIndex={0} aria-label="Active users up 8.3%">↑ 8.3%</span>
              <div className="rgl-sub" tabIndex={0} aria-label="Online now: 1,204 users" style={{ marginTop: 4 }}>
                Online now: <strong>1,204</strong>
              </div>
            </div>
          </Widget>
        </div>

        <div key="status">
          <Widget title="System Health" tabIndex={0}
            focused={focusedId === 'status'}
            onFocus={() => setFocusedId('status')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'status')}
          >
            <div className="rgl-status-list" role="list" aria-label="System health status">
              {STATUS_ROWS.map(s => (
                <div key={s.name} className="rgl-status-row"
                  role="listitem" tabIndex={0}
                  aria-label={`${s.name}: ${s.ok ? 'operational' : 'degraded'}, response time ${s.ms} milliseconds`}
                >
                  <span className={`rgl-dot ${s.ok ? 'ok' : 'err'}`} aria-hidden="true" />
                  <span className="rgl-status-name">{s.name}</span>
                  <span className={`rgl-status-ms${s.ok ? '' : ' err'}`}>{s.ms}ms</span>
                </div>
              ))}
            </div>
          </Widget>
        </div>

        <div key="tasks">
          <Widget title="Sprint Tasks" tabIndex={0}
            focused={focusedId === 'tasks'}
            onFocus={() => setFocusedId('tasks')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'tasks')}
          >
            <ul className="rgl-tasks" role="list" aria-label="Sprint task checklist">
              {tasks.map(t => (
                <li key={t.id} className={`rgl-task${t.done ? ' done' : ''}`}
                  role="checkbox" aria-checked={t.done} tabIndex={0}
                  onClick={() => toggle(t.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(t.id) } }}
                >
                  <span className="rgl-task__check" aria-hidden="true">{t.done ? '✓' : ''}</span>
                  <span className="rgl-task__text">{t.text}</span>
                </li>
              ))}
            </ul>
          </Widget>
        </div>

        <div key="chart">
          <Widget title="Weekly Requests (K)" tabIndex={0}
            focused={focusedId === 'chart'}
            onFocus={() => setFocusedId('chart')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'chart')}
          >
            <div className="rgl-chart-wrap">
              <MiniBar data={BARS} labels={BAR_LABELS} />
            </div>
          </Widget>
        </div>

        <div key="activity">
          <Widget title="Activity" tabIndex={0}
            focused={focusedId === 'activity'}
            onFocus={() => setFocusedId('activity')} onBlur={() => setFocusedId(null)}
            onMoveResize={e => handleWidgetKey(e, 'activity')}
          >
            <ul className="rgl-feed" role="list" aria-label="Recent activity feed">
              {FEED.map((f, i) => (
                <li key={i} className="rgl-feed__row"
                  role="listitem" tabIndex={0}
                  aria-label={`${f.text}, ${f.time} ago`}
                >
                  <span className="rgl-feed__icon" aria-hidden="true">{f.icon}</span>
                  <span className="rgl-feed__text">{f.text}</span>
                  <span className="rgl-feed__time">{f.time}</span>
                </li>
              ))}
            </ul>
          </Widget>
        </div>
      </ReactGridLayout>
    </div>
  )
}

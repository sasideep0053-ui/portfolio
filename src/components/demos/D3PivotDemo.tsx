import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'

type SaleRow = {
  region: string; category: string; rep: string
  revenue: number; units: number; profit: number
}

type DimKey    = 'region' | 'category' | 'rep'
type MetricKey = 'revenue' | 'units' | 'profit'

const SALES: SaleRow[] = [
  { region: 'Americas', category: 'Electronics', rep: 'Alice',  revenue: 265000, units: 175, profit:  66000 },
  { region: 'Americas', category: 'Electronics', rep: 'Bob',    revenue: 210000, units: 133, profit:  52000 },
  { region: 'Americas', category: 'Clothing',    rep: 'Alice',  revenue:  65000, units: 210, profit:  16000 },
  { region: 'Americas', category: 'Clothing',    rep: 'Bob',    revenue:  55000, units: 180, profit:  13000 },
  { region: 'Americas', category: 'Software',    rep: 'Carol',  revenue: 175000, units: 110, profit:  88000 },
  { region: 'Europe',   category: 'Electronics', rep: 'David',  revenue: 313000, units: 206, profit:  78000 },
  { region: 'Europe',   category: 'Clothing',    rep: 'Eva',    revenue:  72000, units: 230, profit:  18000 },
  { region: 'Europe',   category: 'Clothing',    rep: 'Frank',  revenue:  60000, units: 195, profit:  15000 },
  { region: 'Europe',   category: 'Software',    rep: 'Frank',  revenue:  85000, units:  52, profit:  42000 },
  { region: 'Asia',     category: 'Electronics', rep: 'Grace',  revenue: 410000, units: 271, profit: 103000 },
  { region: 'Asia',     category: 'Electronics', rep: 'Hiro',   revenue: 115000, units:  76, profit:  29000 },
  { region: 'Asia',     category: 'Clothing',    rep: 'Hiro',   revenue:  80000, units: 260, profit:  20000 },
  { region: 'Asia',     category: 'Software',    rep: 'Ivy',    revenue: 240000, units: 150, profit: 120000 },
]

type PivotNode = {
  key: string; label: string; level: number
  revenue: number; units: number; profit: number
  children?: PivotNode[]
}

function buildTree(data: SaleRow[], dims: DimKey[], level: number, prefix: string): PivotNode[] {
  if (dims.length === 0) return []
  const [dim, ...rest] = dims
  return [...d3.group(data, r => r[dim]).entries()].map(([val, rows]) => {
    const key = `${prefix}/${val}`
    return {
      key, label: val, level,
      revenue: d3.sum(rows, r => r.revenue),
      units:   d3.sum(rows, r => r.units),
      profit:  d3.sum(rows, r => r.profit),
      children: rest.length ? buildTree(rows, rest, level + 1, key) : undefined,
    }
  })
}

function flatten(
  nodes: PivotNode[], expanded: Set<string>,
  sortKey: MetricKey, sortDir: 'asc' | 'desc',
): PivotNode[] {
  const sorted = [...nodes].sort((a, b) =>
    sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey],
  )
  const out: PivotNode[] = []
  for (const n of sorted) {
    out.push(n)
    if (n.children && expanded.has(n.key)) {
      out.push(...flatten(n.children, expanded, sortKey, sortDir))
    }
  }
  return out
}

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`

const DIM_LABELS:    Record<DimKey,    string> = { region: 'Region', category: 'Category', rep: 'Sales Rep' }
const METRIC_LABELS: Record<MetricKey, string> = { revenue: 'Revenue', units: 'Units', profit: 'Profit' }
const ALL_DIMS:    DimKey[]    = ['region', 'category', 'rep']
const ALL_METRICS: MetricKey[] = ['revenue', 'units', 'profit']

export default function D3PivotDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [rowDims,  setRowDims]  = useState<DimKey[]>(['region', 'category'])
  const [metrics,  setMetrics]  = useState<MetricKey[]>(['revenue', 'units', 'profit'])
  const [sortKey,  setSortKey]  = useState<MetricKey>('revenue')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['/Americas', '/Europe', '/Asia']),
  )

  const toggleExpand = (key: string) => setExpanded(s => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const toggleDim = (d: DimKey) => {
    setRowDims(prev => {
      if (prev.includes(d)) {
        if (prev.length === 1) return prev
        return prev.filter(x => x !== d)
      }
      return [...prev, d]
    })
    setExpanded(new Set())
  }

  const toggleMetric = (m: MetricKey) => setMetrics(prev =>
    prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m],
  )

  const toggleSort = (m: MetricKey) => {
    if (sortKey === m) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(m); setSortDir('desc') }
  }

  const tree = useMemo(() => buildTree(SALES, rowDims, 0, ''), [rowDims])
  const rows = useMemo(() => flatten(tree, expanded, sortKey, sortDir), [tree, expanded, sortKey, sortDir])

  const totals = { revenue: d3.sum(SALES, r => r.revenue), units: d3.sum(SALES, r => r.units), profit: d3.sum(SALES, r => r.profit) }

  const pill = (active: boolean) => ({
    padding: '4px 10px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 500,
    cursor: 'pointer' as const, fontFamily: 'var(--font)',
    background: active ? 'var(--accent-dim)' : 'var(--surface)',
    border: `1px solid ${active ? 'var(--accent-mid)' : 'var(--border)'}`,
    color: active ? accent : 'var(--text-2)',
  })

  return (
    <div>
      {/* ── Controls ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, alignItems: 'center' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Row Groups
          </span>
          {ALL_DIMS.map(d => {
            const order = rowDims.indexOf(d)
            return (
              <button key={d} onClick={() => toggleDim(d)} style={pill(order >= 0)}
                aria-pressed={order >= 0} title={order >= 0 ? `Level ${order + 1} — click to remove` : 'Add dimension'}
              >
                {order >= 0 && <span style={{ marginRight: 4, opacity: 0.65, fontSize: '0.625rem' }}>{order + 1}</span>}
                {DIM_LABELS[d]}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Columns
          </span>
          {ALL_METRICS.map(m => (
            <button key={m} onClick={() => toggleMetric(m)} style={pill(metrics.includes(m))} aria-pressed={metrics.includes(m)}>
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>

      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="a11y-wrap">
        <table className="a11y-table" role="treegrid" aria-label="Sales pivot table">
          <caption className="sr-only">
            Sales pivot table grouped by {rowDims.map(d => DIM_LABELS[d]).join(', then ')}.
            Sorted by {METRIC_LABELS[sortKey]}, {sortDir === 'desc' ? 'highest first' : 'lowest first'}.
            {rows.length} rows shown. Tab to navigate rows. Enter or Space to expand or collapse groups.
            Column header buttons change sort order.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                {rowDims.map(d => DIM_LABELS[d]).join(' › ')}
              </th>
              {metrics.map(m => (
                <th key={m} scope="col"
                  aria-sort={sortKey === m ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  style={{ textAlign: 'right', padding: 0 }}
                >
                  <button
                    onClick={() => toggleSort(m)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'inherit', font: 'inherit', fontWeight: 600,
                      padding: '8px 12px', width: '100%', textAlign: 'right',
                    }}
                    aria-label={`Sort by ${METRIC_LABELS[m]}${sortKey === m ? `, currently ${sortDir === 'desc' ? 'descending' : 'ascending'}, click to reverse` : ''}`}
                  >
                    {METRIC_LABELS[m]}{sortKey === m ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map(node => {
              const hasChildren = !!node.children
              const isOpen      = expanded.has(node.key)
              const metricDesc  = metrics
                .map(m => `${METRIC_LABELS[m]}: ${m === 'units' ? node.units.toLocaleString() : fmtMoney(node[m])}`)
                .join(', ')
              const rowLabel = hasChildren
                ? `${node.label} subtotal, ${isOpen ? 'expanded' : 'collapsed'}, ${metricDesc}`
                : `${node.label}, ${metricDesc}`
              return (
                <tr key={node.key}
                  tabIndex={0}
                  aria-level={node.level + 1}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  aria-label={rowLabel}
                  style={{ background: hasChildren ? 'rgba(255,255,255,0.03)' : undefined }}
                  onKeyDown={e => {
                    if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      toggleExpand(node.key)
                    }
                  }}
                >
                  <th scope="row" style={{ paddingLeft: node.level * 22 + 12, fontWeight: hasChildren ? 600 : 400 }}>
                    {hasChildren
                      ? <button
                          onClick={() => toggleExpand(node.key)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.label}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: '0.75rem', marginRight: 6, padding: 0, lineHeight: 1 }}
                        >
                          {isOpen ? '▾' : '▸'}
                        </button>
                      : <span style={{ display: 'inline-block', width: 18 }} aria-hidden="true" />
                    }
                    <span style={{ fontWeight: hasChildren ? 600 : 400, color: hasChildren ? accent : 'var(--text)' }}>
                      {node.label}
                    </span>
                    {hasChildren && (
                      <span style={{ marginLeft: 8, fontSize: '0.625rem', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                        subtotal
                      </span>
                    )}
                  </th>
                  {metrics.map(m => (
                    <td key={m} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: hasChildren ? 600 : 400 }}>
                      {m === 'units' ? node.units.toLocaleString() : fmtMoney(node[m])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr>
              <td style={{ paddingLeft: 12, fontWeight: 700 }}>Grand Total</td>
              {metrics.map(m => (
                <td key={m} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {m === 'units' ? totals.units.toLocaleString() : fmtMoney(totals[m])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="a11y-note" style={{ marginTop: 10 }}>
        Toggle row groups (numbered by nesting order) · click column headers to sort · ▸ to expand
      </p>
    </div>
  )
}

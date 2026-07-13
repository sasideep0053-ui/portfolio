import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'

// Multi-level drilldown: Continents → Countries → Olympic year history
type Row = { label: string; gold: number; silver: number; bronze: number; total: number }

const CONTINENT_DATA: Row[] = [
  { label: 'Europe',   gold: 63, silver: 75, bronze: 79, total: 217 },
  { label: 'Asia',     gold: 73, silver: 48, bronze: 47, total: 168 },
  { label: 'Americas', gold: 52, silver: 58, bronze: 63, total: 173 },
  { label: 'Oceania',  gold: 28, silver: 26, bronze: 19, total:  73 },
]

const COUNTRY_DATA: Record<string, Row[]> = {
  Europe: [
    { label: 'France',        gold: 16, silver: 26, bronze: 22, total: 64 },
    { label: 'Great Britain', gold: 14, silver: 22, bronze: 29, total: 65 },
    { label: 'Netherlands',   gold: 15, silver:  7, bronze: 12, total: 34 },
    { label: 'Italy',         gold: 12, silver: 13, bronze: 15, total: 40 },
    { label: 'Germany',       gold: 12, silver: 13, bronze:  8, total: 33 },
    { label: 'Hungary',       gold:  6, silver:  7, bronze:  6, total: 19 },
  ],
  Americas: [
    { label: 'USA',    gold: 40, silver: 44, bronze: 42, total: 126 },
    { label: 'Canada', gold:  9, silver:  7, bronze: 11, total:  27 },
    { label: 'Brazil', gold:  3, silver:  7, bronze: 10, total:  20 },
  ],
  Asia: [
    { label: 'China',       gold: 40, silver: 27, bronze: 24, total: 91 },
    { label: 'Japan',       gold: 20, silver: 12, bronze: 13, total: 45 },
    { label: 'South Korea', gold: 13, silver:  9, bronze: 10, total: 32 },
  ],
  Oceania: [
    { label: 'Australia',   gold: 18, silver: 19, bronze: 16, total: 53 },
    { label: 'New Zealand', gold: 10, silver:  7, bronze:  3, total: 20 },
  ],
}

const YEAR_DATA: Record<string, Row[]> = {
  USA: [
    { label: '2024', gold: 40, silver: 44, bronze: 42, total: 126 },
    { label: '2020', gold: 39, silver: 41, bronze: 33, total: 113 },
    { label: '2016', gold: 46, silver: 37, bronze: 38, total: 121 },
    { label: '2012', gold: 46, silver: 29, bronze: 29, total: 104 },
    { label: '2008', gold: 36, silver: 38, bronze: 36, total: 110 },
    { label: '2004', gold: 36, silver: 39, bronze: 26, total: 101 },
  ],
  China: [
    { label: '2024', gold: 40, silver: 27, bronze: 24, total:  91 },
    { label: '2020', gold: 38, silver: 32, bronze: 18, total:  88 },
    { label: '2016', gold: 26, silver: 18, bronze: 26, total:  70 },
    { label: '2012', gold: 38, silver: 27, bronze: 23, total:  88 },
    { label: '2008', gold: 51, silver: 21, bronze: 28, total: 100 },
    { label: '2004', gold: 32, silver: 17, bronze: 14, total:  63 },
  ],
  Japan: [
    { label: '2024', gold: 20, silver: 12, bronze: 13, total: 45 },
    { label: '2020', gold: 27, silver: 14, bronze: 17, total: 58 },
    { label: '2016', gold: 12, silver:  8, bronze: 21, total: 41 },
    { label: '2012', gold:  7, silver: 14, bronze: 17, total: 38 },
    { label: '2008', gold:  9, silver:  6, bronze: 10, total: 25 },
    { label: '2004', gold: 16, silver:  9, bronze: 12, total: 37 },
  ],
  Australia: [
    { label: '2024', gold: 18, silver: 19, bronze: 16, total: 53 },
    { label: '2020', gold: 17, silver:  7, bronze: 22, total: 46 },
    { label: '2016', gold:  8, silver: 11, bronze: 10, total: 29 },
    { label: '2012', gold:  7, silver: 16, bronze: 12, total: 35 },
    { label: '2008', gold: 14, silver: 15, bronze: 17, total: 46 },
    { label: '2004', gold: 17, silver: 16, bronze: 16, total: 49 },
  ],
}

const DRILLABLE = new Set([
  ...Object.keys(COUNTRY_DATA),
  ...Object.keys(YEAR_DATA),
])

const OLYMPICS_CITY: Record<string, string> = {
  '2024': 'Paris', '2020': 'Tokyo', '2016': 'Rio de Janeiro',
  '2012': 'London', '2008': 'Beijing', '2004': 'Athens',
}

function getLevel(path: string[]): { rows: Row[]; canDrill: boolean; title: string } {
  if (path.length === 0)
    return { rows: CONTINENT_DATA, canDrill: true, title: '2024 Olympics — All Continents' }
  if (path.length === 1)
    return {
      rows: COUNTRY_DATA[path[0]] ?? [],
      canDrill: (COUNTRY_DATA[path[0]] ?? []).some(r => YEAR_DATA[r.label]),
      title: `${path[0]} — Countries`,
    }
  return {
    rows: YEAR_DATA[path[1]] ?? [],
    canDrill: false,
    title: `${path[1]} — Olympic History`,
  }
}

export default function D3DrilldownDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const svgRef        = useRef<SVGSVGElement>(null)
  const wrapRef       = useRef<HTMLDivElement>(null)
  const focusLabelRef = useRef<string | null>(null)   // restore focus after drill
  const [path, setPath] = useState<string[]>([])
  const [highlighted, setHighlighted] = useState<'gold' | 'silver' | 'bronze' | null>(null)
  const { rows, canDrill, title } = getLevel(path)

  const drillIn = useCallback((label: string) => {
    focusLabelRef.current = label
    if (path.length === 0 && COUNTRY_DATA[label])   setPath([label])
    else if (path.length === 1 && YEAR_DATA[label]) setPath(p => [...p, label])
  }, [path])

  // Restore keyboard focus to the first bar after drilling in
  useEffect(() => {
    const label = focusLabelRef.current
    if (!label || !svgRef.current) return
    focusLabelRef.current = null
    // Give D3 time to render then focus first drillable bar
    requestAnimationFrame(() => {
      const firstBar = svgRef.current?.querySelector<SVGRectElement>('rect[tabindex="0"]')
      firstBar?.focus()
    })
  }, [path])

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return
    const el  = svgRef.current
    const tip = d3.select(wrapRef.current).select<HTMLDivElement>('.d3-tooltip')

    const showTip = (event: MouseEvent, html: string) => {
      const rect = wrapRef.current!.getBoundingClientRect()
      const tipNode = tip.style('display', 'block').html(html).node() as HTMLDivElement
      const tipW = tipNode.offsetWidth
      const x = event.clientX - rect.left
      const left = x + 14 + tipW > rect.width ? x - tipW - 10 : x + 14
      tip.style('left', `${left}px`).style('top', `${event.clientY - rect.top - 10}px`)
    }
    const showTipAtEl = (el: Element, html: string) => {
      const elRect   = el.getBoundingClientRect()
      const wrapRect = wrapRef.current!.getBoundingClientRect()
      const x = elRect.right - wrapRect.left
      const y = elRect.top + elRect.height / 2 - wrapRect.top
      const node = tip.style('display', 'block').html(html).node() as HTMLDivElement
      const tipW = node.offsetWidth
      const left = x + 14 + tipW > wrapRect.width ? x - tipW - elRect.width - 24 : x + 14
      tip.style('left', `${left}px`).style('top', `${y - 10}px`)
    }
    const moveTip = (event: MouseEvent) => {
      const rect = wrapRef.current!.getBoundingClientRect()
      const tipW = (tip.node() as HTMLDivElement).offsetWidth
      const x = event.clientX - rect.left
      const left = x + 14 + tipW > rect.width ? x - tipW - 10 : x + 14
      tip.style('left', `${left}px`).style('top', `${event.clientY - rect.top - 10}px`)
    }
    const hideTip = () => tip.style('display', 'none')

    d3.select(el).selectAll('*').remove()
    d3.select(el).append('title').text(`Drill-down bar chart: ${title}`)

    const W  = el.clientWidth || 520
    const bH = 36
    const H  = rows.length * (bH + 10) + 52
    const m  = { top: 12, right: 56, bottom: 20, left: 120 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    const maxVal = d3.max(rows, d => d.total) ?? 1
    const y = d3.scaleBand().domain(rows.map(d => d.label)).range([0, iH]).padding(0.28)
    const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, iW])

    const g = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('height', H)
      .append('g').attr('transform', `translate(${m.left},${m.top})`)

    g.append('g').call(d3.axisTop(x).ticks(4).tickSize(-iH).tickFormat(() => ''))
      .call(gg => gg.select('.domain').remove())
      .call(gg => gg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.04)'))

    const STACK: { key: keyof Row; fill: string; label: string }[] = [
      { key: 'bronze', fill: 'rgba(255,255,255,0.18)', label: 'Bronze' },
      { key: 'silver', fill: 'rgba(255,255,255,0.45)', label: 'Silver' },
      { key: 'gold',   fill: accent,                   label: 'Gold'   },
    ]

    const isDrillable = path.length < 2

    rows.forEach((d, i) => {
      let xOff = 0
      // First bar segment per row acts as the keyboard drill target
      STACK.forEach(({ key, fill }, stackIdx) => {
        const w = x(d[key] as number)
        const dimmed = highlighted !== null && highlighted !== key
        const canDrill = isDrillable && DRILLABLE.has(d.label)

        const city = path.length === 2 ? (OLYMPICS_CITY[d.label] ?? '') : ''
        const tipHeader = city
          ? `<strong>${d.label}</strong> <span style="color:var(--text-3);font-size:0.75rem">${city} Olympics</span>`
          : `<strong>${d.label}</strong>`
        const tipHtml = `${tipHeader}<br/>🥇 Gold: ${d.gold} &nbsp;🥈 Silver: ${d.silver} &nbsp;🥉 Bronze: ${d.bronze}<br/><span style="color:var(--text-3)">Total: ${d.total}</span>`

        const bar = g.append('rect')
          .attr('y', y(d.label)!).attr('height', y.bandwidth()).attr('x', xOff).attr('rx', 3)
          .attr('fill', fill).attr('width', 0)
          .style('opacity', dimmed ? 0.12 : 1)
          .style('cursor', canDrill && stackIdx === 0 ? 'pointer' : 'default')
          .attr('aria-label', canDrill && stackIdx === 0
            ? `${d.label} — Press Enter to drill in. Gold: ${d.gold}, Silver: ${d.silver}, Bronze: ${d.bronze}, Total: ${d.total}`
            : `${d.label} — ${key}: ${d[key as keyof Row]}, total: ${d.total}`)

        // Only the first (gold) bar per row is the keyboard drill trigger
        if (stackIdx === 0) {
          bar
            .attr('tabindex', 0)
            .attr('role', canDrill ? 'button' : 'img')
            .attr('data-label', d.label)
        }

        bar
          .on('mouseover', (event) => { showTip(event, tipHtml) })
          .on('mousemove', moveTip)
          .on('mouseleave', hideTip)
          .on('focus', function() { showTipAtEl(this as Element, tipHtml) })
          .on('blur', hideTip)
          .on('click', () => { if (canDrill) drillIn(d.label) })
          .on('keydown', (e) => {
            if (canDrill && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              drillIn(d.label)
            }
          })
          .transition().duration(500).delay(i * 55).attr('width', w)
        xOff += w
      })

      g.append('text')
        .attr('x', x(d.total) + 7).attr('y', y(d.label)! + y.bandwidth() / 2)
        .attr('dy', '0.35em').attr('fill', 'var(--text-3)').attr('font-size', 12)
        .attr('font-family', 'Inter, sans-serif').text(d.total)
        .style('opacity', 0).transition().duration(350).delay(i * 55 + 420).style('opacity', 1)
    })

    g.append('g').call(d3.axisLeft(y))
      .call(gg => gg.select('.domain').remove())
      .call(gg => gg.selectAll('.tick line').remove())
      .call(gg => gg.selectAll<SVGTextElement, string>('text')
        .attr('fill', d => isDrillable && DRILLABLE.has(d) ? accent : 'var(--text-3)')
        .attr('font-size', 12).attr('font-family', 'Inter, sans-serif')
        .style('cursor', d => isDrillable && DRILLABLE.has(d) ? 'pointer' : 'default')
        .style('text-decoration', d => isDrillable && DRILLABLE.has(d) ? 'underline' : 'none')
        .attr('tabindex', d => isDrillable && DRILLABLE.has(d) ? 0 : null)
        .attr('role', d => isDrillable && DRILLABLE.has(d) ? 'button' : null)
        .attr('aria-label', d => isDrillable && DRILLABLE.has(d) ? `Drill into ${d}` : null)
        .on('click', (_e, d) => { if (isDrillable) drillIn(d) })
        .on('keydown', (e, d) => { if (isDrillable && DRILLABLE.has(d) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); drillIn(d) } })
      )
  }, [path, rows, drillIn, accent, highlighted])

  const LEGEND: { key: 'gold' | 'silver' | 'bronze'; color: string; label: string }[] = [
    { key: 'gold',   color: accent,                    label: 'Gold'   },
    { key: 'silver', color: 'rgba(255,255,255,0.45)',   label: 'Silver' },
    { key: 'bronze', color: 'rgba(255,255,255,0.18)',   label: 'Bronze' },
  ]

  return (
    <div>
      <nav className="drilldown-breadcrumb" aria-label="Drill-down navigation">
        <button
          className={`drill-crumb${path.length === 0 ? ' drill-crumb--active' : ''}`}
          onClick={() => setPath([])} disabled={path.length === 0}
        >All Continents</button>
        {path.map((seg, i) => (
          <span key={seg} style={{ display: 'contents' }}>
            <span className="drill-sep">›</span>
            <button
              className={`drill-crumb${i === path.length - 1 ? ' drill-crumb--active' : ''}`}
              onClick={() => setPath(path.slice(0, i + 1))}
            >{seg}</button>
          </span>
        ))}
      </nav>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '8px 0 14px' }}>
        <span style={{ color: 'var(--text-2)' }}>{title}</span>
        {canDrill && (
          <span style={{ marginLeft: 10, color: 'var(--accent)' }}>
            — Tab to a bar and press Enter to drill in
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }} ref={wrapRef}>
        <div className="d3-tooltip" />
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {title}. {rows.map(r => `${r.label}: ${r.gold} gold, ${r.silver} silver, ${r.bronze} bronze`).join('. ')}.
          {canDrill ? ' Tab to y-axis labels and press Enter to drill into subcategories.' : ''}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <svg ref={svgRef} style={{ width: '100%', display: 'block' }}
            role="img" aria-label={`Drill-down bar chart: ${title}`} />
        </div>
      </div>

      {/* Legend — centered, clickable to toggle highlight */}
      <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: '0.75rem', justifyContent: 'center' }}>
        {LEGEND.map(({ key, color, label }) => {
          const active = highlighted === key
          return (
            <button
              key={key}
              onClick={() => setHighlighted(h => h === key ? null : key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--text)' : 'var(--text-3)',
                fontFamily: 'var(--font)', fontSize: '0.75rem', padding: '2px 6px',
                borderRadius: 4,
                opacity: highlighted !== null && !active ? 0.4 : 1,
                transition: 'opacity 0.2s, color 0.2s',
              }}
              aria-pressed={active}
            >
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

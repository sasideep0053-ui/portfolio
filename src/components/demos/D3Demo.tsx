import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'

const MEDALS = [
  { country: 'USA',          gold: 40, silver: 44, bronze: 42 },
  { country: 'China',        gold: 40, silver: 27, bronze: 24 },
  { country: 'Japan',        gold: 20, silver: 12, bronze: 13 },
  { country: 'Australia',    gold: 18, silver: 19, bronze: 16 },
  { country: 'France',       gold: 16, silver: 26, bronze: 22 },
  { country: 'Netherlands',  gold: 15, silver:  7, bronze: 12 },
  { country: 'Great Britain',gold: 14, silver: 22, bronze: 29 },
  { country: 'South Korea',  gold: 13, silver:  9, bronze: 10 },
]

const USA_HISTORY = [
  { year: '2004', gold: 36, city: 'Athens'    },
  { year: '2008', gold: 36, city: 'Beijing'   },
  { year: '2012', gold: 46, city: 'London'    },
  { year: '2016', gold: 46, city: 'Rio'       },
  { year: '2020', gold: 39, city: 'Tokyo'     },
  { year: '2024', gold: 40, city: 'Paris'     },
]

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

type View = 'bar' | 'line' | 'table'

export default function D3Demo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const svgRef       = useRef<SVGSVGElement>(null)
  const wrapRef      = useRef<HTMLDivElement>(null)
  const [view, setView]       = useState<View>('bar')
  const [sortKey, setSortKey] = useState<'gold' | 'silver' | 'bronze'>('gold')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const sorted = [...MEDALS].sort((a, b) =>
    sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey],
  )

  const toggleSort = (col: typeof sortKey) => {
    if (sortKey === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(col); setSortDir('desc') }
  }

  useEffect(() => {
    if (view === 'table' || !svgRef.current || !wrapRef.current) return
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
    d3.select(el).append('title').text(
      view === 'bar'
        ? 'Bar chart: gold medals by country — 2024 Paris Olympics'
        : 'Line chart: USA gold medal count across six Olympics, 2004 to 2024'
    )

    const W = el.clientWidth || 520
    const H = 260
    const m = { top: 16, right: 52, bottom: 36, left: 130 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    const g = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${m.left},${m.top})`)

    if (view === 'bar') {
      const maxGold = d3.max(MEDALS, d => d.gold) ?? 1
      const x = d3.scaleLinear().domain([0, maxGold * 1.12]).range([0, iW])
      const y = d3.scaleBand().domain(MEDALS.map(d => d.country)).range([0, iH]).padding(0.3)

      g.append('g').call(d3.axisTop(x).ticks(5).tickSize(-iH).tickFormat(() => ''))
        .call(gg => gg.select('.domain').remove())
        .call(gg => gg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.04)'))

      const rects = g.selectAll('rect').data(MEDALS).join('rect')
        .attr('y', d => y(d.country)!).attr('height', y.bandwidth()).attr('rx', 4)
        .attr('fill', accent).attr('x', 0).attr('width', 0)
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', d => `${d.country}: ${d.gold} gold medals`)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill', hexToRgba(accent, 0.75))
          showTip(event, `<strong>${d.country}</strong> <span style="color:var(--text-3);font-size:0.75rem">2024 Paris</span><br/>🥇 Gold medals: ${d.gold}`)
        })
        .on('mousemove', moveTip)
        .on('mouseleave', function() { d3.select(this).attr('fill', accent); hideTip() })
        .on('focus', function(_, d) {
          d3.select(this).attr('fill', hexToRgba(accent, 0.75))
          showTipAtEl(this as Element, `<strong>${d.country}</strong> <span style="color:var(--text-3);font-size:0.75rem">2024 Paris</span><br/>🥇 Gold medals: ${d.gold}`)
        })
        .on('blur', function() { d3.select(this).attr('fill', accent); hideTip() })

      rects.transition().duration(600).delay((_, i) => i * 60).attr('width', d => x(d.gold))

      g.selectAll('.lbl').data(MEDALS).join('text').attr('class', 'lbl')
        .attr('x', d => x(d.gold) + 8).attr('y', d => y(d.country)! + y.bandwidth() / 2)
        .attr('dy', '0.35em').attr('fill', 'var(--text-3)').attr('font-size', 12)
        .attr('font-family', 'Inter, sans-serif').text(d => `${d.gold} G`)
        .style('opacity', 0).transition().duration(400).delay((_, i) => i * 60 + 400)
        .style('opacity', 1)

      g.append('g').call(d3.axisLeft(y))
        .call(gg => gg.select('.domain').remove())
        .call(gg => gg.selectAll('.tick line').remove())
        .call(gg => gg.selectAll('text').attr('fill', 'var(--text-3)').attr('font-size', 12)
          .attr('font-family', 'Inter, sans-serif'))

    } else {
      const x = d3.scalePoint().domain(USA_HISTORY.map(d => d.year)).range([0, iW]).padding(0.15)
      const y = d3.scaleLinear().domain([30, 50]).range([iH, 0])

      const area = d3.area<typeof USA_HISTORY[0]>()
        .x(d => x(d.year)!).y0(iH).y1(d => y(d.gold)).curve(d3.curveCatmullRom)
      g.append('path').datum(USA_HISTORY)
        .attr('fill', hexToRgba(accent, 0.12)).attr('d', area)

      const line = d3.line<typeof USA_HISTORY[0]>()
        .x(d => x(d.year)!).y(d => y(d.gold)).curve(d3.curveCatmullRom)
      const path = g.append('path').datum(USA_HISTORY)
        .attr('fill', 'none').attr('stroke', accent).attr('stroke-width', 2.5).attr('d', line)
      const len = (path.node() as SVGPathElement).getTotalLength()
      path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
        .transition().duration(900).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0)

      const circles = g.selectAll('circle').data(USA_HISTORY).join('circle')
        .attr('cx', d => x(d.year)!).attr('cy', d => y(d.gold)).attr('r', 0)
        .attr('fill', accent).attr('stroke', 'var(--card)').attr('stroke-width', 2)
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', d => `${d.year}: ${d.gold} gold medals`)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 7)
          showTip(event, `<strong>USA ${d.year}</strong> <span style="color:var(--text-3);font-size:0.75rem">${d.city} Olympics</span><br/>🥇 Gold medals: ${d.gold}`)
        })
        .on('mousemove', moveTip)
        .on('mouseleave', function() { d3.select(this).attr('r', 5); hideTip() })
        .on('focus', function(_, d) {
          d3.select(this).attr('r', 7)
          showTipAtEl(this as Element, `<strong>USA ${d.year}</strong> <span style="color:var(--text-3);font-size:0.75rem">${d.city} Olympics</span><br/>🥇 Gold medals: ${d.gold}`)
        })
        .on('blur', function() { d3.select(this).attr('r', 5); hideTip() })

      circles.transition().delay((_, i) => i * 80 + 500).attr('r', 5)

      g.selectAll('.lbl').data(USA_HISTORY).join('text').attr('class', 'lbl')
        .attr('x', d => x(d.year)!).attr('y', d => y(d.gold) - 12)
        .attr('text-anchor', 'middle').attr('fill', 'var(--text-3)').attr('font-size', 11)
        .attr('font-family', 'Inter, sans-serif').text(d => d.gold)
        .style('opacity', 0).transition().delay((_, i) => i * 80 + 700).style('opacity', 1)

      g.append('g').attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call(gg => gg.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
        .call(gg => gg.selectAll('text').attr('fill', 'var(--text-3)').attr('font-size', 11)
          .attr('font-family', 'Inter, sans-serif').attr('dy', '1.2em'))

      g.append('g').call(d3.axisLeft(y).ticks(4).tickSize(-iW))
        .call(gg => gg.select('.domain').remove())
        .call(gg => gg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-dasharray', '4,4'))
        .call(gg => gg.selectAll('text').attr('fill', 'var(--text-3)').attr('font-size', 11)
          .attr('font-family', 'Inter, sans-serif').attr('dx', '-0.5em'))
    }
  }, [view, accent])

  const tabs: { id: View; label: string }[] = [
    { id: 'bar',   label: 'Gold Medals' },
    { id: 'line',  label: 'USA History' },
    { id: 'table', label: 'Accessible Table' },
  ]

  const sortIcon = (col: typeof sortKey) =>
    sortKey === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  return (
    <div>
      <div className="demo-tabs" role="tablist" aria-label="Chart view selector">
        {tabs.map(t => (
          <button key={t.id} role="tab"
            className={`demo-tab${view === t.id ? ' active' : ''}`}
            onClick={() => setView(t.id)} aria-selected={view === t.id}
          >{t.label}</button>
        ))}
      </div>

      {view !== 'table' ? (
        <div className="d3-wrap" ref={wrapRef}>
          <p className="sr-only">
            {view === 'bar'
              ? 'Bar chart with 8 countries. Switch to the Accessible Table tab for full screen-reader navigation.'
              : 'Line chart with 6 data points. Switch to the Accessible Table tab for full screen-reader navigation.'}
          </p>
          <div className="d3-tooltip" />
          <svg ref={svgRef} style={{ width: '100%', height: '260px' }} role="img"
            aria-label={view === 'bar'
              ? 'Bar chart: gold medals by country — 2024 Paris Olympics'
              : 'Line chart: USA gold medal count across 6 Summer Olympics (2004–2024)'}
          />
        </div>
      ) : (
        <div className="a11y-wrap">
          <table className="a11y-table" role="table" aria-label="2024 Olympics medals — screen reader accessible">
            <caption className="sr-only">
              2024 Paris Olympics medal table, {sorted.length} countries.
              Sorted by {sortKey} medals, {sortDir === 'desc' ? 'highest first' : 'lowest first'}.
              Use column header buttons to change sort. Tab between rows to navigate data.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                {(['gold', 'silver', 'bronze'] as const).map(col => (
                  <th key={col} scope="col"
                    aria-sort={sortKey === col ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    tabIndex={0}
                    onClick={() => toggleSort(col)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(col) } }}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}{sortIcon(col)}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => (
                <tr key={d.country} tabIndex={0}>
                  <th scope="row">{d.country}</th>
                  <td>{d.gold}</td>
                  <td>{d.silver}</td>
                  <td>{d.bronze}</td>
                  <td><strong>{d.gold + d.silver + d.bronze}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="a11y-note" aria-live="polite">
            Click column headers to sort. All rows are keyboard-focusable (Tab key).
            Columns carry <code>aria-sort</code> indicators for screen readers.
          </p>
        </div>
      )}
    </div>
  )
}

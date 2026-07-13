import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'

const DATASETS: Record<string, { label: string; value: number }[]> = {
  browsers: [
    { label: 'Chrome',  value: 65.1 },
    { label: 'Safari',  value: 18.7 },
    { label: 'Edge',    value:  5.3 },
    { label: 'Firefox', value:  2.9 },
    { label: 'Other',   value:  8.0 },
  ],
  skills: [
    { label: 'React / TS', value: 35 },
    { label: 'Node / APIs', value: 25 },
    { label: 'Swift / iOS', value: 15 },
    { label: 'DevOps / CI', value: 15 },
    { label: 'Other',       value: 10 },
  ],
}

type DataKey = keyof typeof DATASETS
const VIEWS: { id: DataKey; label: string }[] = [
  { id: 'browsers', label: 'Browser Share' },
  { id: 'skills',   label: 'Skill Split' },
]

function buildPalette(accent: string, n: number): string[] {
  // parse hex accent into hsl, then spread n hues around the wheel
  const r = parseInt(accent.slice(1, 3), 16) / 255
  const g = parseInt(accent.slice(3, 5), 16) / 255
  const b = parseInt(accent.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return Array.from({ length: n }, (_, i) => {
    const hue = ((h * 360 + (i * 360) / n) % 360).toFixed(1)
    const sat = Math.max(40, s * 100 - i * 3).toFixed(1)
    const lit = Math.min(72, Math.max(38, l * 100 + (i % 2 === 0 ? 4 : -4))).toFixed(1)
    return `hsl(${hue},${sat}%,${lit}%)`
  })
}

export default function D3DonutDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent
  const [view, setView] = useState<DataKey>('browsers')

  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return

    const data = DATASETS[view]
    const palette = buildPalette(accent, data.length)
    const color = (i: number) => palette[i]

    const W = svg.clientWidth || 520
    const H = 280
    const cx = W * 0.38
    const cy = H / 2
    const outerR = Math.min(cx, cy) - 16
    const innerR = outerR * 0.55

    d3.select(svg).selectAll('*').remove()
    d3.select(svg).attr('viewBox', `0 0 ${W} ${H}`)
    d3.select(svg).append('title').text(
      view === 'browsers'
        ? 'Donut chart: browser market share 2024'
        : 'Donut chart: full-stack skill breakdown by category'
    )

    const tip = d3.select(wrap).select<HTMLDivElement>('.d3-tooltip')
    const showTipAt = (html: string, ox: number, oy: number) => {
      const svgRect  = svg.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      const absX = (svgRect.left - wrapRect.left) + cx + ox
      const absY = (svgRect.top  - wrapRect.top)  + cy + oy
      const node = tip.style('display', 'block').html(html).node() as HTMLDivElement
      const tipW = node.offsetWidth
      tip
        .style('left', `${absX + 14 + tipW > wrapRect.width ? absX - tipW - 10 : absX + 14}px`)
        .style('top',  `${absY - 10}px`)
    }
    const showTip = (event: MouseEvent, html: string) => {
      const rect = wrap.getBoundingClientRect()
      const node = tip.style('display', 'block').html(html).node() as HTMLDivElement
      const tipW = node.offsetWidth
      const x = event.clientX - rect.left
      tip
        .style('left', `${x + 14 + tipW > rect.width ? x - tipW - 10 : x + 14}px`)
        .style('top',  `${event.clientY - rect.top - 10}px`)
    }
    const moveTip = (event: MouseEvent) => {
      const rect = wrap.getBoundingClientRect()
      const tipW = (tip.node() as HTMLDivElement).offsetWidth
      const x = event.clientX - rect.left
      tip
        .style('left', `${x + 14 + tipW > rect.width ? x - tipW - 10 : x + 14}px`)
        .style('top',  `${event.clientY - rect.top - 10}px`)
    }
    const hideTip = () => tip.style('display', 'none')

    const pie = d3.pie<{ label: string; value: number }>()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.025)

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .cornerRadius(4)

    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(innerR)
      .outerRadius(outerR + 8)
      .cornerRadius(4)

    const g = d3.select(svg).append('g').attr('transform', `translate(${cx},${cy})`)

    const arcs = g.selectAll('path')
      .data(pie(data))
      .join('path')
      .attr('fill', (_, i) => color(i))
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 1.5)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', d => `${d.data.label}: ${d.data.value}%`)
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(150).attr('d', arcHover(d) ?? '')
        showTip(event,
          `<strong>${d.data.label}</strong><br/>` +
          `<span style="color:var(--text-2)">${d.data.value}%</span>`)
      })
      .on('mousemove', moveTip)
      .on('mouseleave', function(_, d) {
        d3.select(this).transition().duration(150).attr('d', arc(d) ?? '')
        hideTip()
      })
      .on('focus', function(_, d) {
        d3.select(this).transition().duration(150).attr('d', arcHover(d) ?? '')
        const [ox, oy] = arc.centroid(d)
        showTipAt(
          `<strong>${d.data.label}</strong><br/>` +
          `<span style="color:var(--text-2)">${d.data.value}%</span>`,
          ox, oy,
        )
      })
      .on('blur', function(_, d) {
        d3.select(this).transition().duration(150).attr('d', arc(d) ?? '')
        hideTip()
      })

    // arc tween on mount
    arcs.transition()
      .duration(700)
      .delay((_, i) => i * 60)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const interp = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d)
        return (t: number) => arc(interp(t)) ?? ''
      })

    // centre label
    g.append('text')
      .attr('text-anchor', 'middle').attr('dy', '-0.25em')
      .attr('fill', 'var(--text)').attr('font-size', 13)
      .attr('font-family', 'Inter, sans-serif').attr('font-weight', 600)
      .text(view === 'browsers' ? 'Browser' : 'Skills')
    g.append('text')
      .attr('text-anchor', 'middle').attr('dy', '1.1em')
      .attr('fill', 'var(--text-2)').attr('font-size', 11)
      .attr('font-family', 'Inter, sans-serif')
      .text('2024 share')

    // legend — single row per item: ■ Label  value%
    const legX      = cx * 2 + 12
    const legSpacing = 20
    const legG = d3.select(svg).append('g')
      .attr('transform', `translate(${legX}, ${cy - (data.length * legSpacing) / 2 + 4})`)

    data.forEach((d, i) => {
      const row = legG.append('g').attr('transform', `translate(0, ${i * legSpacing})`)
      row.append('rect')
        .attr('width', 10).attr('height', 10).attr('rx', 2)
        .attr('fill', color(i)).attr('y', -5)
      row.append('text')
        .attr('x', 16).attr('dy', '0.32em')
        .attr('fill', 'var(--text)').attr('font-size', 11)
        .attr('font-family', 'Inter, sans-serif')
        .text(`${d.label}`)
      row.append('text')
        .attr('x', 16).attr('dy', '0.32em')
        .attr('text-anchor', 'start')
        .attr('fill', 'var(--text-3)').attr('font-size', 11)
        .attr('font-family', 'Inter, sans-serif')
        .attr('x', 90)
        .text(`${d.value}%`)
    })
  }, [view, accent])

  return (
    <div>
      <div className="demo-tabs" role="tablist" aria-label="Donut chart dataset">
        {VIEWS.map(v => (
          <button key={v.id} role="tab"
            className={`demo-tab${view === v.id ? ' active' : ''}`}
            onClick={() => setView(v.id)}
            aria-selected={view === v.id}
          >{v.label}</button>
        ))}
      </div>

      <div className="d3-wrap" ref={wrapRef}>
        <div className="d3-tooltip" />
        <svg ref={svgRef} style={{ width: '100%', height: '280px' }} role="img"
          aria-label={view === 'browsers'
            ? 'Donut chart: browser market share 2024'
            : 'Donut chart: full-stack skill breakdown'}
        />
        <ul className="sr-only" aria-label={view === 'browsers' ? 'Browser market share data' : 'Skill breakdown data'}>
          {DATASETS[view].map(d => (
            <li key={d.label}>{d.label}: {d.value}%</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

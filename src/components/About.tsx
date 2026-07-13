import { useEffect, useRef, useState } from 'react'
import { User } from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { RESUME } from '../data/resume'
import { useNavSection } from '../hooks/useNavSection'

export default function About() {
  const { strings } = useLocale()
  const ref = useRef<HTMLElement>(null)
  const navRef = useNavSection<HTMLElement>('about')
  const [visible, setVisible] = useState(false)

  const setRefs = (el: HTMLElement | null) => {
    (ref as React.MutableRefObject<HTMLElement | null>).current = el
    ;(navRef as React.MutableRefObject<HTMLElement | null>).current = el
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.15 },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="about" ref={setRefs} className={`section fade-in${visible ? ' visible' : ''}`}>
      <div className="container">
        <div className="section__header">
          <span className="section__label">
            <User size={14} aria-hidden="true" />
            {strings.about.label}
          </span>
          <h2 className="section__title">
            {strings.about.title.split(' ').slice(0, -1).join(' ')}{' '}
            <span>{strings.about.title.split(' ').slice(-1)}</span>
          </h2>
        </div>

        <div className="about__grid">
          <div className="about__text">
            <p>
              Data-dense interfaces that have to be right, accessible, and
              built to last — analytics dashboards, real-time data pipelines,
              custom chart systems. Ten years across enterprise tooling,
              insurance analytics, and internal platforms at Apple.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { accent: true,  text: 'Full ownership — UX research, prototyping, architecture, and production.' },
                { accent: true,  text: 'Accessibility as a hard constraint: WCAG AA, keyboard nav, screen reader tested.' },
                { accent: false, text: 'Real-time systems: WebSocket, SSE, LLM token streaming, live telemetry.' },
              ].map(({ text, accent }) => (
                <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <span style={{ marginTop: '0.3rem', width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: accent ? 'var(--accent)' : 'var(--text-3)' }} aria-hidden="true" />
                  <span style={{ fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="about__stat-cards" role="list" aria-label="Key stats">
            {RESUME.stats.map(({ value, label }) => (
              <div key={label} className="about__stat-card" role="listitem" aria-label={`${value} ${label}`}>
                <span className="about__stat-card-value">{value}</span>
                <span className="about__stat-card-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

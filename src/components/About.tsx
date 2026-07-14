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
              Ten years building dashboards, analytics platforms, and
              enterprise tooling at Apple — data-dense interfaces that
              have to be right and accessible. Now applying that same
              rigor to AI products with streaming chat UX and RAG-backed
              retrieval, and to hardware-adjacent systems with live
              sensor telemetry and control-loop visualization.
            </p>
            <ul className="about__list">
              {[
                'Real-time AI interfaces: LLM token streaming over SSE, RAG-backed retrieval UIs, conversational UX.',
                'Hardware-adjacent UI: physics simulation, control-loop visualization (PID, G-force telemetry), sensor-driven dashboards.',
                'Full ownership — UX research, prototyping, architecture, and production.',
                'Accessibility as a hard constraint: WCAG AA, keyboard nav, screen reader tested.',
                'Outside of work: independently built and shipped FictaNode, an interactive fiction reading platform with puzzle-gated chapter progression, archetype badges, accounts, and payments, as a hobby.',
              ].map(text => (
                <li key={text} className="about__list-item">
                  <span className="about__list-dot" aria-hidden="true" />
                  <span className="about__list-text">{text}</span>
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

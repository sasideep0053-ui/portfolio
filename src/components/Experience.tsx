import { useEffect, useRef, useState } from 'react'
import { Briefcase } from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { RESUME } from '../data/resume'
import { useNavSection } from '../hooks/useNavSection'

export default function Experience() {
  const { strings } = useLocale()
  const ref = useRef<HTMLElement>(null)
  const navRef = useNavSection<HTMLElement>('experience')
  const [visible, setVisible] = useState(false)

  const setRefs = (el: HTMLElement | null) => {
    (ref as React.MutableRefObject<HTMLElement | null>).current = el
    ;(navRef as React.MutableRefObject<HTMLElement | null>).current = el
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.08 },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      id="experience"
      ref={setRefs}
      className={`section fade-in${visible ? ' visible' : ''}`}
    >
      <div className="container">
        <div className="section__header">
          <span className="section__label">
            <Briefcase size={14} aria-hidden="true" />
            {strings.exp.label}
          </span>
          <h2 className="section__title"><span>{strings.exp.title}</span></h2>
        </div>

        <div className={`experience__list${visible ? ' visible' : ''}`} role="list">
          {RESUME.experience.map(job => (
            <div key={job.period} className="exp-card" role="listitem">
              <div className="exp-card__header">
                <div>
                  <div className="exp-card__company">{job.company}</div>
                  {job.via && <div className="exp-card__via">{job.via}</div>}
                  <div className="exp-card__role">{job.role}</div>
                </div>
                <span
                  className={`exp-card__badge${job.current ? ' exp-card__badge--current' : ''}`}
                  aria-label={`${job.period}${job.current ? ', current role' : ''}`}
                >
                  {job.period}
                </span>
              </div>
              {job.bullets && job.bullets.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {job.bullets.map((bullet, bi) => (
                    <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                      <span style={{ marginTop: '0.35rem', width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent)' }} aria-hidden="true" />
                      <span className="exp-card__summary" style={{ margin: 0 }}>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : job.summary ? (
                <p className="exp-card__summary">{job.summary}</p>
              ) : null}
              {job.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {job.tags.map(tag => (
                    <span key={tag} style={{
                      fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                      letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 99,
                      background: 'var(--surface)', border: '1px solid var(--border-mid)',
                      color: 'var(--text-2)',
                    }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

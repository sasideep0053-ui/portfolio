import { useEffect, useRef, useState } from 'react'
import { Zap } from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { RESUME } from '../data/resume'
import { useNavSection } from '../hooks/useNavSection'

export default function Skills() {
  const { strings } = useLocale()
  const ref = useRef<HTMLElement>(null)
  const navRef = useNavSection<HTMLElement>('skills')
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
      id="skills"
      ref={setRefs}
      className={`section section--alt fade-in${visible ? ' visible' : ''}`}
    >
      <div className="container">
        <div className="section__header">
          <span className="section__label">
            <Zap size={14} aria-hidden="true" />
            {strings.skills.label}
          </span>
          <h2 className="section__title">
            {strings.skills.title.split('&')[0].trim()} &amp; <span>{strings.skills.title.split('&')[1]?.trim() ?? 'Tools'}</span>
          </h2>
        </div>

        <div
          className={`skills__list${visible ? ' visible' : ''}`}
          role="list"
          aria-label="Skills by proficiency"
        >
          {RESUME.skillTiers.map(({ level, description, items }, tierIdx) => (
            <div
              key={level}
              className="skill-row"
              role="listitem"
              style={{ '--row-delay': `${tierIdx * 90}ms` } as React.CSSProperties}
            >
              <div className="skill-row__header">
                <span className="skill-row__dot" aria-hidden="true" />
                <div>
                  <span className="skill-row__category">{level}</span>
                  {description && <span className="skill-row__tier-desc">{description}</span>}
                </div>
              </div>
              <div
                className="skill-row__tags"
                role="list"
                aria-label={`${level} skills`}
              >
                {items.map((item, tagIdx) => (
                  <span
                    key={item}
                    className={`skill-tag${tierIdx === 0 ? ' skill-tag--expert' : tierIdx === 2 ? ' skill-tag--familiar' : ''}`}
                    role="listitem"
                    style={{ '--tag-delay': `${tierIdx * 60 + tagIdx * 38}ms` } as React.CSSProperties}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


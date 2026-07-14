import { useEffect, useRef, useState } from 'react'
import { Mail, MapPin, Clock, Download, Github, Globe } from 'lucide-react'
import { useLocale } from '../contexts/LocaleContext'
import { RESUME } from '../data/resume'
import { useNavSection } from '../hooks/useNavSection'

export default function Contact() {
  const { strings } = useLocale()
  const ref = useRef<HTMLElement>(null)
  const navRef = useNavSection<HTMLElement>('contact')
  const [visible, setVisible] = useState(false)

  const setRefs = (el: HTMLElement | null) => {
    (ref as React.MutableRefObject<HTMLElement | null>).current = el
    ;(navRef as React.MutableRefObject<HTMLElement | null>).current = el
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.2 },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      id="contact"
      ref={setRefs}
      className={`section fade-in${visible ? ' visible' : ''}`}
    >
      <div className="container">
        <div className="section__header">
          <span className="section__label">
            <Mail size={14} aria-hidden="true" />
            {strings.contact.label}
          </span>
          <h2 className="section__title"><span>{strings.contact.title}</span></h2>
        </div>

        <div className="contact__inner" style={{ margin: 0, textAlign: 'left' }}>
          <div className="contact__availability">
            <span className="contact__avail-dot" aria-hidden="true" />
            <span className="contact__avail-text">Actively looking &mdash; frontend &middot; data viz &middot; real-time systems &middot; hardware-adjacent UI</span>
          </div>

          <div className="contact__meta" role="list">
            <a
              href={`mailto:${RESUME.email}`}
              className="contact__meta-item contact__meta-item--link"
              role="listitem"
              aria-label={`Email ${RESUME.email}`}
            >
              <Mail size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              {RESUME.email}
            </a>
            <span className="contact__meta-sep" aria-hidden="true">//</span>
            <span className="contact__meta-item" role="listitem">
              <MapPin size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              {RESUME.location}
            </span>
            <span className="contact__meta-sep" aria-hidden="true">//</span>
            <span className="contact__meta-item" role="listitem">
              <Clock size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              {RESUME.timezone}
            </span>
            <span className="contact__meta-sep" aria-hidden="true">//</span>
            <a
              href={`https://${RESUME.portfolio}`}
              className="contact__meta-item contact__meta-item--link"
              role="listitem"
              aria-label={`Portfolio ${RESUME.portfolio}`}
            >
              <Globe size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              {RESUME.portfolio}
            </a>
            <span className="contact__meta-sep" aria-hidden="true">//</span>
            <a
              href={RESUME.github}
              target="_blank"
              rel="noopener noreferrer"
              className="contact__meta-item contact__meta-item--link"
              role="listitem"
              aria-label="GitHub"
            >
              <Github size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              GitHub
            </a>
          </div>

          <a
            href={RESUME.resumePdf}
            download
            className="contact__resume-btn"
            aria-label="Download resume PDF"
          >
            <Download size={13} aria-hidden="true" />
            Download Resume
          </a>
        </div>
      </div>
    </section>
  )
}


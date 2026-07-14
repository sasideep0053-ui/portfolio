import { useEffect, useState } from 'react'
import { RESUME } from '../data/resume'
import { useNavigation } from '../contexts/NavigationContext'
import { useRouter } from '../contexts/RouterContext'
import MatrixPortrait from './MatrixPortrait'
import { devLog } from '../lib/devLog'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const parts = now.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')
  const tz    = parts[parts.length - 1] ?? 'PST'
  return `${time} ${tz}`
}

export default function Hero() {
  const { scrollTo } = useNavigation()
  const { navigate } = useRouter()
  const clock = useClock()

  useEffect(() => {
    devLog('SYSTEM', 'user session started — portfolio loaded')
  }, [])

  return (
    <section id="hero" className="hero" aria-label="Introduction">
      <div className="hero__content">
        <div className="hero__block">

          <div className="hero__sep" role="presentation" />

          <div className="hero__row">
            <span className="hero__key">[IDENT]</span>
            <h1 className="hero__name">{RESUME.name}</h1>
          </div>
          <div className="hero__row">
            <span className="hero__key">[ROLE]</span>
            <p className="hero__role">{RESUME.title}</p>
          </div>
          <div className="hero__row">
            <span className="hero__key">[LOC]</span>
            <p className="hero__loc">
              {RESUME.location} &mdash; <span className="hero__clock">{clock}</span>
            </p>
          </div>
          <div className="hero__row">
            <span className="hero__key">[EMAIL]</span>
            <a href={`mailto:${RESUME.email}`} className="hero__email-link">
              {RESUME.email}
            </a>
          </div>

          <div className="hero__sep" role="presentation" />

          <div className="hero__row">
            <span className="hero__key">[STACK]</span>
            <p className="hero__stack">{RESUME.stack.join(' // ')}</p>
          </div>

          <div className="hero__row hero__row--about">
            <span className="hero__key">[ABOUT]</span>
            <p className="hero__about">
              10 years building dashboards and analytics platforms — now
              focused on AI product interfaces and hardware-adjacent UI.
            </p>
          </div>

          <div className="hero__sep hero__sep--thin" role="presentation" />

          <div className="hero__actions">
            <button className="btn btn--secondary" onClick={() => scrollTo('lab')}>View Demos</button>
            <button className="btn btn--primary"   onClick={() => navigate('/lab')}>Open Lab →</button>
          </div>

        </div>
      </div>

      <div className="hero__portrait" aria-hidden="true">
        <MatrixPortrait src="/IMG_0163.webp" width={500} height={620} />
      </div>
    </section>
  )
}

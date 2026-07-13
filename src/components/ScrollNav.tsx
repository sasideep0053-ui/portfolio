import { useState } from 'react'
import { useNavigation } from '../contexts/NavigationContext'
import { useLocale } from '../contexts/LocaleContext'

const SECTIONS = [
  { id: 'about',      key: 'about'      },
  { id: 'skills',     key: 'skills'     },
  { id: 'experience', key: 'experience' },
  { id: 'lab',        key: 'lab'        },
  { id: 'contact',    key: 'contact'    },
]

export default function ScrollNav() {
  const { activeId, scrollTo } = useNavigation()
  const { strings } = useLocale()
  const [hovered, setHovered] = useState<string | null>(null)

  const labels: Record<string, string> = {
    about:      strings.nav.about,
    skills:     strings.nav.skills,
    experience: strings.nav.experience,
    lab:        strings.nav.lab,
    contact:    strings.nav.contact,
  }

  return (
    <nav className="scroll-nav" aria-label="Page sections">
      <ul className="scroll-nav__list" role="list">
        {SECTIONS.map(({ id }) => {
          const isActive  = activeId === id
          const isHovered = hovered === id
          return (
            <li key={id} className="scroll-nav__item"
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                className={`scroll-nav__btn${isActive ? ' active' : ''}`}
                onClick={() => scrollTo(id)}
                aria-label={labels[id]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`scroll-nav__label${isActive || isHovered ? ' visible' : ''}`}>
                  {labels[id]}
                </span>
                <span className="scroll-nav__dot" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

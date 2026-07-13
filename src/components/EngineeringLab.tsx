import { FlaskConical, Wrench } from 'lucide-react'
import { useRouter } from '../contexts/RouterContext'
import { useNavSection } from '../hooks/useNavSection'

const EXPERIMENTS = [
  { id: 'speech',      title: 'Speech Visualizer',        subtitle: 'Web Audio API · Whisper · Canvas'             },
  { id: 'drive-score', title: 'Drive Score Simulator',    subtitle: 'WebSocket · FastAPI · Physics Engine'         },
  { id: 'galton',      title: 'Galton Board',             subtitle: 'Probability · Canvas 2D · Binomial Stats'     },
  { id: 'drone',       title: 'Drone PID Controller',     subtitle: 'PID Control · Canvas 2D · WebSocket'          },
  { id: 'reco',        title: 'Recommendation Engine',    subtitle: 'User-Based Recommendations · KNN · TypeScript'   },
  { id: 'rag',         title: 'Docs RAG Assistant',       subtitle: 'RAG · ChromaDB · BM25 · Cross-Encoder · Groq'    },
]

const UI_TOOLKIT = [
  { demo: 'dataviz',   tab: 'charts',    title: 'Bar & Line Charts',   subtitle: 'D3.js · Keyboard Nav · WCAG AA'      },
  { demo: 'dataviz',   tab: 'drilldown', title: 'Drill-Down Chart',    subtitle: 'D3.js · ARIA Live · Breadcrumb'      },
  { demo: 'dataviz',   tab: 'pivot',     title: 'Pivot Table',         subtitle: 'D3.js · ARIA Grid · Sortable'        },
  { demo: 'dataviz',   tab: 'donut',     title: 'Donut Chart',         subtitle: 'D3.js · ARIA Labels · Arc Tween'     },
  { demo: 'dashboard', tab: null,        title: 'Dashboard Builder',   subtitle: 'React Grid · Keyboard · Drag & Resize'},
]

export default function EngineeringLab() {
  const { navigate } = useRouter()
  const navRef = useNavSection<HTMLElement>('lab')

  return (
    <section id="lab" ref={navRef} aria-label="Engineering Lab" style={{ padding: '80px 0' }}>
      <div className="container">

        {/* ── Experiments ─────────────────────────────────────────────── */}
        <div className="section__header" style={{ marginBottom: 0 }}>
          <span className="section__label">
            <FlaskConical size={14} aria-hidden="true" />
            Lab
          </span>
          <h2 className="section__title"><span>Experiments</span></h2>
          <p className="demo-section-title">
            Full-stack demos: React frontends communicating over WebSockets to Python/FastAPI backends.
          </p>
        </div>

        <div className="editorial-list" style={{ marginBottom: 72 }}>
          {EXPERIMENTS.map((demo, idx) => (
            <div
              key={demo.id}
              className="editorial-row"
              onClick={() => navigate(`/lab/${demo.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(`/lab/${demo.id}`)}
              aria-label={`Open ${demo.title}`}
            >
              <span className="editorial-row__num">0{idx + 1}</span>
              <div>
                <div className="editorial-row__tech">{demo.subtitle}</div>
                <div className="editorial-row__title">{demo.title}</div>
              </div>
              <span className="editorial-row__arrow">→</span>
            </div>
          ))}
        </div>

        {/* ── UI Toolkit ──────────────────────────────────────────────── */}
        <div className="section__header" style={{ marginBottom: 0 }}>
          <span className="section__label">
            <Wrench size={14} aria-hidden="true" />
            UI Toolkit
          </span>
          <h2 className="section__title"><span>Components</span></h2>
          <p className="demo-section-title">
            Reusable chart and layout primitives — keyboard navigable, ARIA-compliant, built to drop into any internal app without accessibility work left to the consumer.
          </p>
        </div>

        <div className="editorial-list">
          {UI_TOOLKIT.map((item, idx) => {
            const url = item.tab
              ? `/components?demo=${item.demo}&tab=${item.tab}`
              : `/components?demo=${item.demo}`
            return (
              <div
                key={`${item.demo}-${item.tab ?? 'default'}`}
                className="editorial-row"
                onClick={() => navigate(url)}
                role="button"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(url)}
                aria-label={`Open ${item.title}`}
              >
                <span className="editorial-row__num">0{idx + 1}</span>
                <div>
                  <div className="editorial-row__tech">{item.subtitle}</div>
                  <div className="editorial-row__title">{item.title}</div>
                </div>
                <span className="editorial-row__arrow">→</span>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}

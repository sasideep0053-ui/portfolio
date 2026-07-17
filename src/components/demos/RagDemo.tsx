import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'
import { devLog } from '../../lib/devLog'
import { API_HTTP_BASE } from '../../lib/apiConfig'

// ── Types ─────────────────────────────────────────────────────────────────────
type DocSource = 'react' | 'typescript' | 'vite' | 'fastapi'
type StepState = 'idle' | 'active' | 'done' | 'skip'

interface PipelineStep {
  phase:      string
  label:      string
  msg:        string
  detail:     string
  state:      StepState
  startedAt?: number
  duration?:  number
}

interface Message {
  role:       'user' | 'assistant'
  text:       string
  streaming?: boolean
  sources?:   string[]
  confidence?: number | null
  steps?:     PipelineStep[]
}

const INITIAL_STEPS = (): PipelineStep[] => [
  { phase: 'embed',    label: 'Embed',         msg: '', detail: '', state: 'idle' },
  { phase: 'vector',   label: 'Vector Search', msg: '', detail: '', state: 'idle' },
  { phase: 'bm25',     label: 'BM25 Keyword',  msg: '', detail: '', state: 'idle' },
  { phase: 'rrf',      label: 'RRF Merge',     msg: '', detail: '', state: 'idle' },
  { phase: 'rerank',   label: 'Voyage Rerank', msg: '', detail: '', state: 'idle' },
  { phase: 'filter',   label: 'Filter',        msg: '', detail: '', state: 'idle' },
  { phase: 'generate', label: 'Groq LLM',      msg: '', detail: '', state: 'idle' },
]

// ── Doc sources ───────────────────────────────────────────────────────────────
const DOC_LABELS: Record<DocSource, string> = {
  react: 'React', typescript: 'TypeScript', vite: 'Vite', fastapi: 'FastAPI',
}

const PRESETS: Record<DocSource, string[]> = {
  react: [
    'What is useEffect and when should I use it?',
    'Difference between useMemo and useCallback?',
    'How does the Context API work?',
    'When should I use useRef?',
    'How does React re-rendering work?',
    'What is the difference between controlled and uncontrolled components?',
  ],
  typescript: [
    'What are generics and why use them?',
    'Difference between type and interface?',
    'How does type narrowing work?',
    'What are utility types like Partial and Pick?',
    'How do conditional types work?',
    'What is the keyof operator?',
  ],
  vite: [
    'How do I configure environment variables?',
    'How does HMR work in Vite?',
    'How do I set up a proxy for the dev server?',
    'What is the difference between build modes?',
    'How do I configure the build output directory?',
    'How do I import assets in Vite?',
  ],
  fastapi: [
    'How do I create a streaming response?',
    'How do I add CORS middleware?',
    'How do dependency injection and Depends work?',
    'How do I define request and response models with Pydantic?',
    'How do I add authentication with OAuth2?',
    'How do background tasks work?',
  ],
}

const WELCOME: Record<DocSource, string> = {
  react:      'Ask anything about React hooks, components, state management, or the React API.',
  typescript: 'Ask anything about TypeScript types, generics, narrowing, or utility types.',
  vite:       'Ask anything about Vite config, HMR, plugins, environment variables, or build options.',
  fastapi:    'Ask anything about FastAPI routing, Pydantic models, dependency injection, or middleware.',
}

// ── Confidence badge with tooltip ────────────────────────────────────────────
function ConfBadge({ score }: { score: number }) {
  const [tip, setTip] = useState(false)
  const pct = Math.round(score * 100)
  const [label, color] =
    score >= 0.8  ? ['High',   '#22c55e'] :
    score >= 0.5  ? ['Medium', '#ca8a04'] :
                    ['Low',    '#dc2626']
  const explain =
    score >= 0.8
      ? 'The Voyage AI reranker is highly confident the retrieved chunks directly answer this question.'
      : score >= 0.5
      ? 'The Voyage AI reranker found relevant chunks but some may be tangentially related. The answer may be incomplete.'
      : 'Few chunks scored above the relevance threshold. The answer is based on weak evidence — treat it carefully.'
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        style={{
          fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700,
          padding: '0.125rem 0.375rem', borderRadius: 99, letterSpacing: '0.05em',
          background: `${color}22`, color, border: `1px solid ${color}44`,
          cursor: 'help',
        }}
      >
        {label} · {pct}%
      </span>
      {tip && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 99,
          background: 'var(--card)', border: `1px solid ${color}44`, borderRadius: '0.5rem',
          padding: '0.5rem 0.625rem', fontSize: '0.625rem', color: 'var(--text-2)',
          lineHeight: 1.6, width: '15rem', pointerEvents: 'none',
          boxShadow: `0 0.5rem 1.5rem rgba(0,0,0,0.4)`,
        }}>
          <strong style={{ color, display: 'block', marginBottom: '0.25rem' }}>
            What does {pct}% mean?
          </strong>
          {explain}
          <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-3)', fontSize: '0.625rem' }}>
            Score = Voyage AI rerank-2.5-lite relevance score for the best retrieved chunk against the question.
            High ≥ 80% · Medium ≥ 50% · Low below that.
          </span>
        </span>
      )}
    </span>
  )
}

// ── Stage icons ───────────────────────────────────────────────────────────────
const STAGE_ICON: Record<string, string> = {
  embed: '⬡', vector: '⊙', bm25: '≡', rrf: '⊕', rerank: '⊗', filter: '◈', generate: '✦',
}

// ── Mini confidence bars (Voyage rerank) ────────────────────────────────────
function ConfBars({ detail, msg, accent }: { detail: string; msg: string; accent: string }) {
  const all     = [...detail.matchAll(/(\S+)\s+(0\.\d+)/g)]
  const matches = all.slice(0, 4)
  if (!matches.length) return null
  const max   = parseFloat(matches[0][2])
  const total = parseInt(msg.match(/for (\d+) chunks/)?.[1] ?? '0')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.3125rem' }}>
      {matches.map(([, name, score]) => {
        const val  = parseFloat(score)
        const pct  = val / Math.max(max, 0.01)
        const barColor   = accent
        const scoreColor = accent
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-3)',
              width: '7.5rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
            <div style={{ flex: '0 1 5rem', height: '0.25rem', borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, background: barColor, borderRadius: 99,
                transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: scoreColor, flexShrink: 0, fontWeight: 700 }}>
              {score}
            </span>
          </div>
        )
      })}
      {total > matches.length && (
        <div style={{ fontSize: '0.5625rem', fontFamily: 'monospace', color: 'var(--text-3)', marginTop: '0.125rem' }}>
          top {matches.length} of {total} scored chunks shown
        </div>
      )}
    </div>
  )
}

// ── Filter ratio bar ──────────────────────────────────────────────────────────
function FilterBar({ msg, detail, accent }: { msg: string; detail: string; accent: string }) {
  const combined = `${msg} ${detail}`
  const kept    = combined.match(/filtered to (\d+)|(\d+) chunks above/i)?.[1] ?? combined.match(/(\d+) chunk/i)?.[1]
  const dropped = combined.match(/dropped:?\s*(\d+)|drop[a-z]*\s+(\d+)/i)?.[1]
  const conf    = combined.match(/best confidence:?\s*([\d.]+)/i)?.[1]
  if (!kept && !dropped) return null
  const keptN = parseInt(kept ?? '0')
  const dropN = parseInt(dropped ?? '0')
  const total = keptN + dropN
  return (
    <div style={{ marginTop: '0.3125rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
        <div style={{ flex: 1, height: '0.3125rem', borderRadius: 99, background: 'var(--border)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ height: '100%', width: `${(keptN / Math.max(total, 1)) * 100}%`,
            background: keptN > 0 ? accent : 'var(--border-mid)', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', flexShrink: 0 }}>
          <span style={{ color: keptN > 0 ? accent : 'var(--text-3)', fontWeight: keptN > 0 ? 700 : 400 }}>{keptN} kept</span>
          <span style={{ color: 'var(--text-3)' }}> · {dropN} dropped</span>
        </span>
      </div>
      {conf && (
        <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-3)' }}>
          best: <span style={{ color: accent, fontWeight: 700 }}>{conf}</span>
        </div>
      )}
    </div>
  )
}

// ── Animated connector ────────────────────────────────────────────────────────
function Connector({ active, accent }: { active: boolean; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', height: '0.875rem', alignItems: 'center' }}>
      <div style={{ width: 1, height: '100%', background: active ? accent : 'var(--border)',
        opacity: active ? 0.6 : 0.3, transition: 'background 0.3s' }} />
    </div>
  )
}

// ── Single stage card ─────────────────────────────────────────────────────────
function StageCard({ step, accent, half = false, compact = false }: {
  step: PipelineStep; accent: string; half?: boolean; compact?: boolean
}) {
  const active = step.state === 'active'
  const done   = step.state === 'done'
  const idle   = step.state === 'idle'
  const icon   = STAGE_ICON[step.phase] ?? '○'

  const borderColor = active ? accent : done ? `${accent}66` : 'var(--border)'
  const bg          = active ? `${accent}0c` : done ? `${accent}06` : 'transparent'

  return (
    <div style={{
      flex: half ? 1 : undefined,
      minWidth: 0, overflow: 'hidden',
      border: `1px solid ${borderColor}`,
      borderRadius: '0.5rem',
      background: bg,
      padding: '0.375rem 0.5rem',
      opacity: idle ? 0.4 : 1,
      transition: 'all 0.25s ease',
      boxShadow: active ? `0 0 0.75rem ${accent}22, inset 0 0 1rem ${accent}08` : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem', minWidth: 0 }}>
        <span style={{
          fontSize: '0.625rem',
          color: active ? accent : done ? `${accent}99` : 'var(--border-mid)',
          animation: active ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
          transition: 'color 0.3s', lineHeight: 1, flexShrink: 0,
        }}>{icon}</span>
        <span style={{
          fontSize: half ? '0.625rem' : '0.6875rem', fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: half ? '0.03em' : '0.08em', textTransform: 'uppercase',
          color: active ? accent : done ? 'var(--text)' : 'var(--text-3)',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.3s',
        }}>{step.label}</span>
        {active && <span style={{ fontSize: '0.625rem', color: accent,
          animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }}>⟳</span>}
        {done && step.duration != null && (
          <span style={{
            fontSize: '0.625rem', fontFamily: 'monospace', letterSpacing: 0, flexShrink: 0,
            color: 'var(--text-3)',
          }}>
            {step.duration < 1000
              ? `${Math.round(step.duration)}ms`
              : `${(step.duration / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Detail / metric visualizations */}
      {!compact && done && step.detail && (!half || step.detail.length <= 40) && (
        <>
          {step.phase === 'rerank' ? (
            <ConfBars detail={step.detail} msg={step.msg} accent={accent} />
          ) : step.phase === 'filter' ? (
            <FilterBar msg={step.msg} detail={step.detail} accent={accent} />
          ) : (
            <div style={{
              fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-3)',
              marginTop: '0.25rem', lineHeight: 1.5,
              wordBreak: 'break-word',
            }}>
              {step.detail}
            </div>
          )}
        </>
      )}

      {/* Active state — pulse shimmer line */}
      {active && (
        <div style={{
          height: '0.125rem', marginTop: '0.25rem', borderRadius: 99,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s ease-in-out infinite',
        }} />
      )}
    </div>
  )
}

// ── Pipeline trace panel ──────────────────────────────────────────────────────
function PipelinePanel({ steps, accent }: { steps: PipelineStep[]; accent: string }) {
  const byPhase = Object.fromEntries(steps.map(s => [s.phase, s]))
  const anyActive = steps.some(s => s.state !== 'idle')
  const flowActive = (phase: string) =>
    steps.find(s => s.phase === phase)?.state === 'active' || false

  if (!anyActive) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', padding: '2rem 0', color: 'var(--text-3)',
      }}>
        <svg width="1.75rem" height="1.75rem" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" opacity="0.25">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', textAlign: 'center',
          lineHeight: 1.6, opacity: 0.4 }}>
          Pipeline trace appears<br />when you ask a question
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <StageCard step={byPhase['embed']}  accent={accent} />
      <Connector active={flowActive('vector') || byPhase['vector']?.state === 'done'} accent={accent} />

      {/* Parallel fork — Vector + BM25 */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <StageCard step={byPhase['vector']} accent={accent} half />
        <StageCard step={byPhase['bm25']}   accent={accent} half />
      </div>
      <Connector active={flowActive('rrf') || byPhase['rrf']?.state === 'done'} accent={accent} />

      <StageCard step={byPhase['rrf']}    accent={accent} />
      <Connector active={flowActive('rerank') || byPhase['rerank']?.state === 'done'} accent={accent} />

      <StageCard step={byPhase['rerank']} accent={accent} />
      <Connector active={flowActive('filter') || byPhase['filter']?.state === 'done'} accent={accent} />

      <StageCard step={byPhase['filter']} accent={accent} />
      <Connector active={flowActive('generate') || byPhase['generate']?.state === 'done'} accent={accent} />

      <StageCard step={byPhase['generate']} accent={accent} />
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function AssistantMessage({ msg, accent }: { msg: Message; accent: string }) {
  const [showSteps, setShowSteps] = useState(false)
  const hasDoneSteps = msg.steps && msg.steps.some(s => s.state === 'done')

  return (
    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: '1.75rem', height: '1.75rem', borderRadius: '50%', flexShrink: 0,
        background: `${accent}22`, border: `1px solid ${accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem',
      }}>
        ✦
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Answer text */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border-mid)',
          borderRadius: '0 0.625rem 0.625rem 0.625rem', padding: '0.625rem 0.875rem',
          fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.text}
          {msg.streaming && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: accent, marginLeft: 2, verticalAlign: 'text-bottom',
              animation: 'pulse-dot 0.7s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Footer — sources + confidence + pipeline toggle */}
        {!msg.streaming && (msg.sources?.length || msg.confidence != null || hasDoneSteps) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            gap: '0.375rem', marginTop: '0.375rem', paddingLeft: 2,
          }}>
            {msg.confidence != null && <ConfBadge score={msg.confidence} />}
            {msg.sources?.map(s => (
              <span key={s} style={{
                fontSize: '0.625rem', fontFamily: 'monospace',
                padding: '0.0625rem 0.375rem', borderRadius: '0.25rem',
                background: 'var(--card)', border: '1px solid var(--border-mid)',
                color: 'var(--text-3)',
              }}>
                {s}
              </span>
            ))}
            {hasDoneSteps && (
              <button
                onClick={() => setShowSteps(v => !v)}
                style={{
                  marginLeft: 'auto', fontSize: '0.625rem', fontFamily: 'monospace',
                  fontWeight: 700, letterSpacing: '0.06em',
                  background: 'none', border: '1px solid var(--border)', borderRadius: '0.25rem',
                  padding: '0.0625rem 0.4375rem', cursor: 'pointer', color: 'var(--text-3)',
                }}
              >
                {showSteps ? '▲ pipeline' : '▼ pipeline'}
              </button>
            )}
          </div>
        )}

        {/* Inline pipeline trace (collapsed by default) */}
        {showSteps && msg.steps && (
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem 0.625rem',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '0.5rem',
          }}>
            {msg.steps.filter(s => s.state !== 'idle').map(step => (
              <StageCard key={step.phase} step={step} accent={accent} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── How it works content ──────────────────────────────────────────────────────
const HOW_IT_WORKS = `// ── WHY hybrid chunking? ────────────────────────────────────────────────────
// Docs have three structures that break a single strategy:
//
//   a) Heading-based  → split on ##/### markers (primary)
//      WHY: Headings are author-defined topic boundaries. Keeps "useEffect
//           cleanup" as one unit rather than split across chunks.
//
//   b) Semantic       → embed each sentence, split when cosine sim < 0.75
//      WHY: Long prose sections span multiple sub-topics with no heading.
//           Centroid comparison catches gradual topic drift that pairwise
//           sentence comparison misses.
//
//   c) Character/fixed → 800-char window with 150-char overlap
//      WHY: Tables and bullet lists break sentence embeddings. Overlap
//           ensures no row or bullet is split across two chunks.


// ── WHY HNSW + BM25 instead of just one? ────────────────────────────────────
//   Vector search (HNSW, voyage-4-lite, hosted embeddings):
//   STRENGTH  → "How do I clean up a subscription?" matches
//               "return () => sub.unsubscribe()" — zero keyword overlap
//   WEAKNESS  → "useLayoutEffect" looks similar to "useEffect" in vector
//               space. Specific API names get diluted by semantic proximity.
//
//   BM25 keyword search (Okapi BM25, rank-bm25):
//   STRENGTH  → Exact term matching — "useLayoutEffect" scores highly only
//               in chunks that contain that exact string.
//   WEAKNESS  → "cleanup function" won't match "unsubscribe" or "teardown"
//
//   Reciprocal Rank Fusion — scale-free merge:
//   rrf(chunk) = Σ  1 / (k + rank_i)   k = 45
//   Uses only rank positions, not raw scores. Chunks in BOTH lists rise top.


// ── WHY Voyage AI reranking? ─────────────────────────────────────────────────
// Bi-encoder:   score = cosine(embed(q), embed(chunk))   ← independent
// Reranker:     score = model(question, chunk)           ← joint, hosted API
//   Reads both together — full cross-attention across the boundary rather
//   than comparing two independently-computed vectors.
//   Run only on top-20 from RRF via Voyage's rerank-2.5-lite endpoint.
//
// confidence = relevance_score returned directly by the API   →   0–1 score
// filtered   = chunks[confidence >= 0.30][:6]
// If best chunk < 0.25 → refuse to generate rather than hallucinate.
//
// UI badge on the best chunk's score: High >= 0.80, Medium >= 0.50, else Low.


// ── Groq LLM generation (streamed via SSE) ──────────────────────────────────
// model: llama-3.1-8b-instant  (reuses portfolio GROQ_API_KEY)
// Tokens stream char-by-char as JSON-encoded SSE events so newlines
// don't break the SSE delimiter — the UI typewriter stays in sync.`

// ── Main component ────────────────────────────────────────────────────────────
export default function RagDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [docSource, setDocSource] = useState<DocSource>('react')
  const [histories, setHistories] = useState<Record<DocSource, Message[]>>({
    react: [], typescript: [], vite: [], fastapi: [],
  })
  const messages = histories[docSource]
  const docSourceRef = useRef<DocSource>(docSource)
  useEffect(() => { docSourceRef.current = docSource }, [docSource])

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) =>
    setHistories(prev => {
      const src = docSourceRef.current
      return { ...prev, [src]: typeof updater === 'function' ? updater(prev[src]) : updater }
    })
  const [input,     setInput]     = useState('')
  const [busy,      setBusy]      = useState(false)
  const [steps,     setSteps]     = useState<PipelineStep[]>(INITIAL_STEPS())
  const [showHow,   setShowHow]   = useState(false)
  const [error,     setError]     = useState('')

  const charQueueRef    = useRef<string[]>([])
  const typewriterRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef       = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)
  const stepsSnapshotRef = useRef<PipelineStep[]>([])

  const startTypewriter = useCallback(() => {
    if (typewriterRef.current) return
    typewriterRef.current = setInterval(() => {
      if (!charQueueRef.current.length) return
      const ch = charQueueRef.current.shift()!
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text + ch }
        return copy
      })
    }, 16)
  }, [])

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    typewriterRef.current = null
    charQueueRef.current = []
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  // Reset conversation when doc source changes
  const switchSource = (src: DocSource) => {
    if (busy) return
    setDocSource(src)
    setSteps(INITIAL_STEPS())
    setError('')
    inputRef.current?.focus()
  }

  const updateStep = useCallback((phase: string, msg: string, detail: string) => {
    const now = performance.now()
    setSteps(prev => {
      const order    = prev.map(s => s.phase)
      const incoming = order.indexOf(phase)
      return prev.map((s, i) => {
        if (s.phase === phase) {
          // Second call for same phase = update detail while still active
          if (s.state === 'active') return { ...s, msg, detail }
          return { ...s, state: 'active', msg, detail, startedAt: now }
        }
        if (i < incoming && s.state === 'active') {
          return { ...s, state: 'done', duration: s.startedAt ? now - s.startedAt : undefined }
        }
        return s
      })
    })
  }, [])

  const ask = useCallback(async (q: string) => {
    if (!q.trim() || busy) return
    const question = q.trim()

    setBusy(true)
    setError('')
    const freshSteps = INITIAL_STEPS()
    setSteps(freshSteps)
    stepsSnapshotRef.current = freshSteps
    stopTypewriter()
    devLog('RAG', `query → "${question.slice(0, 48)}"`)

    setMessages(prev => [
      ...prev,
      { role: 'user', text: question },
      { role: 'assistant', text: '', streaming: true },
    ])

    try {
      const res = await fetch(`${API_HTTP_BASE}/api/rag/query/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, doc_source: docSource }),
      })
      if (!res.ok) throw new Error(`Server ${res.status}`)

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let streaming = false
      let finalSources: string[]  = []
      let finalConf: number | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)

          if (payload === '[DONE]') {
            setSteps(prev => {
              const doneAt = performance.now()
              const final = prev.map(s => s.state === 'active'
                ? { ...s, state: 'done' as StepState, duration: s.startedAt ? doneAt - s.startedAt : undefined }
                : s)
              stepsSnapshotRef.current = final
              return final
            })
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  streaming:  false,
                  sources:    finalSources,
                  confidence: finalConf,
                  steps:      stepsSnapshotRef.current,
                }
              }
              return copy
            })
            setBusy(false)
            inputRef.current?.focus()
            continue
          }

          if (payload.startsWith('[STEP]')) {
            try {
              const ev = JSON.parse(payload.slice(6)) as { phase: string; msg: string; detail: string }
              updateStep(ev.phase, ev.msg, ev.detail)
              setSteps(prev => { stepsSnapshotRef.current = prev; return prev })
            } catch { /* ignore */ }
            continue
          }

          if (payload.startsWith('[SOURCES]')) {
            try { finalSources = JSON.parse(payload.slice(9)) } catch { /* ignore */ }
            continue
          }
          if (payload.startsWith('[CONFIDENCE]')) {
            try { finalConf = JSON.parse(payload.slice(12)) } catch { /* ignore */ }
            continue
          }

          try {
            const ch = JSON.parse(payload)
            if (!streaming) { streaming = true; startTypewriter() }
            charQueueRef.current.push(ch)
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Could not reach the backend (${msg})`)
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, streaming: false, text: '⚠ Backend unreachable. Is FastAPI running?' }
        return copy
      })
      setBusy(false)
      stopTypewriter()
    }
  }, [busy, docSource, startTypewriter, stopTypewriter, updateStep])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    ask(input)
    setInput('')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="rag-demo-root" style={{ fontFamily: 'var(--font)', maxWidth: '76rem', '--rag-accent': accent, '--rag-accent-dim': `${accent}18` } as React.CSSProperties}>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.65)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .rag-msg-enter { animation: rag-fade-in 0.2s ease; }
        @keyframes rag-fade-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .rag-card-enter { animation: rag-card-in 0.3s ease both; }
        @keyframes rag-card-in { from{opacity:0;transform:translateY(10px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .rag-suggestion:hover:not(:disabled) { border-color: var(--rag-accent) !important; background: var(--rag-accent-dim) !important; }
        .rag-messages { scrollbar-width: none; -ms-overflow-style: none; }
        .rag-messages::-webkit-scrollbar { display: none; }
        .rag-pipeline { scrollbar-width: none; -ms-overflow-style: none; }
        .rag-pipeline::-webkit-scrollbar { display: none; }
        #rag-input::placeholder { font-size: 0.875rem; color: var(--text-3); opacity: 0.6; }
      `}</style>

      {/* ── Row 1: Demo / How it works — same style as all other experiments ── */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
        {([['Demo', false], ['How it works', true]] as [string, boolean][]).map(([label, isHow]) => (
          <button key={label} onClick={() => setShowHow(isHow)} style={{
            padding: '0.1875rem 0.625rem', borderRadius: '0.4375rem', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.04em',
            background: isHow === showHow ? accent : 'var(--surface)',
            color:      isHow === showHow ? '#000' : 'var(--text-2)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Row 2: doc source tabs — now inside chat column, removed from here ── */}

      {showHow ? (
        /* ── How it works ───────────────────────────────────────────── */
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Hybrid RAG pipeline — vector search + BM25 + Voyage AI reranking
          </p>
          <p>
            Every question runs through a 5-stage pipeline that combines dense semantic search with sparse
            keyword matching, merges the results with Reciprocal Rank Fusion, re-scores them with Voyage
            AI's hosted reranker, then gates generation on
            a minimum confidence threshold. You can see each stage fire live in the pipeline trace
            panel as you ask questions.
          </p>
          <pre className="code-block">{HOW_IT_WORKS}</pre>
          <p className="demo-stack-note">
            Stack: ChromaDB · Voyage AI (voyage-4-lite embeddings, rerank-2.5-lite) · BM25Okapi · Groq llama-3.1-8b-instant · FastAPI SSE · React
          </p>
        </div>
      ) : (
        /* ── Demo ───────────────────────────────────────────────────── */
        <div className="rag-two-col" style={{
          display: 'flex', gap: '0.75rem', alignItems: 'stretch',
          flex: 1, minHeight: 0,
        }}>

          {/* ── Left: chat area ──────────────────────────────────────── */}
          <div className="rag-two-col__main" style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          }}>

            {/* Doc source tabs — centered within chat column */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              borderBottom: '1px solid var(--border)', marginBottom: '0.75rem', flexShrink: 0,
            }}>
              {(['react', 'typescript', 'vite', 'fastapi'] as DocSource[]).map(src => (
                <button key={src} onClick={() => switchSource(src)} style={{
                  padding: '0.25rem 0.875rem 0.4375rem', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${docSource === src ? accent : 'transparent'}`,
                  color: docSource === src ? accent : 'var(--text-3)',
                  marginBottom: -1,
                  transition: 'color 0.15s, border-color 0.15s',
                  letterSpacing: '0.04em',
                }}>
                  {DOC_LABELS[src]}
                </button>
              ))}
            </div>

            {/* Message list */}
            <div className="rag-messages" style={{
              flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
              gap: '1rem', paddingRight: '0.25rem',
            }}>
              {/* Welcome state — icon + suggestion card grid */}
              {messages.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: '1.25rem', padding: '0.5rem 0',
                }}>
                  {/* Icon + title */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%', margin: '0 auto 0.625rem',
                      background: `${accent}18`, border: `1px solid ${accent}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>✦</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {DOC_LABELS[docSource]} Docs Assistant
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', maxWidth: '20rem', lineHeight: 1.6 }}>
                      {WELCOME[docSource]}
                    </div>
                  </div>

                  {/* Suggestion card grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem', width: '100%', maxWidth: '36.25rem',
                  }}>
                    {PRESETS[docSource].map((q, i) => (
                      <button
                        key={q}
                        className="rag-card-enter rag-suggestion"
                        disabled={busy}
                        onClick={() => ask(q)}
                        style={{
                          animationDelay: `${i * 55}ms`,
                          padding: '0.75rem 0.875rem',
                          borderRadius: '0.625rem',
                          border: '1px solid var(--border-mid)',
                          background: 'var(--surface)',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          opacity: busy ? 0.4 : 1,
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <span style={{
                          fontSize: '0.75rem', color: 'var(--text)',
                          lineHeight: 1.5, fontWeight: 500,
                        }}>
                          {q}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i} className="rag-msg-enter">
                  {msg.role === 'user' ? (
                    /* User bubble — right aligned */
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        maxWidth: '75%', background: `${accent}22`,
                        border: `1px solid ${accent}44`,
                        borderRadius: '0.625rem 0.625rem 0 0.625rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage msg={msg} accent={accent} />
                  )}
                </div>
              ))}

              {error && (
                <div style={{
                  fontSize: '0.75rem', color: '#dc2626', padding: '0.5rem 0.625rem',
                  background: '#dc262611', border: '1px solid #dc262633', borderRadius: '0.5rem',
                }}>
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0.625rem 0 0.375rem' }} />

            {/* Follow-up suggestions — only shown after conversation starts, as a text list */}
            {messages.length > 0 && (
              <div style={{ marginBottom: '0.375rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3125rem' }}>
                  {PRESETS[docSource].slice(0, 4).map(q => (
                    <button key={q} onClick={() => ask(q)} disabled={busy} style={{
                      padding: '0.1875rem 0.625rem', borderRadius: 99, cursor: busy ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font)', fontSize: '0.625rem',
                      border: '1px solid var(--border)', background: 'var(--card)',
                      color: 'var(--text-2)', opacity: busy ? 0.35 : 1,
                      whiteSpace: 'nowrap', transition: 'border-color 0.12s',
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSubmit} className="rag-input-form" style={{
              display: 'flex', gap: '0.5rem', alignItems: 'center',
              background: 'var(--surface)', border: `1px solid ${busy ? accent + '55' : 'var(--border-mid)'}`,
              borderRadius: '0.75rem', padding: '0.375rem 0.375rem 0.375rem 0.875rem',
              transition: 'border-color 0.2s',
            }}>
              <label htmlFor="rag-input" className="sr-only">Ask a question</label>
              <input
                id="rag-input"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask about ${DOC_LABELS[docSource]} docs…`}
                disabled={busy}
                autoComplete="off"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: '0.875rem', lineHeight: '1.5rem', height: '1.5rem',
                  color: 'var(--text)', fontFamily: 'var(--font)', caretColor: accent,
                }}
              />
              <button type="submit" disabled={busy || !input.trim()} style={{
                width: '2rem', height: '2rem', borderRadius: '0.5rem', border: 'none',
                background: (busy || !input.trim()) ? 'var(--border)' : accent,
                color: (busy || !input.trim()) ? 'var(--text-3)' : '#000',
                cursor: (busy || !input.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                transition: 'background 0.15s',
              }} aria-label="Send">
                {busy
                  ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  : '↑'}
              </button>
            </form>
          </div>

          {/* ── Right: pipeline trace ────────────────────────────────── */}
          <div className="rag-two-col__sidebar" style={{
            flex: '0 0 22rem', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div className="rag-pipeline" style={{
              background: 'var(--surface)', borderRadius: '0.625rem',
              border: '1px solid var(--border-mid)', padding: '0.625rem 0.75rem',
              flex: 1, overflowY: 'auto',
            }}>
              <div style={{ marginBottom: '0.625rem' }}>
                <span className="demo-card-header">PIPELINE TRACE</span>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: 2 }}>
                  live · each stage updates as it runs
                </div>
              </div>
              <PipelinePanel steps={steps} accent={accent} />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext'
import { API_HTTP_BASE } from '../lib/apiConfig'

const API_URL    = `${API_HTTP_BASE}/api/chat/stream`
const HEALTH_URL = `${API_HTTP_BASE}/health`
const MAX_CHARS  = 400

const SUGGESTED = [
  "What's your strongest technical skill?",
  'Tell me about the Apple analytics platform.',
  'What kind of roles are you looking for?',
  'How do I contact Sasi?',
]

type Msg = { role: 'user' | 'assistant'; content: string }

function ThinkingDots() {
  return (
    <span className="chat-thinking" aria-label="Thinking">
      <span /><span /><span />
    </span>
  )
}

export default function ChatBubble() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('chat_msgs') ?? '[]') } catch { return [] }
  })
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [online,    setOnline]    = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)
  const fabRef    = useRef<HTMLButtonElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  // Persist messages across route changes
  useEffect(() => {
    try { sessionStorage.setItem('chat_msgs', JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => {
    fetch(HEALTH_URL).then(r => { if (r.ok) setOnline(true) }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
    setInput('')
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => fabRef.current?.focus())
  }, [])

  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]')
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [close])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: Msg = { role: 'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error('no body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const { token } = JSON.parse(payload)
            if (token) setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + token }
              return next
            })
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: 'Backend is offline — start the FastAPI server to enable chat.' }
          return next
        })
      }
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming])

  const isEmpty   = messages.length === 0
  const charsLeft = MAX_CHARS - input.length
  const nearLimit = charsLeft <= 50

  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={`chat-panel${open ? ' chat-panel--open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Portfolio assistant"
        aria-modal={open}
        onKeyDown={open ? handlePanelKeyDown : undefined}
      >
        {/* Header */}
        <div className="chat-panel__header">
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>
              Sasi's Assistant
            </div>
            <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', marginTop: 1,
              color: online ? accent : 'var(--text-3)' }}>
              {online ? '● powered by Groq' : '○ backend offline'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEmpty && (
              <button
                onClick={clear}
                aria-label="Clear conversation"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                  fontSize: '0.625rem', fontFamily: 'monospace', letterSpacing: '0.04em',
                  color: 'var(--text-3)', textTransform: 'uppercase',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                clear
              </button>
            )}
            <button className="chat-panel__close" onClick={close} aria-label="Close chat">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-panel__messages">
          {isEmpty ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.55 }}>
                Curious about Sasi's background or projects? Ask anything.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    className="chat-suggestion"
                    onClick={() => send(q)}
                    style={{ '--accent': accent } as React.CSSProperties}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isLast     = i === messages.length - 1
              const isThinking = streaming && isLast && msg.role === 'assistant' && msg.content === ''
              const showCursor = streaming && isLast && msg.role === 'assistant' && msg.content !== ''
              return (
                <div key={`${msg.role}-${i}-${msg.content.slice(0, 12)}`} className={`chat-msg chat-msg--${msg.role}`}>
                  <div
                    className="chat-msg__bubble"
                    style={msg.role === 'user'
                      ? { background: `${accent}1a`, border: `1px solid ${accent}44` }
                      : undefined}
                  >
                    {isThinking ? <ThinkingDots /> : msg.content}
                    {showCursor && <span className="chat-cursor" aria-hidden="true">▋</span>}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-panel__input-row">
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Ask a question…"
              disabled={streaming}
              aria-label="Chat input"
            />
            {nearLimit && (
              <span style={{
                position: 'absolute', right: 6, bottom: 4,
                fontSize: '0.625rem', fontFamily: 'monospace',
                color: charsLeft <= 10 ? '#ef4444' : 'var(--text-3)',
              }}>
                {charsLeft}
              </span>
            )}
          </div>
          <button
            className="chat-send"
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            style={{ background: input.trim() && !streaming ? accent : undefined } as React.CSSProperties}
            aria-label="Send"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      {/* ── Trigger bubble ────────────────────────────────────────────── */}
      <button
        ref={fabRef}
        className="chat-bubble"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close assistant' : 'Ask about Sasi'}
        aria-expanded={open}
        data-tooltip={open ? 'Close chat' : 'Ask Sasi’s AI assistant'}
        style={{
          background: 'var(--surface)',
          border:     `1px solid ${open ? accent : accent + '55'}`,
          color:      accent,
          boxShadow:  'none',
        } as React.CSSProperties}
      >
        {open ? <X size={18} /> : <MessageSquare size={20} />}
      </button>
    </>
  )
}

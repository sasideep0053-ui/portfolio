import { useEffect, useRef, useState } from 'react'
import { devLog } from '../../lib/devLog'

interface Message {
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
}

const PRESETS = [
  'Tell me about your experience',
  'What AI work have you done?',
  'Describe the analytics platform',
  'How do you approach accessibility?',
]

const RESPONSES: Record<string, string> = {
  'Tell me about your experience':
    "I'm a Senior Full-Stack Engineer with 10+ years at Apple, building enterprise analytics platforms that serve 60,000+ global users across Apple and vendor teams. My stack spans React, Redux Toolkit, and TypeScript on the frontend, with Java/Spring Boot APIs powering the backend. I own the full delivery cycle — from UX research and prototyping to production deployment and monitoring.",

  'What AI work have you done?':
    "I developed an AI-powered conversational assistant for a 5,000-user internal pilot at Apple. On the backend, I built a Java middleware layer that streams LLM responses in real time using Server-Sent Events (SSE) — enabling the token-by-token streaming experience you see in tools like ChatGPT. I also hardened it for production: role-based access control (RBAC), CSRF/SQLi prevention, and strict multi-user data isolation.",

  'Describe the analytics platform':
    "The platform is an enterprise analytics suite used by 60,000+ Apple employees and vendor partners globally. A key feature I spearheaded is 'Report Studio' — a drag-and-drop dashboard builder I designed from user interviews and translated into working software. It uses custom D3.js visualizations and AG Grid tables for complex data drill-downs across global operations. I own the design evolution: requirements gathering, prototyping, and mockup ownership from UX foundations.",

  'How do you approach accessibility?':
    "Accessibility is a first-class concern in my UI work, not a retrofit. For every D3.js chart I build, I pair it with a keyboard-navigable, screen-reader-friendly data table — the same data, different modality. I use ARIA live regions for dynamic content, proper heading hierarchy, focusable interactive elements, and validate with VoiceOver and keyboard-only navigation as part of my QA checklist. The toggle you see in the D3 demo above is exactly how I expose this in production.",
}

const FALLBACK =
  "I'd be happy to tell you more about my work! Feel free to ask about my experience at Apple, the AI tools I've built, the analytics platform I maintain, or my approach to UX and accessibility."

function streamText(
  text: string,
  onChar: (partial: string) => void,
  onDone: () => void
) {
  let i = 0
  const tick = () => {
    if (i >= text.length) { onDone(); return }
    // stream a few chars at once to feel natural
    const chunk = Math.random() > 0.7 ? 2 : 1
    i = Math.min(i + chunk, text.length)
    onChar(text.slice(0, i))
    setTimeout(tick, 18 + Math.random() * 16)
  }
  setTimeout(tick, 300)
}

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm Sasideep's portfolio assistant. Ask me about his experience, AI work, or the analytics platform he's built." },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim() || busy) return
    const question = text.trim()
    setInput('')
    setBusy(true)
    devLog('SYSTEM', `user sent message → "${question.slice(0, 48)}${question.length > 48 ? '…' : ''}"`)

    const response = RESPONSES[question] ?? FALLBACK

    setMessages(prev => [
      ...prev,
      { role: 'user', text: question },
      { role: 'assistant', text: '', streaming: true },
    ])

    streamText(
      response,
      partial => {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', text: partial, streaming: true }
          return copy
        })
      },
      () => {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', text: response, streaming: false }
          return copy
        })
        setBusy(false)
        inputRef.current?.focus()
      },
    )
  }

  return (
    <div className="chat-demo">
      <div className="chat-presets" role="group" aria-label="Preset questions">
        {PRESETS.map(q => (
          <button
            key={q}
            className="chat-preset-btn"
            onClick={() => send(q)}
            disabled={busy}
            aria-disabled={busy}
          >
            {q}
          </button>
        ))}
      </div>

      <div
        className="chat-window"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            <span className="chat-msg__avatar" aria-hidden="true">
              {m.role === 'assistant' ? '🤖' : '👤'}
            </span>
            <div className="chat-msg__bubble">
              {m.text}
              {m.streaming && <span className="chat-cursor" aria-hidden="true" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="chat-input-row"
        onSubmit={e => { e.preventDefault(); send(input) }}
        aria-label="Message input"
      >
        <label htmlFor="chat-input" className="sr-only">Type a question</label>
        <input
          id="chat-input"
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={busy}
          aria-disabled={busy}
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={busy || !input.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </form>
    </div>
  )
}

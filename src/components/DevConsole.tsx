import { useEffect, useRef, useState } from 'react'
import { subscribeLogs, type LogEntry } from '../lib/devLog'

export default function DevConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const closeRef   = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    return subscribeLogs(entry =>
      setLogs(prev => [...prev.slice(-80), entry])
    )
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, open])

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="dev-console" role="log" aria-label="System console">
      <div className="dev-console__header">
        <span>SYS://LOG_STREAM</span>
        <div className="dev-console__actions">
          <span className="dev-console__count">{logs.length} events</span>
          <button
            className="dev-console__btn"
            onClick={() => setLogs([])}
            title="Clear logs"
            aria-label="Clear logs"
          >
            CLR
          </button>
          <button
            ref={closeRef}
            className="dev-console__btn dev-console__btn--close"
            onClick={onClose}
            aria-label="Close console"
            data-tooltip="Close console"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="dev-console__body">
        {logs.length === 0 && (
          <span className="dev-console__empty">awaiting events...</span>
        )}
        {logs.map(e => (
          <div key={e.id} className="dev-console__line">
            <span className="dev-console__time">{e.time}</span>
            <span className="dev-console__tag">[{e.tag}]</span>
            <span className="dev-console__msg">{e.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

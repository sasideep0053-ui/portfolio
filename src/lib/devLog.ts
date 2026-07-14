export interface LogEntry {
  id:      number
  time:    string
  tag:     string
  message: string
}

let nextId    = 0
const listeners = new Set<(e: LogEntry) => void>()

export function devLog(tag: string, message: string) {
  const now  = new Date()
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const entry: LogEntry = { id: nextId++, time, tag, message }
  listeners.forEach(fn => fn(entry))
}

export function subscribeLogs(fn: (e: LogEntry) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

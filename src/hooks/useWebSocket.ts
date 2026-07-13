import { useEffect, useRef, useState, useCallback } from 'react'

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function useWebSocket(url: string | null) {
  const [status, setStatus]           = useState<WSStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const wsRef                         = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!url) return
    // Close any existing connection before opening a new one
    if (wsRef.current) {
      wsRef.current.onclose = null  // prevent the onclose from firing setStatus
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen    = () => { setStatus('connected') }
    ws.onclose   = () => { setStatus('disconnected'); wsRef.current = null }
    ws.onerror   = () => { setStatus('error') }
    ws.onmessage = e  => setLastMessage(e.data)
  }, [url])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const send = useCallback((data: string | object) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(typeof data === 'string' ? data : JSON.stringify(data))
  }, [])

  useEffect(() => () => { wsRef.current?.close() }, [])

  return { status, lastMessage, connect, disconnect, send, wsRef }
}
